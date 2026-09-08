
CREATE OR REPLACE FUNCTION public.fee_period_key(_frequency text, _year text, _term text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _frequency
    WHEN 'one_time' THEN 'once'
    WHEN 'annual' THEN _year
    ELSE _year || '-' || _term END
$$;

REVOKE EXECUTE ON FUNCTION public.student_class_id(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.student_billing_profile(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.recalc_invoice(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.preview_student_bill(uuid, text, text, uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.generate_invoices(text, text, uuid, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_optional_selection(uuid, uuid, text, text, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.apply_invoice_adjustment(uuid, text, numeric, numeric, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_student_billing(uuid, text, text) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.student_class_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_billing_profile(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_student_bill(uuid, text, text, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoices(text, text, uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_optional_selection(uuid, uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_invoice_adjustment(uuid, text, numeric, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_billing(uuid, text, text) TO authenticated;
