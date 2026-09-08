
-- ============ CAMPUSES ============
CREATE TABLE public.campuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  address text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campuses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campuses TO authenticated;
GRANT ALL ON public.campuses TO service_role;
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campuses readable" ON public.campuses FOR SELECT USING (true);
CREATE POLICY "campuses admin write" ON public.campuses FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER campuses_updated BEFORE UPDATE ON public.campuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CLASS LEVELS ============
CREATE TABLE public.class_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  level_order integer NOT NULL DEFAULT 0,
  section text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.class_levels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_levels TO authenticated;
GRANT ALL ON public.class_levels TO service_role;
ALTER TABLE public.class_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "class_levels readable" ON public.class_levels FOR SELECT USING (true);
CREATE POLICY "class_levels admin write" ON public.class_levels FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER class_levels_updated BEFORE UPDATE ON public.class_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CAMPUS CLASS OFFERINGS ============
CREATE TABLE public.campus_class_offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id uuid NOT NULL REFERENCES public.campuses(id) ON DELETE CASCADE,
  class_level_id uuid NOT NULL REFERENCES public.class_levels(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campus_id, class_level_id)
);
GRANT SELECT ON public.campus_class_offerings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campus_class_offerings TO authenticated;
GRANT ALL ON public.campus_class_offerings TO service_role;
ALTER TABLE public.campus_class_offerings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offerings readable" ON public.campus_class_offerings FOR SELECT USING (true);
CREATE POLICY "offerings admin write" ON public.campus_class_offerings FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER offerings_updated BEFORE UPDATE ON public.campus_class_offerings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ARMS ============
CREATE TABLE public.arms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL REFERENCES public.campus_class_offerings(id) ON DELETE CASCADE,
  code text NOT NULL,
  legacy_class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offering_id, code)
);
CREATE UNIQUE INDEX arms_legacy_class_idx ON public.arms(legacy_class_id) WHERE legacy_class_id IS NOT NULL;
GRANT SELECT ON public.arms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.arms TO authenticated;
GRANT ALL ON public.arms TO service_role;
ALTER TABLE public.arms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arms readable" ON public.arms FOR SELECT USING (true);
CREATE POLICY "arms admin write" ON public.arms FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER arms_updated BEFORE UPDATE ON public.arms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STUDENT ENROLLMENTS ============
CREATE TABLE public.student_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year text,
  campus_id uuid REFERENCES public.campuses(id) ON DELETE SET NULL,
  class_level_id uuid REFERENCES public.class_levels(id) ON DELETE SET NULL,
  arm_id uuid REFERENCES public.arms(id) ON DELETE SET NULL,
  legacy_class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  student_type text NOT NULL DEFAULT 'returning',
  boarding text NOT NULL DEFAULT 'day',
  status text NOT NULL DEFAULT 'active',
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX student_enrollments_current_idx ON public.student_enrollments(student_id) WHERE is_current;
CREATE INDEX student_enrollments_lookup_idx ON public.student_enrollments(campus_id, class_level_id, arm_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_enrollments TO authenticated;
GRANT ALL ON public.student_enrollments TO service_role;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enrollments staff read" ON public.student_enrollments FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_teacher() OR public.is_my_student_record(student_id) OR public.is_parent_of_student(student_id));
CREATE POLICY "enrollments admin write" ON public.student_enrollments FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER student_enrollments_updated BEFORE UPDATE ON public.student_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MOVEMENT LOG ============
CREATE TABLE public.student_movement_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX student_movement_student_idx ON public.student_movement_log(student_id, created_at DESC);
GRANT SELECT, INSERT ON public.student_movement_log TO authenticated;
GRANT ALL ON public.student_movement_log TO service_role;
ALTER TABLE public.student_movement_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movement staff read" ON public.student_movement_log FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_teacher() OR public.is_my_student_record(student_id) OR public.is_parent_of_student(student_id));
CREATE POLICY "movement admin write" ON public.student_movement_log FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ============ CLASS STRUCTURE MAPPING (review staging) ============
CREATE TABLE public.class_structure_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_class_id uuid NOT NULL UNIQUE REFERENCES public.classes(id) ON DELETE CASCADE,
  legacy_name text NOT NULL,
  campus_code text NOT NULL DEFAULT 'MAIN',
  level_name text NOT NULL,
  level_order integer NOT NULL DEFAULT 0,
  arm_code text,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_structure_map TO authenticated;
GRANT ALL ON public.class_structure_map TO service_role;
ALTER TABLE public.class_structure_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "map admin only" ON public.class_structure_map FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER class_structure_map_updated BEFORE UPDATE ON public.class_structure_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ FEE RULE CONDITIONS ============
ALTER TABLE public.fee_rules
  ADD COLUMN IF NOT EXISTS genders text[],
  ADD COLUMN IF NOT EXISTS campus_ids uuid[],
  ADD COLUMN IF NOT EXISTS arm_ids uuid[],
  ADD COLUMN IF NOT EXISTS class_level_ids uuid[];

-- ============ SEED CAMPUSES ============
INSERT INTO public.campuses (name, code) VALUES
  ('Main Campus', 'MAIN'), ('Annex Campus', 'ANNEX')
ON CONFLICT (code) DO NOTHING;

CREATE INDEX IF NOT EXISTS students_gender_idx ON public.students(gender);
