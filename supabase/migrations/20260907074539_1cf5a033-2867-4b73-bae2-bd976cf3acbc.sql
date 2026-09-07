ALTER TABLE public.payroll_periods DROP CONSTRAINT IF EXISTS payroll_periods_status_check;
ALTER TABLE public.payroll_periods ADD CONSTRAINT payroll_periods_status_check CHECK (status = ANY (ARRAY['draft'::text,'processing'::text,'approved'::text,'paid'::text,'closed'::text]));

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payroll_periods;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payroll_items;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;