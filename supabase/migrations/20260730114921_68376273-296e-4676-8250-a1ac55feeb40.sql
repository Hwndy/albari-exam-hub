INSERT INTO public.app_settings (setting_key, setting_value)
VALUES
  ('acceptance_fee_amount', to_jsonb(50000)),
  ('acceptance_fee_note', to_jsonb('This acceptance fee will be deducted from your child''s school fees.'::text))
ON CONFLICT (setting_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_offer_by_token(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v jsonb;
  v_note text;
BEGIN
  IF p_token IS NULL OR btrim(p_token) = '' THEN
    RAISE EXCEPTION 'Invalid offer link' USING ERRCODE = 'P0002';
  END IF;

  SELECT (setting_value #>> '{}') INTO v_note
  FROM public.app_settings WHERE setting_key = 'acceptance_fee_note';

  SELECT jsonb_build_object(
    'id', o.id,
    'application_id', o.application_id,
    'acceptance_deadline', o.acceptance_deadline,
    'status', o.status,
    'is_expired', o.acceptance_deadline < current_date,
    'accepted_at', o.accepted_at,
    'declined_at', o.declined_at,
    'acceptance_fee', o.acceptance_fee,
    'acceptance_fee_note', COALESCE(v_note, 'This acceptance fee will be deducted from your child''s school fees.'),
    'application', jsonb_build_object(
      'id', a.id,
      'application_number', a.application_number,
      'first_name', a.first_name,
      'last_name', a.last_name,
      'email', a.email,
      'admitted_to_class_id', a.admitted_to_class_id,
      'class_name', COALESCE(c.name, 'N/A')
    )
  ) INTO v
  FROM public.admission_offers o
  JOIN public.admission_applications a ON a.id = o.application_id
  LEFT JOIN public.classes c ON c.id = a.admitted_to_class_id
  WHERE o.acceptance_token = btrim(p_token);

  IF v IS NULL THEN
    RAISE EXCEPTION 'Invalid offer link' USING ERRCODE = 'P0002';
  END IF;

  RETURN v;
END;
$function$;