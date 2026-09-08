
-- ============ CORE FEE CONFIGURATION ============
CREATE TABLE public.fee_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fee_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.fee_categories TO authenticated;
GRANT ALL ON public.fee_categories TO service_role;
ALTER TABLE public.fee_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_categories_read" ON public.fee_categories FOR SELECT USING (true);
CREATE POLICY "fee_categories_admin" ON public.fee_categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid REFERENCES public.fee_categories(id) ON DELETE SET NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);
GRANT SELECT ON public.fees TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.fees TO authenticated;
GRANT ALL ON public.fees TO service_role;
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fees_read" ON public.fees FOR SELECT USING (true);
CREATE POLICY "fees_admin" ON public.fees FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.fee_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_id uuid NOT NULL REFERENCES public.fees(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  student_type text NOT NULL DEFAULT 'both' CHECK (student_type IN ('new','returning','both')),
  student_category text NOT NULL DEFAULT 'both' CHECK (student_category IN ('day','boarding','both')),
  class_ids uuid[] NOT NULL DEFAULT '{}',
  requirement_type text NOT NULL DEFAULT 'compulsory' CHECK (requirement_type IN ('compulsory','optional')),
  frequency text NOT NULL DEFAULT 'termly' CHECK (frequency IN ('one_time','annual','termly','monthly','custom')),
  terms text[] NOT NULL DEFAULT ARRAY['First','Second','Third'],
  due_date date,
  effective_from date,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fee_rules_year ON public.fee_rules(academic_year, is_active);
GRANT SELECT ON public.fee_rules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.fee_rules TO authenticated;
GRANT ALL ON public.fee_rules TO service_role;
ALTER TABLE public.fee_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_rules_read" ON public.fee_rules FOR SELECT USING (true);
CREATE POLICY "fee_rules_admin" ON public.fee_rules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ INVOICES ============
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

CREATE TABLE public.student_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  term text NOT NULL,
  class_id uuid,
  student_type text NOT NULL DEFAULT 'returning',
  student_category text NOT NULL DEFAULT 'day',
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  balance numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid','cancelled')),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, academic_year, term)
);
CREATE INDEX idx_invoices_student ON public.student_invoices(student_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_invoices TO authenticated;
GRANT ALL ON public.student_invoices TO service_role;
ALTER TABLE public.student_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_admin" ON public.student_invoices FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "invoices_own_read" ON public.student_invoices FOR SELECT TO authenticated
  USING (public.is_my_student_record(student_id) OR public.is_parent_of_student(student_id));

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.student_invoices(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_id uuid REFERENCES public.fees(id) ON DELETE SET NULL,
  fee_rule_id uuid REFERENCES public.fee_rules(id) ON DELETE SET NULL,
  description text NOT NULL,
  requirement_type text NOT NULL DEFAULT 'compulsory',
  period_key text NOT NULL,
  original_amount numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  final_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_invoice_items_dedupe ON public.invoice_items(student_id, fee_id, period_key) WHERE status = 'active';
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_items_admin" ON public.invoice_items FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "invoice_items_own_read" ON public.invoice_items FOR SELECT TO authenticated
  USING (public.is_my_student_record(student_id) OR public.is_parent_of_student(student_id));

CREATE TABLE public.invoice_optional_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_rule_id uuid NOT NULL REFERENCES public.fee_rules(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  term text NOT NULL,
  selected_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, fee_rule_id, academic_year, term)
);
GRANT SELECT, INSERT, DELETE ON public.invoice_optional_selections TO authenticated;
GRANT ALL ON public.invoice_optional_selections TO service_role;
ALTER TABLE public.invoice_optional_selections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "optsel_admin" ON public.invoice_optional_selections FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "optsel_own" ON public.invoice_optional_selections FOR ALL TO authenticated
  USING (public.is_my_student_record(student_id) OR public.is_parent_of_student(student_id))
  WITH CHECK (public.is_my_student_record(student_id) OR public.is_parent_of_student(student_id));

CREATE TABLE public.student_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  source_payment_id uuid,
  invoice_id uuid,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.student_credits TO authenticated;
GRANT ALL ON public.student_credits TO service_role;
ALTER TABLE public.student_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credits_admin" ON public.student_credits FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "credits_own_read" ON public.student_credits FOR SELECT TO authenticated
  USING (public.is_my_student_record(student_id) OR public.is_parent_of_student(student_id));

CREATE TABLE public.invoice_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.student_invoices(id) ON DELETE CASCADE,
  invoice_item_id uuid REFERENCES public.invoice_items(id) ON DELETE CASCADE,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('discount','scholarship','waiver')),
  amount numeric NOT NULL DEFAULT 0,
  percentage numeric,
  reason text NOT NULL,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.invoice_adjustments TO authenticated;
GRANT ALL ON public.invoice_adjustments TO service_role;
ALTER TABLE public.invoice_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adjust_admin" ON public.invoice_adjustments FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "adjust_own_read" ON public.invoice_adjustments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.student_invoices i WHERE i.id = invoice_id
    AND (public.is_my_student_record(i.student_id) OR public.is_parent_of_student(i.student_id))));

ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.student_invoices(id) ON DELETE SET NULL;

-- updated_at triggers
CREATE TRIGGER trg_fee_categories_updated BEFORE UPDATE ON public.fee_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fees_updated BEFORE UPDATE ON public.fees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fee_rules_updated BEFORE UPDATE ON public.fee_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.student_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.student_class_id(_student_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ca.class_id FROM public.class_assignments ca
  WHERE ca.student_id = _student_id
     OR ca.student_id = (SELECT s.user_id FROM public.students s WHERE s.id = _student_id)
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.student_billing_profile(_student_id uuid, _academic_year text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; sess record; v_new boolean := false;
BEGIN
  SELECT * INTO s FROM public.students WHERE id = _student_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO sess FROM public.admission_sessions WHERE academic_year = _academic_year ORDER BY created_at DESC LIMIT 1;
  IF sess.id IS NOT NULL AND s.admission_date IS NOT NULL THEN
    v_new := s.admission_date >= sess.start_date AND (sess.end_date IS NULL OR s.admission_date <= sess.end_date);
  END IF;
  RETURN jsonb_build_object(
    'student_id', s.id,
    'class_id', public.student_class_id(s.id),
    'student_type', CASE WHEN v_new THEN 'new' ELSE 'returning' END,
    'student_category', CASE WHEN COALESCE(s.is_boarder,false) THEN 'boarding' ELSE 'day' END
  );
END; $$;

CREATE OR REPLACE FUNCTION public.fee_period_key(_frequency text, _year text, _term text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _frequency
    WHEN 'one_time' THEN 'once'
    WHEN 'annual' THEN _year
    ELSE _year || '-' || _term END
$$;

-- Recalculate invoice totals from its items, adjustments and payments
CREATE OR REPLACE FUNCTION public.recalc_invoice(_invoice_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sub numeric; v_disc numeric; v_paid numeric; v_total numeric;
BEGIN
  SELECT COALESCE(sum(original_amount),0), COALESCE(sum(discount),0)
    INTO v_sub, v_disc FROM public.invoice_items WHERE invoice_id = _invoice_id AND status = 'active';
  SELECT COALESCE(sum(amount_paid),0) INTO v_paid
    FROM public.fee_payments WHERE invoice_id = _invoice_id AND status = 'completed';
  v_total := GREATEST(v_sub - v_disc, 0);
  UPDATE public.student_invoices SET
    subtotal = v_sub, discount = v_disc, total = v_total, amount_paid = v_paid,
    balance = GREATEST(v_total - v_paid, 0),
    status = CASE WHEN status = 'cancelled' THEN 'cancelled'
                  WHEN v_paid >= v_total AND v_total > 0 THEN 'paid'
                  WHEN v_paid > 0 THEN 'partial' ELSE 'unpaid' END,
    updated_at = now()
  WHERE id = _invoice_id;
END; $$;

CREATE OR REPLACE FUNCTION public.fee_payment_sync_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_over numeric;
BEGIN
  IF TG_OP <> 'DELETE' AND NEW.invoice_id IS NOT NULL THEN
    PERFORM public.recalc_invoice(NEW.invoice_id);
    SELECT amount_paid - total INTO v_over FROM public.student_invoices WHERE id = NEW.invoice_id;
    IF v_over > 0 AND NOT EXISTS (SELECT 1 FROM public.student_credits WHERE source_payment_id = NEW.id) THEN
      INSERT INTO public.student_credits(student_id, amount, source_payment_id, invoice_id, reason)
      VALUES (NEW.student_id, v_over, NEW.id, NEW.invoice_id, 'Overpayment credit');
    END IF;
  END IF;
  IF TG_OP <> 'INSERT' AND OLD.invoice_id IS NOT NULL AND OLD.invoice_id IS DISTINCT FROM COALESCE(NEW.invoice_id, OLD.invoice_id) THEN
    PERFORM public.recalc_invoice(OLD.invoice_id);
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD.invoice_id IS NOT NULL THEN PERFORM public.recalc_invoice(OLD.invoice_id); END IF;
    RETURN OLD;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_fee_payment_invoice
AFTER INSERT OR UPDATE OR DELETE ON public.fee_payments
FOR EACH ROW EXECUTE FUNCTION public.fee_payment_sync_invoice();

-- ============ BILLING ENGINE ============
CREATE OR REPLACE FUNCTION public.preview_student_bill(
  _student_id uuid, _academic_year text, _term text,
  _class_id uuid DEFAULT NULL, _student_type text DEFAULT NULL, _student_category text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE prof jsonb; v_class uuid; v_type text; v_cat text; v_items jsonb; v_opt jsonb;
BEGIN
  IF _student_id IS NOT NULL THEN
    prof := public.student_billing_profile(_student_id, _academic_year);
  END IF;
  v_class := COALESCE(_class_id, (prof->>'class_id')::uuid);
  v_type := COALESCE(_student_type, prof->>'student_type', 'returning');
  v_cat := COALESCE(_student_category, prof->>'student_category', 'day');

  WITH eligible AS (
    SELECT r.*, f.name AS fee_name,
      public.fee_period_key(r.frequency, r.academic_year, _term) AS period_key
    FROM public.fee_rules r JOIN public.fees f ON f.id = r.fee_id
    WHERE r.is_active AND f.is_active
      AND r.academic_year = _academic_year
      AND (r.frequency <> 'termly' OR _term = ANY(r.terms))
      AND (r.frequency = 'termly' OR _term = ANY(r.terms) OR array_length(r.terms,1) IS NULL)
      AND (r.student_type = 'both' OR r.student_type = v_type)
      AND (r.student_category = 'both' OR r.student_category = v_cat)
      AND (COALESCE(array_length(r.class_ids,1),0) = 0 OR v_class = ANY(r.class_ids))
      AND (r.effective_from IS NULL OR r.effective_from <= CURRENT_DATE)
      AND (r.effective_to IS NULL OR r.effective_to >= CURRENT_DATE)
  ), already AS (
    SELECT fee_id, period_key FROM public.invoice_items
    WHERE student_id = _student_id AND status = 'active'
  )
  SELECT
    COALESCE(jsonb_agg(to_jsonb(e) - 'created_by') FILTER (WHERE e.requirement_type = 'compulsory'), '[]'::jsonb),
    COALESCE(jsonb_agg(to_jsonb(e) - 'created_by') FILTER (WHERE e.requirement_type = 'optional'), '[]'::jsonb)
  INTO v_items, v_opt
  FROM eligible e
  WHERE _student_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM already a WHERE a.fee_id = e.fee_id AND a.period_key = e.period_key
  );

  RETURN jsonb_build_object(
    'student_id', _student_id, 'class_id', v_class, 'student_type', v_type,
    'student_category', v_cat, 'academic_year', _academic_year, 'term', _term,
    'compulsory', v_items, 'optional', v_opt,
    'total_compulsory', COALESCE((SELECT sum((x->>'amount')::numeric) FROM jsonb_array_elements(v_items) x), 0)
  );
END; $$;

CREATE OR REPLACE FUNCTION public.generate_invoices(
  _academic_year text, _term text, _class_id uuid DEFAULT NULL, _due_date date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; prof jsonb; inv_id uuid; created int := 0; updated int := 0; lines int := 0; r record; v_new_lines int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised'; END IF;
  FOR s IN SELECT st.id FROM public.students st
           WHERE st.archived_at IS NULL AND COALESCE(st.status,'active') <> 'withdrawn'
             AND (_class_id IS NULL OR public.student_class_id(st.id) = _class_id)
  LOOP
    prof := public.student_billing_profile(s.id, _academic_year);
    v_new_lines := 0;
    SELECT id INTO inv_id FROM public.student_invoices
      WHERE student_id = s.id AND academic_year = _academic_year AND term = _term;

    FOR r IN
      SELECT fr.id AS rule_id, fr.fee_id, fr.amount, fr.requirement_type, fr.due_date,
             f.name AS fee_name,
             public.fee_period_key(fr.frequency, fr.academic_year, _term) AS period_key
      FROM public.fee_rules fr JOIN public.fees f ON f.id = fr.fee_id
      WHERE fr.is_active AND f.is_active AND fr.academic_year = _academic_year
        AND _term = ANY(fr.terms)
        AND (fr.student_type = 'both' OR fr.student_type = prof->>'student_type')
        AND (fr.student_category = 'both' OR fr.student_category = prof->>'student_category')
        AND (COALESCE(array_length(fr.class_ids,1),0) = 0 OR (prof->>'class_id')::uuid = ANY(fr.class_ids))
        AND (fr.effective_from IS NULL OR fr.effective_from <= CURRENT_DATE)
        AND (fr.effective_to IS NULL OR fr.effective_to >= CURRENT_DATE)
        AND (fr.requirement_type = 'compulsory' OR EXISTS (
              SELECT 1 FROM public.invoice_optional_selections o
              WHERE o.student_id = s.id AND o.fee_rule_id = fr.id
                AND o.academic_year = _academic_year AND o.term = _term))
    LOOP
      IF EXISTS (SELECT 1 FROM public.invoice_items ii
                 WHERE ii.student_id = s.id AND ii.fee_id = r.fee_id
                   AND ii.period_key = r.period_key AND ii.status = 'active') THEN
        CONTINUE;
      END IF;
      IF inv_id IS NULL THEN
        INSERT INTO public.student_invoices(invoice_number, student_id, academic_year, term, class_id,
          student_type, student_category, due_date, created_by)
        VALUES ('INV-' || split_part(_academic_year,'/',1) || '-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0'),
          s.id, _academic_year, _term, (prof->>'class_id')::uuid,
          prof->>'student_type', prof->>'student_category', COALESCE(_due_date, r.due_date), auth.uid())
        RETURNING id INTO inv_id;
        created := created + 1;
      END IF;
      INSERT INTO public.invoice_items(invoice_id, student_id, fee_id, fee_rule_id, description,
        requirement_type, period_key, original_amount, final_amount)
      VALUES (inv_id, s.id, r.fee_id, r.rule_id, r.fee_name, r.requirement_type, r.period_key, r.amount, r.amount);
      v_new_lines := v_new_lines + 1;
      lines := lines + 1;
    END LOOP;

    IF inv_id IS NOT NULL AND v_new_lines > 0 THEN
      PERFORM public.recalc_invoice(inv_id);
      updated := updated + 1;
    END IF;
    inv_id := NULL;
  END LOOP;
  RETURN jsonb_build_object('invoices_created', created, 'invoices_touched', updated, 'lines_added', lines);
END; $$;

CREATE OR REPLACE FUNCTION public.set_optional_selection(
  _student_id uuid, _fee_rule_id uuid, _academic_year text, _term text, _selected boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; inv_id uuid; v_key text; prof jsonb;
BEGIN
  IF NOT (public.is_admin() OR public.is_my_student_record(_student_id) OR public.is_parent_of_student(_student_id)) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  SELECT fr.*, f.name AS fee_name INTO r FROM public.fee_rules fr JOIN public.fees f ON f.id = fr.fee_id WHERE fr.id = _fee_rule_id;
  IF NOT FOUND OR r.requirement_type <> 'optional' THEN RAISE EXCEPTION 'Not an optional fee'; END IF;
  v_key := public.fee_period_key(r.frequency, _academic_year, _term);

  IF _selected THEN
    INSERT INTO public.invoice_optional_selections(student_id, fee_rule_id, academic_year, term, selected_by)
    VALUES (_student_id, _fee_rule_id, _academic_year, _term, auth.uid())
    ON CONFLICT DO NOTHING;

    SELECT id INTO inv_id FROM public.student_invoices
      WHERE student_id = _student_id AND academic_year = _academic_year AND term = _term;
    IF inv_id IS NULL THEN
      prof := public.student_billing_profile(_student_id, _academic_year);
      INSERT INTO public.student_invoices(invoice_number, student_id, academic_year, term, class_id,
        student_type, student_category, created_by)
      VALUES ('INV-' || split_part(_academic_year,'/',1) || '-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0'),
        _student_id, _academic_year, _term, (prof->>'class_id')::uuid,
        prof->>'student_type', prof->>'student_category', auth.uid())
      RETURNING id INTO inv_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.invoice_items WHERE student_id = _student_id AND fee_id = r.fee_id AND period_key = v_key AND status = 'active') THEN
      INSERT INTO public.invoice_items(invoice_id, student_id, fee_id, fee_rule_id, description,
        requirement_type, period_key, original_amount, final_amount)
      VALUES (inv_id, _student_id, r.fee_id, r.id, r.fee_name, 'optional', v_key, r.amount, r.amount);
    END IF;
    PERFORM public.recalc_invoice(inv_id);
  ELSE
    DELETE FROM public.invoice_optional_selections
      WHERE student_id = _student_id AND fee_rule_id = _fee_rule_id AND academic_year = _academic_year AND term = _term;
    SELECT ii.invoice_id INTO inv_id FROM public.invoice_items ii
      JOIN public.student_invoices i ON i.id = ii.invoice_id
      WHERE ii.student_id = _student_id AND ii.fee_rule_id = _fee_rule_id AND ii.status = 'active'
        AND i.academic_year = _academic_year AND i.term = _term
      LIMIT 1;
    IF inv_id IS NOT NULL THEN
      IF (SELECT amount_paid FROM public.student_invoices WHERE id = inv_id) > 0 THEN
        RAISE EXCEPTION 'This bill already has payments; ask finance to adjust it';
      END IF;
      DELETE FROM public.invoice_items WHERE invoice_id = inv_id AND fee_rule_id = _fee_rule_id;
      PERFORM public.recalc_invoice(inv_id);
    END IF;
  END IF;
  RETURN jsonb_build_object('ok', true, 'invoice_id', inv_id);
END; $$;

CREATE OR REPLACE FUNCTION public.apply_invoice_adjustment(
  _invoice_item_id uuid, _type text, _amount numeric, _percentage numeric, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it record; v_disc numeric;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT * INTO it FROM public.invoice_items WHERE id = _invoice_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bill line not found'; END IF;
  v_disc := CASE WHEN _type = 'waiver' THEN it.original_amount
                 WHEN _percentage IS NOT NULL THEN round(it.original_amount * _percentage / 100.0, 2)
                 ELSE COALESCE(_amount, 0) END;
  v_disc := LEAST(v_disc, it.original_amount);
  UPDATE public.invoice_items SET discount = v_disc, final_amount = it.original_amount - v_disc WHERE id = it.id;
  INSERT INTO public.invoice_adjustments(invoice_id, invoice_item_id, adjustment_type, amount, percentage, reason, approved_by)
  VALUES (it.invoice_id, it.id, _type, v_disc, _percentage, _reason, auth.uid());
  PERFORM public.recalc_invoice(it.invoice_id);
  RETURN jsonb_build_object('ok', true, 'discount', v_disc);
END; $$;

CREATE OR REPLACE FUNCTION public.get_student_billing(_student_id uuid, _academic_year text DEFAULT NULL, _term text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_year text; v_invoices jsonb; v_credit numeric; v_optional jsonb; prof jsonb;
BEGIN
  IF NOT (public.is_admin() OR public.is_teacher() OR public.is_my_student_record(_student_id) OR public.is_parent_of_student(_student_id)) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  v_year := COALESCE(_academic_year, (SELECT academic_year FROM public.admission_sessions WHERE is_current LIMIT 1));
  prof := public.student_billing_profile(_student_id, v_year);

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'issue_date'), '[]'::jsonb) INTO v_invoices FROM (
    SELECT to_jsonb(i) || jsonb_build_object(
      'items', COALESCE((SELECT jsonb_agg(to_jsonb(ii)) FROM public.invoice_items ii WHERE ii.invoice_id = i.id AND ii.status='active'), '[]'::jsonb),
      'payments', COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM public.fee_payments p WHERE p.invoice_id = i.id), '[]'::jsonb)
    ) AS x
    FROM public.student_invoices i
    WHERE i.student_id = _student_id AND (_academic_year IS NULL OR i.academic_year = v_year)
      AND (_term IS NULL OR i.term = _term)
  ) q;

  SELECT COALESCE(sum(amount),0) INTO v_credit FROM public.student_credits WHERE student_id = _student_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(o)), '[]'::jsonb) INTO v_optional FROM (
    SELECT fr.id AS fee_rule_id, f.name AS fee_name, fr.amount, fr.terms, fr.frequency,
      EXISTS (SELECT 1 FROM public.invoice_optional_selections s
              WHERE s.student_id = _student_id AND s.fee_rule_id = fr.id AND s.academic_year = fr.academic_year
                AND (_term IS NULL OR s.term = _term)) AS selected
    FROM public.fee_rules fr JOIN public.fees f ON f.id = fr.fee_id
    WHERE fr.is_active AND f.is_active AND fr.requirement_type = 'optional' AND fr.academic_year = v_year
      AND (fr.student_type = 'both' OR fr.student_type = prof->>'student_type')
      AND (fr.student_category = 'both' OR fr.student_category = prof->>'student_category')
      AND (COALESCE(array_length(fr.class_ids,1),0) = 0 OR (prof->>'class_id')::uuid = ANY(fr.class_ids))
  ) o;

  RETURN jsonb_build_object('profile', prof, 'academic_year', v_year,
    'invoices', v_invoices, 'credit_balance', v_credit, 'optional_fees', v_optional);
END; $$;

-- ============ MIGRATE EXISTING FEE STRUCTURES ============
INSERT INTO public.fee_categories(name, description) VALUES
  ('Tuition','Tuition charges'), ('Registration','Registration charges'), ('Admission','New student admission'),
  ('Examination','Examination charges'), ('Medical','Medical/health'), ('ICT','ICT charge'),
  ('Transportation','School bus'), ('Boarding','Boarding accommodation'), ('Feeding','Boarding meals'),
  ('Uniform','Uniforms and kit'), ('Books','Textbooks and exercise books'),
  ('Extracurricular','Clubs, sports, activities'), ('Other','School-defined charge')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.fees(name, category_id)
SELECT DISTINCT btrim(fs.fee_type),
  (SELECT c.id FROM public.fee_categories c WHERE c.name =
     CASE
       WHEN upper(fs.fee_type) LIKE '%TUITION%' THEN 'Tuition'
       WHEN upper(fs.fee_type) LIKE '%UNIFORM%' OR upper(fs.fee_type) LIKE '%UNIFROM%' THEN 'Uniform'
       WHEN upper(fs.fee_type) LIKE '%BOOK%' THEN 'Books'
       WHEN upper(fs.fee_type) LIKE '%BOARD%' THEN 'Boarding'
       WHEN upper(fs.fee_type) LIKE '%FEED%' THEN 'Feeding'
       WHEN upper(fs.fee_type) LIKE '%EXAM%' THEN 'Examination'
       WHEN upper(fs.fee_type) LIKE '%REGIST%' THEN 'Registration'
       WHEN upper(fs.fee_type) LIKE '%ADMISS%' OR upper(fs.fee_type) LIKE '%ACCEPT%' THEN 'Admission'
       WHEN upper(fs.fee_type) LIKE '%TRANSPORT%' OR upper(fs.fee_type) LIKE '%BUS%' THEN 'Transportation'
       WHEN upper(fs.fee_type) LIKE '%MEDIC%' THEN 'Medical'
       WHEN upper(fs.fee_type) LIKE '%ICT%' THEN 'ICT'
       ELSE 'Other' END)
FROM public.fee_structures fs
WHERE btrim(COALESCE(fs.fee_type,'')) <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.fee_rules(fee_id, academic_year, amount, student_type, student_category, class_ids,
  requirement_type, frequency, terms, due_date, is_active, notes)
SELECT f.id, COALESCE(fs.academic_year, '2026/2027'), fs.amount, 'both', 'both',
  CASE WHEN fs.class_id IS NULL THEN '{}'::uuid[] ELSE ARRAY[fs.class_id] END,
  CASE WHEN COALESCE(fs.is_mandatory,true) THEN 'compulsory' ELSE 'optional' END,
  'termly', ARRAY[COALESCE(NULLIF(btrim(fs.term),''), 'First')], fs.due_date,
  COALESCE(fs.is_active, true), 'Imported from previous fee list'
FROM public.fee_structures fs
JOIN public.fees f ON f.name = btrim(fs.fee_type);
