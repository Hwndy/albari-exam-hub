-- Migration: Timetable Management System
-- Creates complete infrastructure for school timetable/schedule management

-- 1. Rooms/Venues Table
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number text UNIQUE NOT NULL,
  room_name text,
  capacity integer CHECK (capacity > 0),
  room_type text DEFAULT 'classroom', -- 'classroom', 'laboratory', 'library', 'hall', 'sports'
  facilities jsonb DEFAULT '{}', -- {"projector": true, "ac": true, "computers": 30}
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Timetable Templates (Academic year/term configurations)
CREATE TABLE IF NOT EXISTS public.timetable_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  academic_year text NOT NULL,
  term text NOT NULL, -- 'First Term', 'Second Term', 'Third Term'
  effective_from date NOT NULL,
  effective_to date,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(academic_year, term)
);

-- 3. Periods Definition (Time slots)
CREATE TABLE IF NOT EXISTS public.periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.timetable_templates(id) ON DELETE CASCADE,
  period_number integer NOT NULL,
  period_name text, -- 'Morning Assembly', 'Period 1', 'Break', 'Lunch', 'Period 5'
  start_time time NOT NULL,
  end_time time NOT NULL,
  period_type text DEFAULT 'regular', -- 'regular', 'break', 'lunch', 'assembly', 'closing'
  is_teaching_period boolean DEFAULT true, -- false for breaks/assembly
  created_at timestamptz DEFAULT now(),
  UNIQUE(template_id, period_number),
  CHECK (end_time > start_time)
);

-- 4. Class Timetable Entries (The actual schedule)
CREATE TABLE IF NOT EXISTS public.class_timetables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.timetable_templates(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.periods(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Monday, 7=Sunday
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(template_id, class_id, period_id, day_of_week)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_active ON public.rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_timetable_templates_active ON public.timetable_templates(is_active, academic_year, term);
CREATE INDEX IF NOT EXISTS idx_periods_template ON public.periods(template_id, period_number);
CREATE INDEX IF NOT EXISTS idx_class_timetables_lookup ON public.class_timetables(template_id, class_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_class_timetables_teacher ON public.class_timetables(teacher_id, template_id);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_timetables ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rooms
CREATE POLICY "Everyone can view active rooms"
ON public.rooms FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage rooms"
ON public.rooms FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for timetable_templates
CREATE POLICY "Everyone can view active templates"
ON public.timetable_templates FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage templates"
ON public.timetable_templates FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for periods
CREATE POLICY "Everyone can view periods"
ON public.periods FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.timetable_templates tt
  WHERE tt.id = periods.template_id AND tt.is_active = true
) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage periods"
ON public.periods FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for class_timetables
CREATE POLICY "Students can view their class timetable"
ON public.class_timetables FOR SELECT
USING (
  -- Students see their class timetable
  class_id IN (
    SELECT ca.class_id FROM public.class_assignments ca
    JOIN public.students s ON s.id = ca.student_id
    WHERE s.user_id = auth.uid()
  )
  OR 
  -- Teachers see classes they teach
  teacher_id = auth.uid()
  OR
  -- Admins see all
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Teachers can view their teaching schedule"
ON public.class_timetables FOR SELECT
USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage timetables"
ON public.class_timetables FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at
CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_timetable_templates_updated_at
BEFORE UPDATE ON public.timetable_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_class_timetables_updated_at
BEFORE UPDATE ON public.class_timetables
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function to check for timetable conflicts
CREATE OR REPLACE FUNCTION public.check_timetable_conflict(
  p_template_id uuid,
  p_period_id uuid,
  p_day_of_week integer,
  p_teacher_id uuid,
  p_room_id uuid,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conflict_record RECORD;
  conflicts jsonb := '[]'::jsonb;
BEGIN
  -- Check teacher conflicts (same teacher, same period, same day)
  IF p_teacher_id IS NOT NULL THEN
    FOR conflict_record IN
      SELECT ct.id, c.name as class_name, s.name as subject_name
      FROM class_timetables ct
      JOIN classes c ON c.id = ct.class_id
      LEFT JOIN subjects s ON s.id = ct.subject_id
      WHERE ct.template_id = p_template_id
        AND ct.period_id = p_period_id
        AND ct.day_of_week = p_day_of_week
        AND ct.teacher_id = p_teacher_id
        AND (p_exclude_id IS NULL OR ct.id != p_exclude_id)
    LOOP
      conflicts := conflicts || jsonb_build_object(
        'type', 'teacher',
        'message', format('Teacher already assigned to %s (%s)', 
          conflict_record.class_name, 
          COALESCE(conflict_record.subject_name, 'No subject'))
      );
    END LOOP;
  END IF;

  -- Check room conflicts (same room, same period, same day)
  IF p_room_id IS NOT NULL THEN
    FOR conflict_record IN
      SELECT ct.id, c.name as class_name
      FROM class_timetables ct
      JOIN classes c ON c.id = ct.class_id
      WHERE ct.template_id = p_template_id
        AND ct.period_id = p_period_id
        AND ct.day_of_week = p_day_of_week
        AND ct.room_id = p_room_id
        AND (p_exclude_id IS NULL OR ct.id != p_exclude_id)
    LOOP
      conflicts := conflicts || jsonb_build_object(
        'type', 'room',
        'message', format('Room already occupied by %s', conflict_record.class_name)
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'has_conflicts', jsonb_array_length(conflicts) > 0,
    'conflicts', conflicts
  );
END;
$$;

-- Comments
COMMENT ON TABLE public.rooms IS 'School rooms/venues for timetable scheduling';
COMMENT ON TABLE public.timetable_templates IS 'Academic year/term timetable configurations';
COMMENT ON TABLE public.periods IS 'Time slots definition for each timetable template';
COMMENT ON TABLE public.class_timetables IS 'Actual class schedules - which class, subject, teacher, room at which time';
COMMENT ON FUNCTION public.check_timetable_conflict IS 'Validates teacher and room availability to prevent double-booking';