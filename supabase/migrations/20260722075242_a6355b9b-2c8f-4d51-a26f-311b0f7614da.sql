
-- ================= ASSIGNMENTS =================
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  instructions text,
  attachment_url text,
  due_date timestamptz,
  max_score numeric(6,2),
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage assignments" ON public.assignments
  FOR ALL TO authenticated
  USING (public.is_teacher() AND (teacher_id = auth.uid() OR public.is_admin()))
  WITH CHECK (public.is_teacher() AND (teacher_id = auth.uid() OR public.is_admin()));

CREATE POLICY "Students read class assignments" ON public.assignments
  FOR SELECT TO authenticated
  USING (
    is_published = true AND EXISTS (
      SELECT 1 FROM public.class_assignments ca
      JOIN public.students s ON s.id = ca.student_id
      WHERE ca.class_id = assignments.class_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents read children assignments" ON public.assignments
  FOR SELECT TO authenticated
  USING (
    is_published = true AND EXISTS (
      SELECT 1 FROM public.class_assignments ca
      WHERE ca.class_id = assignments.class_id
        AND public.is_parent_of_student(ca.student_id)
    )
  );

CREATE TRIGGER trg_assignments_updated
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================= ASSIGNMENT SUBMISSIONS =================
CREATE TABLE public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  content text,
  attachment_url text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  score numeric(6,2),
  feedback text,
  graded_by uuid,
  graded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_submissions TO authenticated;
GRANT ALL ON public.assignment_submissions TO service_role;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own submissions" ON public.assignment_submissions
  FOR ALL TO authenticated
  USING (public.is_my_student_record(student_id))
  WITH CHECK (public.is_my_student_record(student_id));

CREATE POLICY "Teachers view/grade submissions" ON public.assignment_submissions
  FOR ALL TO authenticated
  USING (
    public.is_teacher() AND EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_submissions.assignment_id
        AND (a.teacher_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    public.is_teacher() AND EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_submissions.assignment_id
        AND (a.teacher_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Parents read children submissions" ON public.assignment_submissions
  FOR SELECT TO authenticated
  USING (public.is_parent_of_student(student_id));

CREATE TRIGGER trg_submissions_updated
  BEFORE UPDATE ON public.assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================= LESSON NOTES =================
CREATE TABLE public.lesson_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  week_number int,
  term text,
  session_id uuid,
  content text,
  attachment_url text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_notes TO authenticated;
GRANT ALL ON public.lesson_notes TO service_role;
ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage lesson notes" ON public.lesson_notes
  FOR ALL TO authenticated
  USING (public.is_teacher() AND (teacher_id = auth.uid() OR public.is_admin()))
  WITH CHECK (public.is_teacher() AND (teacher_id = auth.uid() OR public.is_admin()));

CREATE POLICY "Students read class lesson notes" ON public.lesson_notes
  FOR SELECT TO authenticated
  USING (
    is_published = true AND EXISTS (
      SELECT 1 FROM public.class_assignments ca
      JOIN public.students s ON s.id = ca.student_id
      WHERE ca.class_id = lesson_notes.class_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents read children lesson notes" ON public.lesson_notes
  FOR SELECT TO authenticated
  USING (
    is_published = true AND EXISTS (
      SELECT 1 FROM public.class_assignments ca
      WHERE ca.class_id = lesson_notes.class_id
        AND public.is_parent_of_student(ca.student_id)
    )
  );

CREATE TRIGGER trg_lesson_notes_updated
  BEFORE UPDATE ON public.lesson_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================= GRADING SCALE HELPER =================
CREATE OR REPLACE FUNCTION public.get_grade_for_score(_score numeric)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scale jsonb;
  v_item jsonb;
BEGIN
  SELECT scale_data INTO v_scale
  FROM public.grading_scales
  WHERE is_default = true
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_scale IS NULL THEN
    RETURN jsonb_build_object('grade', 'F', 'remark', 'No scale');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_scale)
  LOOP
    IF _score >= (v_item->>'min')::numeric AND _score <= (v_item->>'max')::numeric THEN
      RETURN jsonb_build_object(
        'grade', v_item->>'grade',
        'remark', v_item->>'remark'
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('grade', 'F', 'remark', 'Fail');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_grade_for_score(numeric) TO authenticated, anon;

-- Allow authenticated users to read the grading scale for client-side use
GRANT SELECT ON public.grading_scales TO authenticated;
GRANT ALL ON public.grading_scales TO service_role;

DROP POLICY IF EXISTS "Anyone can read grading scales" ON public.grading_scales;
CREATE POLICY "Anyone can read grading scales" ON public.grading_scales
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage grading scales" ON public.grading_scales;
CREATE POLICY "Admins manage grading scales" ON public.grading_scales
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
