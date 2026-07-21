
DO $$
DECLARE tbl record;
BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.table_name);
  END LOOP;
END$$;

GRANT SELECT ON public.classes TO anon;
GRANT SELECT ON public.school_info TO anon;
GRANT SELECT ON public.news_articles TO anon;
GRANT SELECT ON public.gallery TO anon;
GRANT SELECT ON public.testimonials TO anon;
GRANT SELECT ON public.website_pages TO anon;
GRANT SELECT ON public.website_sections TO anon;
GRANT SELECT ON public.website_settings TO anon;
GRANT SELECT ON public.academic_calendar TO anon;
GRANT SELECT ON public.admission_sessions TO anon;

GRANT INSERT ON public.admission_documents TO anon;
GRANT INSERT ON public.admission_applications TO anon;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;
