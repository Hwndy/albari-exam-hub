-- Enhanced Gradebook System
-- Tables for grades, assessments, and grade calculations

-- Assessment types and grade components
CREATE TABLE IF NOT EXISTS assessment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  weight numeric(5,2) NOT NULL DEFAULT 0, -- Percentage weight in final grade
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Individual assessments/assignments
CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_type_id uuid REFERENCES assessment_types(id) ON DELETE CASCADE NOT NULL,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  teacher_id uuid REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  max_score numeric(10,2) NOT NULL,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Student grades for assessments
CREATE TABLE IF NOT EXISTS grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  score numeric(10,2) NOT NULL,
  feedback text,
  graded_by uuid REFERENCES auth.users(id),
  graded_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, student_id)
);

-- Grade comments and teacher notes
CREATE TABLE IF NOT EXISTS grade_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  term text NOT NULL,
  academic_year text NOT NULL,
  comment text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE assessment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessment_types
CREATE POLICY "Teachers can manage assessment types"
  ON assessment_types FOR ALL
  USING (is_teacher());

CREATE POLICY "Students can view assessment types for their classes"
  ON assessment_types FOR SELECT
  USING (
    class_id IN (
      SELECT ca.class_id FROM class_assignments ca
      JOIN students s ON s.id = ca.student_id
      WHERE s.user_id = auth.uid()
    )
  );

-- RLS Policies for assessments
CREATE POLICY "Teachers can manage assessments"
  ON assessments FOR ALL
  USING (
    teacher_id = auth.uid() OR is_admin()
  );

CREATE POLICY "Students can view their class assessments"
  ON assessments FOR SELECT
  USING (
    class_id IN (
      SELECT ca.class_id FROM class_assignments ca
      JOIN students s ON s.id = ca.student_id
      WHERE s.user_id = auth.uid()
    )
  );

-- RLS Policies for grades
CREATE POLICY "Teachers can manage grades"
  ON grades FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      WHERE a.id = grades.assessment_id
      AND (a.teacher_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "Students can view their own grades"
  ON grades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = grades.student_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view their children's grades"
  ON grades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_parent_relationships spr
      JOIN parents p ON p.id = spr.parent_id
      WHERE spr.student_id = grades.student_id
      AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for grade_comments
CREATE POLICY "Teachers can manage grade comments"
  ON grade_comments FOR ALL
  USING (is_teacher());

CREATE POLICY "Students can view their comments"
  ON grade_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = grade_comments.student_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view their children's comments"
  ON grade_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_parent_relationships spr
      JOIN parents p ON p.id = spr.parent_id
      WHERE spr.student_id = grade_comments.student_id
      AND p.user_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_assessment_types_updated_at
  BEFORE UPDATE ON assessment_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grades_updated_at
  BEFORE UPDATE ON grades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grade_comments_updated_at
  BEFORE UPDATE ON grade_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();