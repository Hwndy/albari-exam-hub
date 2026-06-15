
-- A. Helper to fetch current user's email without exposing auth.users via RLS subqueries
CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.get_user_email() TO authenticated, anon;

-- Rewrite policies that referenced auth.users directly

-- admission_applications
DROP POLICY IF EXISTS "Users can view own applications" ON public.admission_applications;
CREATE POLICY "Users can view own applications"
ON public.admission_applications
FOR SELECT
USING (
  email = public.get_user_email()
  OR (school_id = public.get_user_school_id() AND public.is_admin())
  OR public.is_super_admin()
);

-- admission_interviews
DROP POLICY IF EXISTS "Applicants can view their interviews" ON public.admission_interviews;
CREATE POLICY "Applicants can view their interviews"
ON public.admission_interviews
FOR SELECT
USING (
  application_id IN (
    SELECT id FROM public.admission_applications
    WHERE email = public.get_user_email()
  )
);

-- admission_payments
DROP POLICY IF EXISTS "Applicants can view their payments" ON public.admission_payments;
CREATE POLICY "Applicants can view their payments"
ON public.admission_payments
FOR SELECT
USING (
  application_id IN (
    SELECT id FROM public.admission_applications
    WHERE email = public.get_user_email()
  )
);

-- admission_exam_assignments
DROP POLICY IF EXISTS "Applicants can view their exam assignments" ON public.admission_exam_assignments;
CREATE POLICY "Applicants can view their exam assignments"
ON public.admission_exam_assignments
FOR SELECT
USING (
  application_id IN (
    SELECT id FROM public.admission_applications
    WHERE email = public.get_user_email()
  )
);

-- B. Harden application-number trigger to fire on empty strings too
DROP TRIGGER IF EXISTS set_application_number ON public.admission_applications;
CREATE TRIGGER set_application_number
BEFORE INSERT ON public.admission_applications
FOR EACH ROW
WHEN (NEW.application_number IS NULL OR NEW.application_number = '')
EXECUTE FUNCTION public.generate_application_number();

-- Update submission RPC to insert NULL so trigger always runs
CREATE OR REPLACE FUNCTION public.submit_admission_application(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_school_id uuid;
  v_class_id  uuid;
  v_session_id uuid;
  v_new_id    uuid;
  v_app_no    text;
BEGIN
  v_class_id   := NULLIF(payload->>'applying_for_class_id','')::uuid;
  v_session_id := NULLIF(payload->>'session_id','')::uuid;

  IF v_class_id IS NOT NULL THEN
    SELECT school_id INTO v_school_id FROM public.classes WHERE id = v_class_id;
  END IF;

  IF v_school_id IS NULL AND v_session_id IS NOT NULL THEN
    SELECT school_id INTO v_school_id FROM public.admission_sessions WHERE id = v_session_id;
  END IF;

  IF v_school_id IS NULL THEN
    SELECT school_id INTO v_school_id
    FROM public.admission_sessions
    WHERE status = 'active'
    ORDER BY start_date DESC
    LIMIT 1;
  END IF;

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Unable to determine school for application. Please contact the school.';
  END IF;

  INSERT INTO public.admission_applications (
    application_number, school_id, status,
    first_name, middle_name, last_name,
    date_of_birth, gender, blood_group,
    state_of_origin, lga, nationality, religion,
    email, phone, address,
    previous_school, previous_class, applying_for_class_id,
    parent_guardian_info, medical_conditions, allergies, special_needs
  ) VALUES (
    NULL, v_school_id, 'submitted',
    payload->>'first_name', payload->>'middle_name', payload->>'last_name',
    (payload->>'date_of_birth')::date,
    payload->>'gender', payload->>'blood_group',
    payload->>'state_of_origin', payload->>'lga',
    COALESCE(payload->>'nationality','Nigerian'),
    payload->>'religion',
    payload->>'email', payload->>'phone',
    COALESCE(payload->'address', '{}'::jsonb),
    payload->>'previous_school', payload->>'previous_class',
    v_class_id,
    COALESCE(payload->'parent_guardian_info', '{}'::jsonb),
    payload->>'medical_conditions', payload->>'allergies', payload->>'special_needs'
  )
  RETURNING id, application_number INTO v_new_id, v_app_no;

  RETURN jsonb_build_object(
    'id', v_new_id,
    'application_number', v_app_no,
    'school_id', v_school_id
  );
END;
$function$;

-- C. Backfill blank application numbers
UPDATE public.admission_applications
SET application_number = 'APP' || to_char(now(),'YYYY') || '-' ||
    lpad(nextval('admission_app_seq')::text, 6, '0')
WHERE application_number IS NULL OR application_number = '';
