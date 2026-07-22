-- Parent-School messaging
CREATE TABLE IF NOT EXISTS public.parent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL,
  student_id uuid,
  sender_role text NOT NULL CHECK (sender_role IN ('parent','admin','teacher')),
  sender_user_id uuid NOT NULL,
  subject text,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_thread ON public.parent_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pm_parent ON public.parent_messages(parent_user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_messages TO authenticated;
GRANT ALL ON public.parent_messages TO service_role;

ALTER TABLE public.parent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents read own messages" ON public.parent_messages
  FOR SELECT TO authenticated USING (parent_user_id = auth.uid() OR public.is_teacher());

CREATE POLICY "Parents send own messages" ON public.parent_messages
  FOR INSERT TO authenticated WITH CHECK (
    (sender_role = 'parent' AND sender_user_id = auth.uid() AND parent_user_id = auth.uid())
    OR (sender_role IN ('admin','teacher') AND public.is_teacher() AND sender_user_id = auth.uid())
  );

CREATE POLICY "Mark read own messages" ON public.parent_messages
  FOR UPDATE TO authenticated USING (parent_user_id = auth.uid() OR public.is_teacher())
  WITH CHECK (parent_user_id = auth.uid() OR public.is_teacher());

CREATE TRIGGER trg_pm_updated BEFORE UPDATE ON public.parent_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_messages;

-- Fees dashboard aggregation RPC
CREATE OR REPLACE FUNCTION public.get_fees_dashboard(p_class_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billed numeric := 0;
  v_collected numeric := 0;
  v_this_month numeric := 0;
  v_overdue int := 0;
  v_by_class jsonb;
  v_by_method jsonb;
  v_timeline jsonb;
  v_debtors jsonb;
  v_month_start date := date_trunc('month', now())::date;
BEGIN
  IF NOT public.is_teacher() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  -- Billed = sum per student of applicable fee_structures
  WITH student_class AS (
    SELECT s.id AS student_id, ca.class_id
    FROM students s LEFT JOIN class_assignments ca ON ca.student_id = s.id
    WHERE (p_class_id IS NULL OR ca.class_id = p_class_id)
  ),
  bills AS (
    SELECT sc.student_id, sc.class_id, COALESCE(SUM(fs.amount),0) AS bill
    FROM student_class sc
    LEFT JOIN fee_structures fs ON (fs.class_id IS NULL OR fs.class_id = sc.class_id)
    GROUP BY sc.student_id, sc.class_id
  ),
  paid AS (
    SELECT student_id, SUM(amount_paid) AS paid
    FROM fee_payments WHERE status = 'completed' GROUP BY student_id
  )
  SELECT COALESCE(SUM(b.bill),0) INTO v_billed FROM bills b;

  SELECT COALESCE(SUM(amount_paid),0) INTO v_collected FROM fee_payments WHERE status='completed';
  SELECT COALESCE(SUM(amount_paid),0) INTO v_this_month FROM fee_payments WHERE status='completed' AND payment_date >= v_month_start;
  SELECT COUNT(*) INTO v_overdue FROM fee_installments WHERE status='overdue';

  -- Collections by class
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_by_class FROM (
    SELECT c.name AS class_name, COALESCE(SUM(fp.amount_paid),0) AS collected
    FROM classes c
    LEFT JOIN class_assignments ca ON ca.class_id = c.id
    LEFT JOIN fee_payments fp ON fp.student_id = ca.student_id AND fp.status='completed'
    GROUP BY c.name ORDER BY collected DESC
  ) t;

  -- By payment method
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_by_method FROM (
    SELECT COALESCE(payment_method,'unknown') AS method, COALESCE(SUM(amount_paid),0) AS total, COUNT(*) AS count
    FROM fee_payments WHERE status='completed' GROUP BY payment_method
  ) t;

  -- Last 30 days timeline
  SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'day')), '[]'::jsonb) INTO v_timeline FROM (
    SELECT to_char(d::date,'YYYY-MM-DD') AS day,
           COALESCE(SUM(fp.amount_paid),0) AS collected
    FROM generate_series((now()-interval '29 days')::date, now()::date, '1 day') d
    LEFT JOIN fee_payments fp ON fp.status='completed' AND fp.payment_date::date = d::date
    GROUP BY d
  ) t;

  -- Top 10 debtors
  WITH student_class AS (
    SELECT s.id AS student_id, ca.class_id, s.admission_number, p.full_name
    FROM students s
    LEFT JOIN class_assignments ca ON ca.student_id = s.id
    LEFT JOIN profiles p ON p.user_id = s.user_id
  ),
  bills AS (
    SELECT sc.student_id, sc.admission_number, sc.full_name,
           COALESCE(SUM(fs.amount),0) AS bill
    FROM student_class sc
    LEFT JOIN fee_structures fs ON (fs.class_id IS NULL OR fs.class_id = sc.class_id)
    GROUP BY sc.student_id, sc.admission_number, sc.full_name
  ),
  paid AS (
    SELECT student_id, COALESCE(SUM(amount_paid),0) AS paid
    FROM fee_payments WHERE status='completed' GROUP BY student_id
  )
  SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'outstanding')::numeric DESC), '[]'::jsonb) INTO v_debtors FROM (
    SELECT b.student_id, b.admission_number, b.full_name,
           b.bill AS billed, COALESCE(p.paid,0) AS paid,
           (b.bill - COALESCE(p.paid,0)) AS outstanding
    FROM bills b LEFT JOIN paid p ON p.student_id = b.student_id
    WHERE (b.bill - COALESCE(p.paid,0)) > 0
    ORDER BY outstanding DESC LIMIT 10
  ) t;

  RETURN jsonb_build_object(
    'billed', v_billed,
    'collected', v_collected,
    'outstanding', GREATEST(0, v_billed - v_collected),
    'collection_rate', CASE WHEN v_billed>0 THEN round((v_collected/v_billed)*100, 1) ELSE 0 END,
    'this_month', v_this_month,
    'overdue', v_overdue,
    'by_class', v_by_class,
    'by_method', v_by_method,
    'timeline', v_timeline,
    'debtors', v_debtors
  );
END; $$;

-- Attendance summary RPC (per class, per date range)
CREATE OR REPLACE FUNCTION public.get_attendance_summary(p_start date, p_end date, p_class_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_rows jsonb;
BEGIN
  IF NOT public.is_teacher() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'full_name')), '[]'::jsonb) INTO v_rows FROM (
    SELECT s.id AS student_id, p.full_name, s.admission_number, c.name AS class_name,
      COUNT(*) FILTER (WHERE sa.status='present') AS present,
      COUNT(*) FILTER (WHERE sa.status='absent') AS absent,
      COUNT(*) FILTER (WHERE sa.status='late') AS late,
      COUNT(*) AS total
    FROM students s
    LEFT JOIN profiles p ON p.user_id = s.user_id
    LEFT JOIN class_assignments ca ON ca.student_id = s.id
    LEFT JOIN classes c ON c.id = ca.class_id
    LEFT JOIN student_attendance sa ON sa.student_id = s.id
    LEFT JOIN attendance_sessions ses ON ses.id = sa.attendance_session_id AND ses.date BETWEEN p_start AND p_end
    WHERE (p_class_id IS NULL OR ca.class_id = p_class_id)
    GROUP BY s.id, p.full_name, s.admission_number, c.name
  ) t;
  RETURN jsonb_build_object('rows', v_rows, 'start', p_start, 'end', p_end);
END; $$;