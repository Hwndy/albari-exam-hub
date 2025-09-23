-- Phase 1: Core SMS Tables Creation

-- Student Information Management
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  admission_number text UNIQUE NOT NULL,
  date_of_birth date,
  gender text CHECK (gender IN ('male', 'female')),
  blood_group text,
  address jsonb, -- {street, city, state, postal_code, country}
  emergency_contact jsonb, -- {name, relationship, phone, email}
  medical_info jsonb, -- {allergies, medications, conditions}
  admission_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'transferred', 'graduated')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Parent/Guardian Management  
CREATE TABLE public.parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text, -- Mr., Mrs., Dr., etc.
  occupation text,
  workplace text,
  phone_primary text,
  phone_secondary text,
  address jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Student-Parent Relationships
CREATE TABLE public.student_parent_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.parents(id) ON DELETE CASCADE,
  relationship_type text CHECK (relationship_type IN ('father', 'mother', 'guardian', 'other')),
  is_primary_contact boolean DEFAULT false,
  is_emergency_contact boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Fee Management
CREATE TABLE public.fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES public.classes(id),
  academic_year text NOT NULL,
  fee_type text NOT NULL, -- tuition, transport, library, etc.
  amount decimal(10,2) NOT NULL,
  due_date date,
  is_mandatory boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id),
  fee_structure_id uuid REFERENCES public.fee_structures(id),
  amount_paid decimal(10,2) NOT NULL,
  payment_date date DEFAULT CURRENT_DATE,
  payment_method text, -- cash, bank_transfer, online, cheque
  transaction_id text,
  receipt_number text UNIQUE,
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Attendance Management
CREATE TABLE public.attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES public.classes(id),
  subject_id uuid REFERENCES public.subjects(id),
  teacher_id uuid REFERENCES auth.users(id),
  date date DEFAULT CURRENT_DATE,
  period_number integer,
  start_time time,
  end_time time,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.student_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_session_id uuid REFERENCES public.attendance_sessions(id),
  student_id uuid REFERENCES public.students(id),
  status text CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_at timestamptz DEFAULT now(),
  marked_by uuid REFERENCES auth.users(id),
  notes text
);

-- Communication & Announcements
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  target_audience text[] DEFAULT '{}', -- ['all', 'students', 'teachers', 'parents', 'specific_class']
  class_ids uuid[], -- for class-specific announcements
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_published boolean DEFAULT false,
  publish_date timestamptz,
  expire_date timestamptz,
  attachments jsonb, -- file URLs and metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Academic Calendar & Events
CREATE TABLE public.academic_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL, -- 'holiday', 'exam', 'event', 'meeting'
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date,
  is_recurring boolean DEFAULT false,
  recurrence_pattern jsonb, -- {type: 'weekly', 'monthly', days: [], etc.}
  classes_affected uuid[], -- specific classes or null for all
  is_school_wide boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Gradebooks & Report Cards
CREATE TABLE public.gradebook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id),
  subject_id uuid REFERENCES public.subjects(id),
  class_id uuid REFERENCES public.classes(id),
  assessment_type text NOT NULL, -- 'assignment', 'quiz', 'exam', 'project'
  assessment_name text NOT NULL,
  max_score decimal(5,2) NOT NULL,
  obtained_score decimal(5,2),
  grade text,
  assessment_date date DEFAULT CURRENT_DATE,
  remarks text,
  teacher_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Library Management
CREATE TABLE public.library_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn text,
  title text NOT NULL,
  author text,
  publisher text,
  category text,
  total_copies integer DEFAULT 1,
  available_copies integer DEFAULT 1,
  location text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.book_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid REFERENCES public.library_books(id),
  student_id uuid REFERENCES public.students(id),
  issued_date date DEFAULT CURRENT_DATE,
  due_date date,
  returned_date date,
  fine_amount decimal(8,2) DEFAULT 0,
  status text DEFAULT 'issued' CHECK (status IN ('issued', 'returned', 'overdue', 'lost')),
  issued_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security on all new tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parent_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gradebook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_issues ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for Students
CREATE POLICY "Students can view their own profile" ON public.students
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Parents can view their children's profiles" ON public.students
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.student_parent_relationships spr
    JOIN public.parents p ON p.id = spr.parent_id
    WHERE spr.student_id = students.id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Teachers and admins can manage students" ON public.students
FOR ALL USING (is_teacher());

-- Create RLS Policies for Parents
CREATE POLICY "Parents can view and update their own profile" ON public.parents
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all parents" ON public.parents
FOR ALL USING (is_admin());

CREATE POLICY "Teachers can view parents" ON public.parents
FOR SELECT USING (is_teacher());

-- Create RLS Policies for Student-Parent Relationships
CREATE POLICY "Users can view their family relationships" ON public.student_parent_relationships
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.parents p WHERE p.id = parent_id AND p.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage family relationships" ON public.student_parent_relationships
FOR ALL USING (is_admin());

-- Create RLS Policies for Fee Management
CREATE POLICY "Students and parents can view relevant fees" ON public.fee_structures
FOR SELECT USING (
  class_id IN (
    SELECT ca.class_id FROM public.class_assignments ca
    JOIN public.students s ON s.id = ca.student_id
    WHERE s.user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.student_parent_relationships spr
      JOIN public.parents p ON p.id = spr.parent_id
      WHERE spr.student_id = s.id AND p.user_id = auth.uid()
    )
  ) OR is_teacher()
);

CREATE POLICY "Admins can manage fee structures" ON public.fee_structures
FOR ALL USING (is_admin());

CREATE POLICY "Students and parents can view their payments" ON public.fee_payments
FOR SELECT USING (
  student_id IN (
    SELECT s.id FROM public.students s
    WHERE s.user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.student_parent_relationships spr
      JOIN public.parents p ON p.id = spr.parent_id
      WHERE spr.student_id = s.id AND p.user_id = auth.uid()
    )
  ) OR is_teacher()
);

CREATE POLICY "Admins can manage fee payments" ON public.fee_payments
FOR ALL USING (is_admin());

-- Create RLS Policies for Attendance
CREATE POLICY "Teachers can manage attendance sessions" ON public.attendance_sessions
FOR ALL USING (teacher_id = auth.uid() OR is_admin());

CREATE POLICY "Students can view their attendance sessions" ON public.attendance_sessions
FOR SELECT USING (
  class_id IN (
    SELECT ca.class_id FROM public.class_assignments ca
    JOIN public.students s ON s.id = ca.student_id
    WHERE s.user_id = auth.uid()
  )
);

CREATE POLICY "Students and parents can view attendance records" ON public.student_attendance
FOR SELECT USING (
  student_id IN (
    SELECT s.id FROM public.students s
    WHERE s.user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.student_parent_relationships spr
      JOIN public.parents p ON p.id = spr.parent_id
      WHERE spr.student_id = s.id AND p.user_id = auth.uid()
    )
  ) OR is_teacher()
);

CREATE POLICY "Teachers can manage attendance records" ON public.student_attendance
FOR ALL USING (is_teacher());

-- Create RLS Policies for Announcements
CREATE POLICY "Everyone can view published announcements" ON public.announcements
FOR SELECT USING (is_published = true);

CREATE POLICY "Admins and teachers can manage announcements" ON public.announcements
FOR ALL USING (is_teacher());

-- Create RLS Policies for Academic Calendar
CREATE POLICY "Everyone can view academic calendar" ON public.academic_calendar
FOR SELECT USING (true);

CREATE POLICY "Admins can manage academic calendar" ON public.academic_calendar
FOR ALL USING (is_admin());

-- Create RLS Policies for Gradebook
CREATE POLICY "Students and parents can view relevant grades" ON public.gradebook_entries
FOR SELECT USING (
  student_id IN (
    SELECT s.id FROM public.students s
    WHERE s.user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.student_parent_relationships spr
      JOIN public.parents p ON p.id = spr.parent_id
      WHERE spr.student_id = s.id AND p.user_id = auth.uid()
    )
  ) OR is_teacher()
);

CREATE POLICY "Teachers can manage gradebook entries" ON public.gradebook_entries
FOR ALL USING (is_teacher());

-- Create RLS Policies for Library
CREATE POLICY "Everyone can view available books" ON public.library_books
FOR SELECT USING (true);

CREATE POLICY "Admins can manage library books" ON public.library_books
FOR ALL USING (is_admin());

CREATE POLICY "Students and parents can view their book issues" ON public.book_issues
FOR SELECT USING (
  student_id IN (
    SELECT s.id FROM public.students s
    WHERE s.user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.student_parent_relationships spr
      JOIN public.parents p ON p.id = spr.parent_id
      WHERE spr.student_id = s.id AND p.user_id = auth.uid()
    )
  ) OR is_teacher()
);

CREATE POLICY "Admins can manage book issues" ON public.book_issues
FOR ALL USING (is_admin());

-- Create triggers for updated_at columns
CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_parents_updated_at
BEFORE UPDATE ON public.parents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();