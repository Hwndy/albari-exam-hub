
-- 1. Fix the upsert-blocking partial index
DROP INDEX IF EXISTS public.gradebook_entries_term_key;
DROP INDEX IF EXISTS public.gradebook_entries_manual_key;
DELETE FROM public.gradebook_entries a
USING public.gradebook_entries b
WHERE a.ctid < b.ctid
  AND a.school_id IS NOT DISTINCT FROM b.school_id
  AND a.student_id IS NOT DISTINCT FROM b.student_id
  AND a.subject_id IS NOT DISTINCT FROM b.subject_id
  AND a.class_id   IS NOT DISTINCT FROM b.class_id
  AND a.session_id IS NOT DISTINCT FROM b.session_id
  AND a.term       IS NOT DISTINCT FROM b.term;
CREATE UNIQUE INDEX gradebook_entries_manual_key
  ON public.gradebook_entries (school_id, student_id, subject_id, class_id, session_id, term);

-- 2. Result automation settings (one row per school)
CREATE TABLE IF NOT EXISTS public.result_automation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL UNIQUE REFERENCES public.schools(id) ON DELETE CASCADE,
  min_promotion_average numeric NOT NULL DEFAULT 40,
  below_max numeric NOT NULL DEFAULT 39,
  average_max numeric NOT NULL DEFAULT 59,
  above_max numeric NOT NULL DEFAULT 74,
  principal_remark_below text NOT NULL DEFAULT 'Below Average. Needs to work much harder next term.',
  principal_remark_average text NOT NULL DEFAULT 'A bit above average. Keep pushing to improve.',
  principal_remark_above text NOT NULL DEFAULT 'Far above average. Well done, keep it up.',
  principal_remark_distinction text NOT NULL DEFAULT 'Distinction. Excellent performance!',
  show_parent_signature boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.result_automation_settings TO authenticated;
GRANT ALL ON public.result_automation_settings TO service_role;
ALTER TABLE public.result_automation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school members read automation settings"
  ON public.result_automation_settings FOR SELECT
  USING (school_id = get_user_school_id() OR is_super_admin());
CREATE POLICY "admins manage automation settings"
  ON public.result_automation_settings FOR ALL
  USING ((school_id = get_user_school_id() AND is_admin()) OR is_super_admin())
  WITH CHECK ((school_id = get_user_school_id() AND is_admin()) OR is_super_admin());

-- 3. Report card publications (which terms are visible to parents)
CREATE TABLE IF NOT EXISTS public.report_card_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.admission_sessions(id) ON DELETE CASCADE,
  term text NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid,
  UNIQUE (school_id, student_id, class_id, session_id, term)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_card_publications TO authenticated;
GRANT ALL ON public.report_card_publications TO service_role;
ALTER TABLE public.report_card_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school members read publications"
  ON public.report_card_publications FOR SELECT
  USING (
    school_id = get_user_school_id()
    OR is_super_admin()
    OR is_parent_of_student(student_id)
  );
CREATE POLICY "admins manage publications"
  ON public.report_card_publications FOR ALL
  USING ((school_id = get_user_school_id() AND is_admin()) OR is_super_admin())
  WITH CHECK ((school_id = get_user_school_id() AND is_admin()) OR is_super_admin());

-- 4. Student archive columns
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_reason text;

-- 5. Staff signature column
ALTER TABLE public.staff_details
  ADD COLUMN IF NOT EXISTS signature_url text;
