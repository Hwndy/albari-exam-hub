-- =============================================
-- Phase 2.1: Report Card System Enhancement
-- Adds support for TEST 1, TEST 2, EXAM scores,
-- report card comments, and student biometric data
-- =============================================

-- 1. Add assessment type columns to gradebook_entries
ALTER TABLE gradebook_entries 
ADD COLUMN IF NOT EXISTS test1_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS test2_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS exam_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS term VARCHAR(50),
ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);

-- 2. Add student biometric/attendance fields to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS height DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
ADD COLUMN IF NOT EXISTS section VARCHAR(50);

-- 3. Create report_card_comments table for multi-level comments
CREATE TABLE IF NOT EXISTS report_card_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  term VARCHAR(50) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  class_teacher_comment TEXT,
  head_teacher_comment TEXT,
  principal_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, class_id, term, academic_year)
);

-- 4. Create attendance_summary table for term-based attendance tracking
CREATE TABLE IF NOT EXISTS attendance_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  term VARCHAR(50) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  days_school_opened INTEGER DEFAULT 0,
  days_present INTEGER DEFAULT 0,
  days_absent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, class_id, term, academic_year)
);

-- 5. Create grading_scales table for customizable grading
CREATE TABLE IF NOT EXISTS grading_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  scale_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_gradebook_term ON gradebook_entries(term, academic_year);
CREATE INDEX IF NOT EXISTS idx_report_comments_lookup ON report_card_comments(student_id, class_id, term, academic_year);
CREATE INDEX IF NOT EXISTS idx_attendance_summary_lookup ON attendance_summary(student_id, class_id, term, academic_year);

-- 7. Enable RLS on new tables
ALTER TABLE report_card_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_scales ENABLE ROW LEVEL SECURITY;

-- 8. RLS policies for report_card_comments
CREATE POLICY "Users can view report card comments for their school"
ON report_card_comments FOR SELECT
USING (school_id = get_user_school_id());

CREATE POLICY "Teachers and admins can insert report card comments"
ON report_card_comments FOR INSERT
WITH CHECK (
  school_id = get_user_school_id()
  AND (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Teachers and admins can update report card comments"
ON report_card_comments FOR UPDATE
USING (
  school_id = get_user_school_id()
  AND (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Admins can delete report card comments"
ON report_card_comments FOR DELETE
USING (
  school_id = get_user_school_id()
  AND has_role(auth.uid(), 'admin')
);

-- 9. RLS policies for attendance_summary
CREATE POLICY "Users can view attendance summary for their school"
ON attendance_summary FOR SELECT
USING (school_id = get_user_school_id());

CREATE POLICY "Teachers and admins can insert attendance summary"
ON attendance_summary FOR INSERT
WITH CHECK (
  school_id = get_user_school_id()
  AND (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Teachers and admins can update attendance summary"
ON attendance_summary FOR UPDATE
USING (
  school_id = get_user_school_id()
  AND (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Admins can delete attendance summary"
ON attendance_summary FOR DELETE
USING (
  school_id = get_user_school_id()
  AND has_role(auth.uid(), 'admin')
);

-- 10. RLS policies for grading_scales
CREATE POLICY "Users can view grading scales for their school"
ON grading_scales FOR SELECT
USING (school_id = get_user_school_id() OR school_id IS NULL);

CREATE POLICY "Admins can insert grading scales"
ON grading_scales FOR INSERT
WITH CHECK (
  school_id = get_user_school_id()
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update grading scales"
ON grading_scales FOR UPDATE
USING (
  school_id = get_user_school_id()
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete grading scales"
ON grading_scales FOR DELETE
USING (
  school_id = get_user_school_id()
  AND has_role(auth.uid(), 'admin')
);

-- 11. Insert default grading scale (Al-Bari A-F format)
INSERT INTO grading_scales (id, school_id, name, is_default, scale_data)
VALUES (
  gen_random_uuid(),
  NULL,
  'Al-Bari Primary (A-F)',
  true,
  '[
    {"grade": "A", "min": 70, "max": 100, "remark": "Excellent"},
    {"grade": "B", "min": 60, "max": 69, "remark": "Very Good"},
    {"grade": "C", "min": 50, "max": 59, "remark": "Good"},
    {"grade": "D", "min": 40, "max": 49, "remark": "Pass"},
    {"grade": "E", "min": 30, "max": 39, "remark": "Poor"},
    {"grade": "F", "min": 0, "max": 29, "remark": "Fail"}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- 12. Trigger for updated_at on report_card_comments
CREATE TRIGGER update_report_card_comments_updated_at
BEFORE UPDATE ON report_card_comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 13. Trigger for updated_at on attendance_summary
CREATE TRIGGER update_attendance_summary_updated_at
BEFORE UPDATE ON attendance_summary
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 14. Trigger for updated_at on grading_scales
CREATE TRIGGER update_grading_scales_updated_at
BEFORE UPDATE ON grading_scales
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();