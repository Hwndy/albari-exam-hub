CREATE OR REPLACE FUNCTION public.accept_offer_by_token(
  p_acceptance_token text,
  p_decision text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer public.admission_offers%ROWTYPE;
  v_processed_at timestamptz := now();
BEGIN
  IF p_acceptance_token IS NULL OR btrim(p_acceptance_token) = '' THEN
    RETURN jsonb_build_object('error', 'Invalid offer token');
  END IF;

  IF p_decision NOT IN ('accepted', 'declined') THEN
    RETURN jsonb_build_object('error', 'Invalid decision');
  END IF;

  SELECT *
  INTO v_offer
  FROM public.admission_offers
  WHERE acceptance_token = btrim(p_acceptance_token)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid offer link');
  END IF;

  IF v_offer.status IN ('accepted', 'declined') THEN
    RETURN jsonb_build_object(
      'error', format('This offer has already been %s', v_offer.status),
      'status', v_offer.status
    );
  END IF;

  IF v_offer.status NOT IN ('sent', 'pending') THEN
    RETURN jsonb_build_object('error', 'This offer is not available for a decision');
  END IF;

  IF v_offer.acceptance_deadline < current_date THEN
    RETURN jsonb_build_object('error', 'This offer has expired');
  END IF;

  UPDATE public.admission_offers
  SET status = p_decision,
      accepted_at = CASE WHEN p_decision = 'accepted' THEN v_processed_at ELSE NULL END,
      declined_at = CASE WHEN p_decision = 'declined' THEN v_processed_at ELSE NULL END,
      updated_at = v_processed_at
  WHERE id = v_offer.id;

  RETURN jsonb_build_object(
    'success', true,
    'offer_id', v_offer.id,
    'application_id', v_offer.application_id,
    'status', p_decision
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_offer_by_token(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_offer_by_token(text, text) TO service_role;