CREATE OR REPLACE FUNCTION public.get_offer_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', o.id,
    'application_id', o.application_id,
    'acceptance_deadline', o.acceptance_deadline,
    'status', o.status,
    'accepted_at', o.accepted_at,
    'declined_at', o.declined_at,
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
  WHERE o.acceptance_token::text = p_token;

  IF v IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired offer link' USING ERRCODE = 'P0002';
  END IF;
  RETURN v;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_offer_by_token(text) TO anon, authenticated;