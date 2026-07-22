
-- 1. HR
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type text NOT NULL CHECK (leave_type IN ('annual','sick','maternity','paternity','casual','unpaid','other')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  approver_id uuid REFERENCES auth.users(id),
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_requests TO authenticated;
GRANT ALL ON public.leave_requests TO service_role;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view own leaves" ON public.leave_requests FOR SELECT TO authenticated USING (staff_id = auth.uid() OR public.is_admin());
CREATE POLICY "Staff insert own leaves" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (staff_id = auth.uid());
CREATE POLICY "Staff update own pending leaves" ON public.leave_requests FOR UPDATE TO authenticated
  USING ((staff_id = auth.uid() AND status = 'pending') OR public.is_admin())
  WITH CHECK ((staff_id = auth.uid() AND status IN ('pending','cancelled')) OR public.is_admin());
CREATE POLICY "Admin delete leaves" ON public.leave_requests FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER trg_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month date NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','processing','paid','closed')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_periods TO authenticated;
GRANT ALL ON public.payroll_periods TO service_role;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage payroll periods" ON public.payroll_periods FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Staff view periods" ON public.payroll_periods FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_payroll_periods_updated_at BEFORE UPDATE ON public.payroll_periods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gross_salary numeric(12,2) NOT NULL DEFAULT 0,
  allowances jsonb NOT NULL DEFAULT '{}'::jsonb,
  deductions jsonb NOT NULL DEFAULT '{}'::jsonb,
  net_pay numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','paid')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_id, staff_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_items TO authenticated;
GRANT ALL ON public.payroll_items TO service_role;
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage payroll items" ON public.payroll_items FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Staff view own payslip" ON public.payroll_items FOR SELECT TO authenticated USING (staff_id = auth.uid() OR public.is_admin());
CREATE TRIGGER trg_payroll_items_updated_at BEFORE UPDATE ON public.payroll_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Transport
CREATE TABLE public.transport_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  driver_name text, driver_phone text, vehicle_reg text,
  capacity int NOT NULL DEFAULT 0,
  monthly_fee numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_routes TO authenticated;
GRANT ALL ON public.transport_routes TO service_role;
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view routes" ON public.transport_routes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage routes" ON public.transport_routes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_transport_routes_updated_at BEFORE UPDATE ON public.transport_routes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.transport_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE,
  name text NOT NULL,
  pickup_time time, dropoff_time time,
  stop_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_stops TO authenticated;
GRANT ALL ON public.transport_stops TO service_role;
ALTER TABLE public.transport_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view stops" ON public.transport_stops FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage stops" ON public.transport_stops FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_transport_stops_updated_at BEFORE UPDATE ON public.transport_stops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.student_transport (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE,
  stop_id uuid REFERENCES public.transport_stops(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  started_on date NOT NULL DEFAULT CURRENT_DATE,
  ended_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, route_id, started_on)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_transport TO authenticated;
GRANT ALL ON public.student_transport TO service_role;
ALTER TABLE public.student_transport ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage student transport" ON public.student_transport FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Student/parent view own transport" ON public.student_transport FOR SELECT TO authenticated USING (
  public.is_admin() OR public.is_teacher() OR public.is_my_student_record(student_id) OR public.is_parent_of_student(student_id)
);
CREATE TRIGGER trg_student_transport_updated_at BEFORE UPDATE ON public.student_transport FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Assets
CREATE TABLE public.asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE, description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_categories TO authenticated;
GRANT ALL ON public.asset_categories TO service_role;
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view asset categories" ON public.asset_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage asset categories" ON public.asset_categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_tag text NOT NULL UNIQUE,
  name text NOT NULL,
  category_id uuid REFERENCES public.asset_categories(id) ON DELETE SET NULL,
  location text,
  condition text NOT NULL DEFAULT 'good' CHECK (condition IN ('new','good','fair','poor','damaged','retired')),
  purchased_on date, cost numeric(12,2),
  assigned_to_staff uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','in_use','maintenance','retired','lost')),
  serial_number text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view assets" ON public.assets FOR SELECT TO authenticated USING (public.is_teacher());
CREATE POLICY "Admin manage assets" ON public.assets FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.asset_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  from_location text, to_location text,
  from_staff uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  to_staff uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  moved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  moved_at timestamptz NOT NULL DEFAULT now(),
  note text
);
GRANT SELECT, INSERT ON public.asset_movements TO authenticated;
GRANT ALL ON public.asset_movements TO service_role;
ALTER TABLE public.asset_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view movements" ON public.asset_movements FOR SELECT TO authenticated USING (public.is_teacher());
CREATE POLICY "Staff log movements" ON public.asset_movements FOR INSERT TO authenticated WITH CHECK (public.is_teacher() AND moved_by = auth.uid());

-- 4. Cafeteria
CREATE TABLE public.meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, description text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('daily','weekly','monthly','termly')),
  days jsonb NOT NULL DEFAULT '["mon","tue","wed","thu","fri"]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plans TO authenticated;
GRANT ALL ON public.meal_plans TO service_role;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view meal plans" ON public.meal_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage meal plans" ON public.meal_plans FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_meal_plans_updated_at BEFORE UPDATE ON public.meal_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.meal_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE RESTRICT,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_subscriptions TO authenticated;
GRANT ALL ON public.meal_subscriptions TO service_role;
ALTER TABLE public.meal_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage meal subs" ON public.meal_subscriptions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Student/parent view own meal sub" ON public.meal_subscriptions FOR SELECT TO authenticated USING (
  public.is_admin() OR public.is_teacher() OR public.is_my_student_record(student_id) OR public.is_parent_of_student(student_id)
);
CREATE TRIGGER trg_meal_subs_updated_at BEFORE UPDATE ON public.meal_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Careers
CREATE TABLE public.job_openings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, department text,
  employment_type text NOT NULL DEFAULT 'full_time' CHECK (employment_type IN ('full_time','part_time','contract','internship','volunteer')),
  location text, description text NOT NULL, requirements text,
  apply_email text NOT NULL, closes_on date,
  is_open boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.job_openings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_openings TO authenticated;
GRANT ALL ON public.job_openings TO service_role;
ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view open jobs" ON public.job_openings FOR SELECT USING (is_open = true OR public.is_admin());
CREATE POLICY "Admin manage jobs" ON public.job_openings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_job_openings_updated_at BEFORE UPDATE ON public.job_openings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Analytics views
CREATE OR REPLACE VIEW public.v_enrolment_by_class AS
  SELECT c.id AS class_id, c.name AS class_name, COUNT(DISTINCT ca.student_id) AS student_count
  FROM public.classes c LEFT JOIN public.class_assignments ca ON ca.class_id = c.id
  GROUP BY c.id, c.name ORDER BY c.name;
GRANT SELECT ON public.v_enrolment_by_class TO authenticated;

CREATE OR REPLACE VIEW public.v_fee_collections_daily AS
  SELECT payment_date::date AS day, COALESCE(SUM(amount_paid),0) AS collected, COUNT(*) AS payments
  FROM public.fee_payments WHERE status = 'completed' AND payment_date IS NOT NULL
  GROUP BY payment_date::date ORDER BY day;
GRANT SELECT ON public.v_fee_collections_daily TO authenticated;

CREATE OR REPLACE VIEW public.v_attendance_trend AS
  SELECT s.date AS day,
    COUNT(*) FILTER (WHERE sa.status='present') AS present,
    COUNT(*) FILTER (WHERE sa.status='absent') AS absent,
    COUNT(*) FILTER (WHERE sa.status='late') AS late,
    COUNT(*) AS total
  FROM public.attendance_sessions s
  LEFT JOIN public.student_attendance sa ON sa.attendance_session_id = s.id
  GROUP BY s.date ORDER BY s.date;
GRANT SELECT ON public.v_attendance_trend TO authenticated;

CREATE OR REPLACE VIEW public.v_admission_funnel AS
  SELECT status::text AS status, COUNT(*) AS count FROM public.admission_applications GROUP BY status;
GRANT SELECT ON public.v_admission_funnel TO authenticated;

CREATE OR REPLACE VIEW public.v_assignment_completion AS
  SELECT a.id AS assignment_id, a.title, a.class_id, c.name AS class_name,
    (SELECT COUNT(*) FROM public.class_assignments ca WHERE ca.class_id = a.class_id) AS total_students,
    COUNT(DISTINCT sub.student_id) AS submitted_count,
    COUNT(DISTINCT sub.student_id) FILTER (WHERE sub.score IS NOT NULL) AS graded_count
  FROM public.assignments a
  LEFT JOIN public.classes c ON c.id = a.class_id
  LEFT JOIN public.assignment_submissions sub ON sub.assignment_id = a.id
  GROUP BY a.id, a.title, a.class_id, c.name;
GRANT SELECT ON public.v_assignment_completion TO authenticated;

-- 7. Analytics KPI RPC
CREATE OR REPLACE FUNCTION public.get_admin_analytics()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total_students int; v_total_staff int; v_active_parents int;
  v_term_revenue numeric := 0; v_outstanding numeric := 0;
  v_attendance_rate numeric := 0; v_apps_total int; v_apps_enrolled int;
  v_enrolment jsonb; v_collections jsonb; v_attendance jsonb; v_funnel jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT COUNT(*) INTO v_total_students FROM public.students WHERE status = 'active' OR status IS NULL;
  SELECT COUNT(*) INTO v_total_staff FROM public.staff_details;
  SELECT COUNT(DISTINCT user_id) INTO v_active_parents FROM public.parents WHERE user_id IS NOT NULL;

  SELECT COALESCE(SUM(amount_paid),0) INTO v_term_revenue
    FROM public.fee_payments WHERE status='completed'
    AND payment_date >= date_trunc('month', now()) - interval '3 months';

  WITH bills AS (
    SELECT s.id AS student_id, ca.class_id,
      (SELECT COALESCE(SUM(amount),0) FROM public.fee_structures fs WHERE fs.class_id IS NULL OR fs.class_id = ca.class_id) AS bill
    FROM public.students s LEFT JOIN public.class_assignments ca ON ca.student_id = s.id
  ),
  paid AS (
    SELECT student_id, COALESCE(SUM(amount_paid),0) AS paid FROM public.fee_payments WHERE status='completed' GROUP BY student_id
  )
  SELECT COALESCE(SUM(GREATEST(0, b.bill - COALESCE(p.paid,0))),0) INTO v_outstanding
    FROM bills b LEFT JOIN paid p ON p.student_id = b.student_id;

  SELECT COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE sa.status='present') / NULLIF(COUNT(*),0),1),0) INTO v_attendance_rate
    FROM public.student_attendance sa
    JOIN public.attendance_sessions s ON s.id = sa.attendance_session_id
    WHERE s.date >= CURRENT_DATE - interval '30 days';

  SELECT COUNT(*) INTO v_apps_total FROM public.admission_applications;
  SELECT COUNT(*) INTO v_apps_enrolled FROM public.admission_applications WHERE status='enrolled';

  SELECT COALESCE(jsonb_agg(t),'[]'::jsonb) INTO v_enrolment FROM public.v_enrolment_by_class t;
  SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'day')),'[]'::jsonb) INTO v_collections FROM (
    SELECT day, collected, payments FROM public.v_fee_collections_daily WHERE day >= CURRENT_DATE - interval '30 days'
  ) t;
  SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'day')),'[]'::jsonb) INTO v_attendance FROM (
    SELECT day, present, absent, late, total FROM public.v_attendance_trend WHERE day >= CURRENT_DATE - interval '30 days'
  ) t;
  SELECT COALESCE(jsonb_agg(t),'[]'::jsonb) INTO v_funnel FROM public.v_admission_funnel t;

  RETURN jsonb_build_object(
    'kpis', jsonb_build_object(
      'students', v_total_students, 'staff', v_total_staff, 'parents', v_active_parents,
      'term_revenue', v_term_revenue, 'outstanding', v_outstanding,
      'attendance_rate', v_attendance_rate,
      'apps_total', v_apps_total, 'apps_enrolled', v_apps_enrolled,
      'conversion_rate', CASE WHEN v_apps_total > 0 THEN ROUND(100.0 * v_apps_enrolled / v_apps_total, 1) ELSE 0 END
    ),
    'enrolment_by_class', v_enrolment,
    'collections_30d', v_collections,
    'attendance_30d', v_attendance,
    'admission_funnel', v_funnel
  );
END $$;
REVOKE ALL ON FUNCTION public.get_admin_analytics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics() TO authenticated, service_role;

-- 8. Global search RPC
CREATE OR REPLACE FUNCTION public.global_search(q text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_students jsonb; v_staff jsonb; v_parents jsonb; v_apps jsonb; v_qq text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  v_qq := '%' || lower(coalesce(q,'')) || '%';
  IF length(coalesce(q,'')) < 2 THEN
    RETURN jsonb_build_object('students','[]'::jsonb,'staff','[]'::jsonb,'parents','[]'::jsonb,'applications','[]'::jsonb);
  END IF;

  SELECT COALESCE(jsonb_agg(t),'[]'::jsonb) INTO v_students FROM (
    SELECT s.id, p.full_name, s.admission_number, c.name AS class_name
    FROM public.students s
    LEFT JOIN public.profiles p ON p.user_id = s.user_id
    LEFT JOIN public.class_assignments ca ON ca.student_id = s.id
    LEFT JOIN public.classes c ON c.id = ca.class_id
    WHERE lower(coalesce(p.full_name,'')) LIKE v_qq OR lower(coalesce(s.admission_number,'')) LIKE v_qq
    LIMIT 10
  ) t;

  SELECT COALESCE(jsonb_agg(t),'[]'::jsonb) INTO v_staff FROM (
    SELECT sd.user_id, p.full_name, sd.employee_id, sd.designation, sd.department
    FROM public.staff_details sd
    LEFT JOIN public.profiles p ON p.user_id = sd.user_id
    WHERE lower(coalesce(p.full_name,'')) LIKE v_qq OR lower(coalesce(sd.employee_id,'')) LIKE v_qq
    LIMIT 10
  ) t;

  SELECT COALESCE(jsonb_agg(t),'[]'::jsonb) INTO v_parents FROM (
    SELECT pa.id, pa.user_id, p.full_name, pa.phone_primary
    FROM public.parents pa
    LEFT JOIN public.profiles p ON p.user_id = pa.user_id
    WHERE lower(coalesce(p.full_name,'')) LIKE v_qq OR lower(coalesce(pa.phone_primary,'')) LIKE v_qq
    LIMIT 10
  ) t;

  SELECT COALESCE(jsonb_agg(t),'[]'::jsonb) INTO v_apps FROM (
    SELECT a.id, a.application_number, a.first_name, a.last_name, a.email, a.status
    FROM public.admission_applications a
    WHERE lower(coalesce(a.application_number,'')) LIKE v_qq
       OR lower(coalesce(a.email,'')) LIKE v_qq
       OR lower(coalesce(a.first_name,'') || ' ' || coalesce(a.last_name,'')) LIKE v_qq
    LIMIT 10
  ) t;

  RETURN jsonb_build_object('students',v_students,'staff',v_staff,'parents',v_parents,'applications',v_apps);
END $$;
REVOKE ALL ON FUNCTION public.global_search(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.global_search(text) TO authenticated, service_role;
