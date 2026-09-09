CREATE OR REPLACE FUNCTION public.get_dashboard_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text := public.current_academic_year();
  v_today date := current_date;
  result jsonb;
  v_students jsonb;
  v_attendance jsonb;
  v_finance jsonb;
  v_admissions jsonb;
  v_exams jsonb;
  v_attention jsonb;
  v_activity jsonb;
  v_fee_trend jsonb;
  v_att_trend jsonb;
  v_by_level jsonb;
  v_funnel jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  -- Students
  SELECT jsonb_build_object(
    'total', count(*),
    'male', count(*) FILTER (WHERE lower(coalesce(s.gender,'')) = 'male'),
    'female', count(*) FILTER (WHERE lower(coalesce(s.gender,'')) = 'female'),
    'missing_gender', count(*) FILTER (WHERE s.gender IS NULL OR s.gender = ''),
    'boarding', count(*) FILTER (WHERE s.is_boarder IS TRUE)
  ) INTO v_students
  FROM public.students s
  WHERE coalesce(s.status,'active') = 'active';

  SELECT coalesce(jsonb_agg(x ORDER BY x->>'order'), '[]'::jsonb) INTO v_by_level
  FROM (
    SELECT jsonb_build_object(
      'name', cl.name,
      'order', cl.level_order,
      'male', count(*) FILTER (WHERE lower(coalesce(s.gender,'')) = 'male'),
      'female', count(*) FILTER (WHERE lower(coalesce(s.gender,'')) = 'female')
    ) AS x
    FROM public.student_enrollments e
    JOIN public.class_levels cl ON cl.id = e.class_level_id
    JOIN public.students s ON s.id = e.student_id
    WHERE e.is_current AND coalesce(s.status,'active') = 'active'
    GROUP BY cl.name, cl.level_order
  ) q;

  -- Attendance today
  SELECT jsonb_build_object(
    'marked', count(*),
    'present', count(*) FILTER (WHERE sa.status IN ('present','late')),
    'absent', count(*) FILTER (WHERE sa.status = 'absent')
  ) INTO v_attendance
  FROM public.student_attendance sa
  JOIN public.attendance_sessions ses ON ses.id = sa.attendance_session_id
  WHERE ses.date = v_today;

  SELECT coalesce(jsonb_agg(x ORDER BY x->>'date'), '[]'::jsonb) INTO v_att_trend
  FROM (
    SELECT jsonb_build_object(
      'date', ses.date,
      'rate', round(100.0 * count(*) FILTER (WHERE sa.status IN ('present','late')) / nullif(count(*),0), 1)
    ) AS x
    FROM public.student_attendance sa
    JOIN public.attendance_sessions ses ON ses.id = sa.attendance_session_id
    WHERE ses.date > v_today - INTERVAL '21 days'
    GROUP BY ses.date
    ORDER BY ses.date DESC
    LIMIT 14
  ) q;

  -- Finance
  SELECT jsonb_build_object(
    'billed', coalesce(sum(i.total),0),
    'collected', coalesce(sum(i.amount_paid),0),
    'outstanding', coalesce(sum(i.balance),0),
    'invoices', count(*),
    'overdue', count(*) FILTER (WHERE i.balance > 0 AND i.due_date IS NOT NULL AND i.due_date < v_today)
  ) INTO v_finance
  FROM public.student_invoices i
  WHERE i.academic_year = v_year;

  SELECT coalesce(jsonb_agg(x ORDER BY x->>'month'), '[]'::jsonb) INTO v_fee_trend
  FROM (
    SELECT jsonb_build_object(
      'month', to_char(date_trunc('month', coalesce(p.payment_date, p.created_at::date)), 'YYYY-MM'),
      'label', to_char(date_trunc('month', coalesce(p.payment_date, p.created_at::date)), 'Mon'),
      'amount', sum(p.amount_paid)
    ) AS x
    FROM public.fee_payments p
    WHERE coalesce(p.status,'completed') IN ('completed','success','paid')
      AND coalesce(p.payment_date, p.created_at::date) >= (date_trunc('month', v_today) - INTERVAL '5 months')::date
    GROUP BY 1
  ) q;

  -- Admissions
  SELECT jsonb_build_object(
    'total', count(*),
    'pending', count(*) FILTER (WHERE a.status IN ('submitted','under_review')),
    'accepted', count(*) FILTER (WHERE a.status = 'accepted'),
    'enrolled', count(*) FILTER (WHERE a.status = 'enrolled')
  ) INTO v_admissions
  FROM public.admission_applications a;

  SELECT coalesce(jsonb_agg(jsonb_build_object('status', st, 'count', c)), '[]'::jsonb) INTO v_funnel
  FROM (
    SELECT a.status::text AS st, count(*) AS c
    FROM public.admission_applications a
    GROUP BY a.status
  ) q;

  -- Exams
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM public.exams),
    'published', (SELECT count(*) FROM public.exams WHERE status = 'published'),
    'live_sessions', (SELECT count(*) FROM public.exam_sessions WHERE status = 'in_progress'),
    'teachers', (SELECT count(*) FROM public.user_roles WHERE role = 'teacher'),
    'classes', (SELECT count(*) FROM public.class_levels WHERE coalesce(is_active,true)),
    'subjects', (SELECT count(*) FROM public.subjects)
  ) INTO v_exams;

  -- Needs attention
  SELECT jsonb_build_object(
    'unplaced', (
      SELECT count(*) FROM public.students s
      WHERE coalesce(s.status,'active') = 'active'
        AND NOT EXISTS (SELECT 1 FROM public.student_enrollments e WHERE e.student_id = s.id AND e.is_current)
    ),
    'missing_gender', (v_students->>'missing_gender')::int,
    'applications_pending', (v_admissions->>'pending')::int,
    'documents_pending', (SELECT count(*) FROM public.admission_documents WHERE coalesce(verification_status,'pending') = 'pending'),
    'invoices_overdue', (v_finance->>'overdue')::int,
    'payroll_pending', (SELECT count(*) FROM public.payroll_periods WHERE status IN ('draft','approved'))
  ) INTO v_attention;

  -- Recent activity
  SELECT coalesce(jsonb_agg(x ORDER BY (x->>'at') DESC), '[]'::jsonb) INTO v_activity
  FROM (
    (SELECT jsonb_build_object('kind','application','at', a.created_at,
       'title', concat(a.first_name,' ', a.last_name),
       'detail', concat('Application ', a.application_number)) AS x
     FROM public.admission_applications a ORDER BY a.created_at DESC LIMIT 5)
    UNION ALL
    (SELECT jsonb_build_object('kind','payment','at', p.created_at,
       'title', concat('Payment ', to_char(p.amount_paid, 'FM999,999,999')),
       'detail', coalesce(p.payment_method,'payment')) AS x
     FROM public.fee_payments p
     WHERE coalesce(p.status,'completed') IN ('completed','success','paid')
     ORDER BY p.created_at DESC LIMIT 5)
    UNION ALL
    (SELECT jsonb_build_object('kind','exam','at', e.created_at,
       'title', e.title, 'detail', e.status::text) AS x
     FROM public.exams e ORDER BY e.created_at DESC LIMIT 5)
  ) q;

  result := jsonb_build_object(
    'academic_year', v_year,
    'generated_at', now(),
    'students', v_students,
    'students_by_level', v_by_level,
    'attendance', v_attendance,
    'attendance_trend', v_att_trend,
    'finance', v_finance,
    'fee_trend', v_fee_trend,
    'admissions', v_admissions,
    'admission_funnel', v_funnel,
    'exams', v_exams,
    'attention', v_attention,
    'activity', (SELECT coalesce(jsonb_agg(v), '[]'::jsonb) FROM (SELECT v FROM jsonb_array_elements(v_activity) v LIMIT 8) t)
  );

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_overview() TO authenticated;