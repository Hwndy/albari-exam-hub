
CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage expense categories" ON public.expense_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  payee text,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  reference text,
  receipt_url text,
  status text NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'manual',
  recorded_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage expenses" ON public.expenses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);

CREATE TABLE public.revenue_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenue_categories TO authenticated;
GRANT ALL ON public.revenue_categories TO service_role;
ALTER TABLE public.revenue_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage revenue categories" ON public.revenue_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.other_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revenue_date date NOT NULL DEFAULT CURRENT_DATE,
  category_id uuid REFERENCES public.revenue_categories(id) ON DELETE SET NULL,
  source text,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  reference text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.other_revenue TO authenticated;
GRANT ALL ON public.other_revenue TO service_role;
ALTER TABLE public.other_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage other revenue" ON public.other_revenue FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_other_revenue_date ON public.other_revenue(revenue_date);

CREATE TABLE public.salary_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'allowance',
  amount numeric NOT NULL DEFAULT 0,
  is_percentage boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_components TO authenticated;
GRANT ALL ON public.salary_components TO service_role;
ALTER TABLE public.salary_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage salary components" ON public.salary_components FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Staff view own salary components" ON public.salary_components FOR SELECT TO authenticated USING (staff_id = auth.uid());
CREATE INDEX idx_salary_components_staff ON public.salary_components(staff_id);

ALTER TABLE public.payroll_periods ADD COLUMN IF NOT EXISTS expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL;
ALTER TABLE public.payroll_periods ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE public.payroll_periods ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE public.payroll_items ADD COLUMN IF NOT EXISTS basic_salary numeric NOT NULL DEFAULT 0;

CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_expense_categories_updated BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_other_revenue_updated BEFORE UPDATE ON public.other_revenue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_revenue_categories_updated BEFORE UPDATE ON public.revenue_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_salary_components_updated BEFORE UPDATE ON public.salary_components FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.expense_categories (name, description) VALUES
  ('Salaries & Wages','Staff payroll'),
  ('Utilities','Electricity, water, internet'),
  ('Maintenance & Repairs','Buildings, equipment'),
  ('Teaching Supplies','Books, stationery, lab materials'),
  ('Transport & Fuel','Buses, fuel, logistics'),
  ('Administrative','Office and general admin costs')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.revenue_categories (name, description) VALUES
  ('Uniforms','Uniform sales'),
  ('Books & Stationery','Book sales'),
  ('Events','Events and excursions'),
  ('Donations','Donations and grants'),
  ('Facility Rental','Hall and facility hire'),
  ('Other','Miscellaneous income')
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_finance_summary(p_start date, p_end date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fees numeric := 0;
  v_other numeric := 0;
  v_exp numeric := 0;
  v_by_month jsonb;
  v_exp_cat jsonb;
  v_rev_cat jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT COALESCE(SUM(amount_paid),0) INTO v_fees
  FROM public.fee_payments
  WHERE status = 'completed'
    AND COALESCE(payment_date::date, created_at::date) BETWEEN p_start AND p_end;

  SELECT COALESCE(SUM(amount),0) INTO v_other
  FROM public.other_revenue WHERE revenue_date BETWEEN p_start AND p_end;

  SELECT COALESCE(SUM(amount),0) INTO v_exp
  FROM public.expenses WHERE status <> 'rejected' AND expense_date BETWEEN p_start AND p_end;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.month), '[]'::jsonb) INTO v_by_month FROM (
    SELECT m.month::text AS month,
      COALESCE((SELECT SUM(amount_paid) FROM public.fee_payments fp WHERE fp.status='completed'
        AND date_trunc('month', COALESCE(fp.payment_date::date, fp.created_at::date)) = m.month),0)
      + COALESCE((SELECT SUM(amount) FROM public.other_revenue orv WHERE date_trunc('month', orv.revenue_date) = m.month),0) AS income,
      COALESCE((SELECT SUM(amount) FROM public.expenses e WHERE e.status <> 'rejected' AND date_trunc('month', e.expense_date) = m.month),0) AS expenses
    FROM (SELECT generate_series(date_trunc('month', p_start), date_trunc('month', p_end), interval '1 month') AS month) m
  ) t;

  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_exp_cat FROM (
    SELECT COALESCE(c.name,'Uncategorised') AS name, SUM(e.amount) AS amount
    FROM public.expenses e LEFT JOIN public.expense_categories c ON c.id = e.category_id
    WHERE e.status <> 'rejected' AND e.expense_date BETWEEN p_start AND p_end
    GROUP BY 1 ORDER BY 2 DESC
  ) t;

  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_rev_cat FROM (
    SELECT COALESCE(c.name,'Uncategorised') AS name, SUM(r.amount) AS amount
    FROM public.other_revenue r LEFT JOIN public.revenue_categories c ON c.id = r.category_id
    WHERE r.revenue_date BETWEEN p_start AND p_end
    GROUP BY 1 ORDER BY 2 DESC
  ) t;

  RETURN jsonb_build_object(
    'fee_income', v_fees,
    'other_income', v_other,
    'total_income', v_fees + v_other,
    'total_expenses', v_exp,
    'surplus', (v_fees + v_other) - v_exp,
    'by_month', v_by_month,
    'expenses_by_category', v_exp_cat,
    'revenue_by_category', v_rev_cat
  );
END;
$$;
