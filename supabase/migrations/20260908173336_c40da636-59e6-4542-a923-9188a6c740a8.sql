CREATE OR REPLACE FUNCTION public.submit_admission_application(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_class_id uuid; v_new_id uuid; v_app_no text;
BEGIN
  v_class_id := NULLIF(payload->>'applying_for_class_id','')::uuid;
  INSERT INTO public.admission_applications (
    application_number, status, first_name, middle_name, last_name,
    date_of_birth, gender, blood_group, state_of_origin, lga, nationality, religion,
    email, phone, address, previous_school, previous_class, applying_for_class_id,
    parent_guardian_info, medical_conditions, allergies, special_needs, boarding_interest, nin
  ) VALUES (
    NULL, 'submitted', payload->>'first_name', payload->>'middle_name', payload->>'last_name',
    (payload->>'date_of_birth')::date, payload->>'gender', payload->>'blood_group',
    payload->>'state_of_origin', payload->>'lga', COALESCE(payload->>'nationality','Nigerian'),
    payload->>'religion', payload->>'email', payload->>'phone',
    COALESCE(payload->'address','{}'::jsonb), payload->>'previous_school', payload->>'previous_class',
    v_class_id, COALESCE(payload->'parent_guardian_info','{}'::jsonb),
    payload->>'medical_conditions', payload->>'allergies', payload->>'special_needs',
    COALESCE((payload->>'boarding_interest')::boolean, false),
    NULLIF(btrim(COALESCE(payload->>'nin','')), '')
  ) RETURNING id, application_number INTO v_new_id, v_app_no;
  RETURN jsonb_build_object('id', v_new_id, 'application_number', v_app_no);
END $function$;