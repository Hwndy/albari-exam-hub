
-- Extend fee_structures and fee_payments
ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS term text;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS notes text;

-- Per-student fee summary helper
CREATE OR REPLACE FUNCTION public.get_student_fee_summary(_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_id uuid;
  v_billed numeric := 0;
  v_paid numeric := 0;
  v_next_due date;
  v_next_amt numeric := 0;
BEGIN
  SELECT class_id INTO v_class_id FROM class_assignments WHERE student_id = _student_id LIMIT 1;

  SELECT COALESCE(SUM(amount), 0) INTO v_billed
  FROM fee_structures
  WHERE class_id IS NULL OR class_id = v_class_id;

  SELECT COALESCE(SUM(amount_paid), 0) INTO v_paid
  FROM fee_payments
  WHERE student_id = _student_id AND status = 'completed';

  SELECT fi.due_date, (fi.amount - COALESCE(fi.paid_amount,0))
    INTO v_next_due, v_next_amt
  FROM fee_installments fi
  JOIN fee_installment_plans p ON p.id = fi.plan_id
  WHERE p.student_id = _student_id
    AND fi.status IN ('pending','partial','overdue')
  ORDER BY fi.due_date ASC
  LIMIT 1;

  IF v_next_due IS NULL THEN
    SELECT due_date, amount INTO v_next_due, v_next_amt
    FROM fee_structures
    WHERE (class_id IS NULL OR class_id = v_class_id) AND due_date IS NOT NULL
    ORDER BY due_date ASC LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'billed', v_billed,
    'paid', v_paid,
    'outstanding', GREATEST(0, v_billed - v_paid),
    'next_due_date', v_next_due,
    'next_due_amount', COALESCE(v_next_amt, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_fee_summary(uuid) TO authenticated;
