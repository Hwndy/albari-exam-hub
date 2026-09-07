ALTER TABLE public.students REPLICA IDENTITY FULL;
ALTER TABLE public.class_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.fee_payments REPLICA IDENTITY FULL;
ALTER TABLE public.hostel_allocations REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='students') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='class_assignments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.class_assignments;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='fee_payments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fee_payments;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='hostel_allocations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hostel_allocations;
  END IF;
END $$;