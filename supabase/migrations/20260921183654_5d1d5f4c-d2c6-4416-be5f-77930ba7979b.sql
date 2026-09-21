ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_name text,
  ADD COLUMN IF NOT EXISTS actor_role text,
  ADD COLUMN IF NOT EXISTS domain text;

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_role ON public.audit_logs (actor_role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_domain ON public.audit_logs (domain, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_name ON public.audit_logs (actor_name, created_at DESC);

CREATE OR REPLACE FUNCTION public.redact_audit_json(p_payload jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_object_agg(entry.key, entry.value), '{}'::jsonb)
  FROM jsonb_each(COALESCE(p_payload, '{}'::jsonb)) AS entry(key, value)
  WHERE lower(entry.key) NOT IN (
    'password', 'password_hash', 'passwordhash', 'access_token', 'refresh_token',
    'token', 'otp', 'otp_code', 'reset_token', 'secret', 'api_key', 'service_role_key',
    'nin', 'national_identification_number', 'verification_token'
  );
$$;

CREATE OR REPLACE FUNCTION public.audit_sensitive_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text;
  v_name text;
  v_role text;
  v_row_id text;
  v_before jsonb;
  v_after jsonb;
  v_domain text;
BEGIN
  IF v_actor IS NOT NULL THEN
    SELECT au.email::text INTO v_email FROM auth.users au WHERE au.id = v_actor;
    SELECT p.full_name INTO v_name FROM public.profiles p WHERE p.user_id = v_actor LIMIT 1;
    SELECT ur.role::text INTO v_role
    FROM public.user_roles ur
    WHERE ur.user_id = v_actor
    ORDER BY CASE ur.role::text WHEN 'admin' THEN 1 WHEN 'teacher' THEN 2 WHEN 'parent' THEN 3 ELSE 4 END
    LIMIT 1;
  END IF;

  v_before := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN public.redact_audit_json(to_jsonb(OLD)) ELSE NULL END;
  v_after := CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN public.redact_audit_json(to_jsonb(NEW)) ELSE NULL END;
  v_row_id := COALESCE(v_after ->> 'id', v_before ->> 'id', '');

  v_domain := CASE TG_TABLE_NAME
    WHEN 'admission_applications' THEN 'admissions'
    WHEN 'admission_documents' THEN 'admissions'
    WHEN 'admission_interviews' THEN 'admissions'
    WHEN 'admission_offers' THEN 'admissions'
    WHEN 'admission_payments' THEN 'payments'
    WHEN 'admission_sessions' THEN 'admissions'
    WHEN 'admission_workflow_logs' THEN 'admissions'
    WHEN 'fee_payments' THEN 'payments'
    WHEN 'student_invoices' THEN 'payments'
    WHEN 'invoice_adjustments' THEN 'payments'
    WHEN 'invoice_items' THEN 'payments'
    WHEN 'invoice_optional_selections' THEN 'payments'
    WHEN 'grades' THEN 'results'
    WHEN 'gradebook_entries' THEN 'results'
    WHEN 'assessment_types' THEN 'results'
    WHEN 'report_card_publications' THEN 'results'
    WHEN 'promotion_history' THEN 'results'
    WHEN 'student_attendance' THEN 'attendance'
    WHEN 'attendance_sessions' THEN 'attendance'
    WHEN 'staff_attendance' THEN 'attendance'
    WHEN 'student_movement_log' THEN 'attendance'
    WHEN 'student_qr_tokens' THEN 'attendance'
    WHEN 'visitor_logs' THEN 'attendance'
    WHEN 'class_timetables' THEN 'timetables'
    WHEN 'timetable_templates' THEN 'timetables'
    WHEN 'teacher_class_assignments' THEN 'timetables'
    WHEN 'class_assignments' THEN 'timetables'
    WHEN 'subject_assignments' THEN 'timetables'
    WHEN 'profiles' THEN 'staff_accounts'
    WHEN 'user_roles' THEN 'staff_accounts'
    WHEN 'staff_details' THEN 'staff_accounts'
    ELSE 'system'
  END;

  INSERT INTO public.audit_logs (
    actor_id, actor_email, actor_name, actor_role, action, domain, table_name, row_id,
    before_data, after_data, metadata
  ) VALUES (
    v_actor, v_email, v_name, v_role, lower(TG_OP), v_domain, TG_TABLE_NAME, v_row_id,
    v_before, v_after, jsonb_build_object('source', 'database_trigger')
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'admission_applications','admission_documents','admission_interviews','admission_offers',
    'admission_payments','admission_sessions','admission_workflow_logs',
    'fee_payments','student_invoices','invoice_adjustments','invoice_items','invoice_optional_selections',
    'grades','gradebook_entries','assessment_types','report_card_publications','promotion_history',
    'student_attendance','attendance_sessions','staff_attendance','student_movement_log','student_qr_tokens','visitor_logs',
    'class_timetables','timetable_templates','teacher_class_assignments','class_assignments','subject_assignments',
    'profiles','user_roles','staff_details'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF to_regclass('public.' || v_table) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_audit_' || v_table, v_table);
      EXECUTE format(
        'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_writes()',
        'trg_audit_' || v_table, v_table
      );
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_audit_logs(
  p_search text DEFAULT NULL,
  p_domain text DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  actor_id uuid,
  actor_name text,
  actor_email text,
  actor_role text,
  action text,
  domain text,
  table_name text,
  row_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  p_limit := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
  p_offset := GREATEST(COALESCE(p_offset, 0), 0);

  RETURN QUERY
  WITH filtered AS (
    SELECT al.*
    FROM public.audit_logs al
    WHERE (NULLIF(trim(p_domain), '') IS NULL OR al.domain = lower(trim(p_domain)))
      AND (NULLIF(trim(p_action), '') IS NULL OR al.action = lower(trim(p_action)))
      AND (NULLIF(trim(p_role), '') IS NULL OR al.actor_role = lower(trim(p_role)))
      AND (p_actor_id IS NULL OR al.actor_id = p_actor_id)
      AND (p_from IS NULL OR al.created_at >= p_from)
      AND (p_to IS NULL OR al.created_at < p_to)
      AND (
        NULLIF(trim(p_search), '') IS NULL
        OR concat_ws(' ', al.actor_name, al.actor_email, al.actor_id::text, al.actor_role,
          al.action, al.domain, al.table_name, al.row_id,
          COALESCE(al.before_data, '{}'::jsonb)::text,
          COALESCE(al.after_data, '{}'::jsonb)::text,
          COALESCE(al.metadata, '{}'::jsonb)::text
        ) ILIKE '%' || trim(p_search) || '%'
      )
  )
  SELECT f.id, f.actor_id, f.actor_name, f.actor_email, f.actor_role, f.action, f.domain,
    f.table_name, f.row_id, f.before_data, f.after_data, f.metadata, f.created_at,
    count(*) OVER () AS total_count
  FROM filtered f
  ORDER BY f.created_at DESC, f.id DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_audit_log_actors()
RETURNS TABLE (
  actor_id uuid,
  actor_name text,
  actor_email text,
  actor_role text,
  event_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  RETURN QUERY
  SELECT al.actor_id, max(al.actor_name) AS actor_name, max(al.actor_email) AS actor_email,
    max(al.actor_role) AS actor_role, count(*) AS event_count
  FROM public.audit_logs al
  WHERE al.actor_id IS NOT NULL
  GROUP BY al.actor_id
  ORDER BY lower(COALESCE(max(al.actor_name), max(al.actor_email), al.actor_id::text));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_audit_logs(text, text, text, text, uuid, timestamptz, timestamptz, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_audit_log_actors() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_audit_logs(text, text, text, text, uuid, timestamptz, timestamptz, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_audit_log_actors() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_sensitive_writes() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.redact_audit_json(jsonb) FROM PUBLIC, anon, authenticated, service_role;