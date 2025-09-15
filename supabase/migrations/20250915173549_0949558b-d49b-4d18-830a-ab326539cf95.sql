-- CBT System Database Migration
-- Create comprehensive structure for Computer Based Testing

-- Create question types enum
CREATE TYPE question_type AS ENUM ('mcq', 'true_false', 'fill_blank');

-- Create difficulty levels enum  
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

-- Create exam status enum
CREATE TYPE exam_status AS ENUM ('draft', 'published', 'archived');

-- Create session status enum
CREATE TYPE session_status AS ENUM ('not_started', 'in_progress', 'completed', 'expired');

-- Question Banks table
CREATE TABLE public.question_banks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL, -- references auth.users(id)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Questions table  
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_bank_id UUID REFERENCES public.question_banks(id) ON DELETE CASCADE,
  question_type question_type NOT NULL DEFAULT 'mcq',
  question_text TEXT NOT NULL,
  explanation TEXT, -- explanation for correct answer
  difficulty_level difficulty_level NOT NULL DEFAULT 'medium',
  points INTEGER NOT NULL DEFAULT 1,
  has_media BOOLEAN NOT NULL DEFAULT false,
  media_url TEXT, -- for images, audio files
  formula_latex TEXT, -- for mathematical formulas
  created_by UUID NOT NULL, -- references auth.users(id)  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Question Options table (for MCQ and True/False)
CREATE TABLE public.question_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  option_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Exams table
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  created_by UUID NOT NULL, -- references auth.users(id)
  
  -- Exam settings
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  total_questions INTEGER NOT NULL DEFAULT 20,
  pass_mark INTEGER NOT NULL DEFAULT 50, -- percentage
  
  -- Question behavior
  randomize_questions BOOLEAN NOT NULL DEFAULT true,
  shuffle_answers BOOLEAN NOT NULL DEFAULT true,
  allow_review BOOLEAN NOT NULL DEFAULT true, -- can student review answers before submit
  show_results_immediately BOOLEAN NOT NULL DEFAULT false,
  
  -- Navigation settings  
  sequential_navigation BOOLEAN NOT NULL DEFAULT false, -- lock previous questions
  allow_question_flagging BOOLEAN NOT NULL DEFAULT true,
  
  -- Timing
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  
  -- Status and metadata
  status exam_status NOT NULL DEFAULT 'draft',
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Exam Questions table (links exams to questions with specific order/points)
CREATE TABLE public.exam_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure no duplicate questions per exam
  UNIQUE(exam_id, question_id)
);

-- Student Exam Sessions table
CREATE TABLE public.exam_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL, -- references auth.users(id)
  
  -- Session timing
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  time_remaining_seconds INTEGER, -- for paused sessions
  
  -- Session state
  status session_status NOT NULL DEFAULT 'not_started',
  current_question_index INTEGER DEFAULT 0,
  
  -- Results (calculated when session completes)
  total_score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 0, 
  percentage DECIMAL(5,2) DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- One active session per student per exam
  UNIQUE(exam_id, student_id)
);

-- Question Responses table (student answers)
CREATE TABLE public.question_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  
  -- Answer data
  selected_option_id UUID REFERENCES public.question_options(id) ON DELETE SET NULL,
  text_answer TEXT, -- for fill in the blank
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  
  -- Metadata
  is_flagged BOOLEAN DEFAULT false,
  time_spent_seconds INTEGER DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure one response per question per session
  UNIQUE(session_id, question_id)
);

-- Enable RLS on all tables
ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Question Banks
CREATE POLICY "Teachers can manage question banks" ON public.question_banks
  FOR ALL USING (is_teacher());

CREATE POLICY "Students can view published question banks" ON public.question_banks  
  FOR SELECT USING (true);

-- Create RLS policies for Questions
CREATE POLICY "Teachers can manage questions" ON public.questions
  FOR ALL USING (is_teacher());
  
CREATE POLICY "Students can view questions during exams" ON public.questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exam_sessions es
      JOIN public.exam_questions eq ON eq.exam_id = es.exam_id
      WHERE eq.question_id = questions.id 
      AND es.student_id = auth.uid()
      AND es.status = 'in_progress'
    )
  );

-- Create RLS policies for Question Options  
CREATE POLICY "Teachers can manage question options" ON public.question_options
  FOR ALL USING (is_teacher());

CREATE POLICY "Students can view options during exams" ON public.question_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exam_sessions es
      JOIN public.exam_questions eq ON eq.exam_id = es.exam_id
      WHERE eq.question_id = question_options.question_id
      AND es.student_id = auth.uid()  
      AND es.status = 'in_progress'
    )
  );

-- Create RLS policies for Exams
CREATE POLICY "Teachers can manage exams" ON public.exams
  FOR ALL USING (is_teacher());

CREATE POLICY "Students can view published exams for their class" ON public.exams
  FOR SELECT USING (
    status = 'published' 
    AND (
      class_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM public.class_assignments ca 
        WHERE ca.class_id = exams.class_id 
        AND ca.student_id = auth.uid()
      )
    )
  );

-- Create RLS policies for Exam Questions
CREATE POLICY "Teachers can manage exam questions" ON public.exam_questions
  FOR ALL USING (is_teacher());

CREATE POLICY "Students can view exam questions during session" ON public.exam_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exam_sessions es
      WHERE es.exam_id = exam_questions.exam_id
      AND es.student_id = auth.uid()
      AND es.status IN ('in_progress', 'completed')
    )
  );

-- Create RLS policies for Exam Sessions  
CREATE POLICY "Students can manage their own sessions" ON public.exam_sessions
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers can view all sessions" ON public.exam_sessions
  FOR SELECT USING (is_teacher());

-- Create RLS policies for Question Responses
CREATE POLICY "Students can manage their own responses" ON public.question_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.exam_sessions es
      WHERE es.id = question_responses.session_id
      AND es.student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view all responses" ON public.question_responses
  FOR SELECT USING (is_teacher());

-- Create indexes for performance
CREATE INDEX idx_question_banks_subject ON public.question_banks(subject_id);
CREATE INDEX idx_questions_bank ON public.questions(question_bank_id);
CREATE INDEX idx_questions_type ON public.questions(question_type);
CREATE INDEX idx_question_options_question ON public.question_options(question_id);
CREATE INDEX idx_exam_questions_exam ON public.exam_questions(exam_id);
CREATE INDEX idx_exam_questions_question ON public.exam_questions(question_id);
CREATE INDEX idx_exam_sessions_student ON public.exam_sessions(student_id);
CREATE INDEX idx_exam_sessions_exam ON public.exam_sessions(exam_id);
CREATE INDEX idx_question_responses_session ON public.question_responses(session_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_question_banks_updated_at
  BEFORE UPDATE ON public.question_banks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON public.questions  
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exams_updated_at
  BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exam_sessions_updated_at  
  BEFORE UPDATE ON public.exam_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage buckets for media files
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('question-media', 'question-media', false),
  ('exam-attachments', 'exam-attachments', false);

-- Create storage policies for question media
CREATE POLICY "Teachers can upload question media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'question-media' 
    AND is_teacher()
  );

CREATE POLICY "Teachers can update question media" ON storage.objects  
  FOR UPDATE USING (
    bucket_id = 'question-media'
    AND is_teacher()
  );

CREATE POLICY "Teachers can delete question media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'question-media'
    AND is_teacher()  
  );

CREATE POLICY "Authenticated users can view question media" ON storage.objects
  FOR SELECT USING (bucket_id = 'question-media');

-- Create storage policies for exam attachments
CREATE POLICY "Teachers can manage exam attachments" ON storage.objects
  FOR ALL USING (
    bucket_id = 'exam-attachments'
    AND is_teacher()
  );

CREATE POLICY "Students can view exam attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'exam-attachments');

-- Create helper functions for exam management
CREATE OR REPLACE FUNCTION public.calculate_exam_score(session_id_param UUID)
RETURNS JSON AS $$
DECLARE
  session_record RECORD;
  total_points INTEGER := 0;
  earned_points INTEGER := 0;
  percentage DECIMAL(5,2);
  result JSON;
BEGIN
  -- Get session info
  SELECT * INTO session_record 
  FROM public.exam_sessions 
  WHERE id = session_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Session not found');
  END IF;
  
  -- Calculate total possible points
  SELECT COALESCE(SUM(eq.points), 0) INTO total_points
  FROM public.exam_questions eq
  WHERE eq.exam_id = session_record.exam_id;
  
  -- Calculate earned points  
  SELECT COALESCE(SUM(qr.points_earned), 0) INTO earned_points
  FROM public.question_responses qr
  WHERE qr.session_id = session_id_param;
  
  -- Calculate percentage
  IF total_points > 0 THEN
    percentage := (earned_points::DECIMAL / total_points::DECIMAL) * 100;
  ELSE
    percentage := 0;
  END IF;
  
  -- Update session with calculated scores
  UPDATE public.exam_sessions 
  SET 
    total_score = earned_points,
    max_score = total_points,
    percentage = percentage,
    passed = percentage >= (
      SELECT pass_mark FROM public.exams WHERE id = session_record.exam_id
    ),
    updated_at = now()
  WHERE id = session_id_param;
  
  -- Return result
  result := json_build_object(
    'total_score', earned_points,
    'max_score', total_points, 
    'percentage', percentage,
    'passed', percentage >= (
      SELECT pass_mark FROM public.exams WHERE id = session_record.exam_id
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-grade MCQ and True/False questions
CREATE OR REPLACE FUNCTION public.grade_question_response()
RETURNS TRIGGER AS $$
DECLARE
  question_record RECORD;
  is_answer_correct BOOLEAN := false;
  points_to_award INTEGER := 0;
BEGIN
  -- Get question details
  SELECT q.*, eq.points INTO question_record
  FROM public.questions q
  JOIN public.exam_questions eq ON eq.question_id = q.id
  JOIN public.exam_sessions es ON es.exam_id = eq.exam_id
  WHERE q.id = NEW.question_id 
  AND es.id = NEW.session_id;
  
  -- Grade based on question type
  IF question_record.question_type IN ('mcq', 'true_false') THEN
    -- Check if selected option is correct
    SELECT is_correct INTO is_answer_correct
    FROM public.question_options
    WHERE id = NEW.selected_option_id;
    
    IF is_answer_correct THEN
      points_to_award := question_record.points;
    END IF;
    
  ELSIF question_record.question_type = 'fill_blank' THEN
    -- For fill in the blank, check if any correct option matches
    SELECT EXISTS(
      SELECT 1 FROM public.question_options qo
      WHERE qo.question_id = NEW.question_id
      AND qo.is_correct = true
      AND LOWER(TRIM(qo.option_text)) = LOWER(TRIM(NEW.text_answer))
    ) INTO is_answer_correct;
    
    IF is_answer_correct THEN
      points_to_award := question_record.points;
    END IF;
  END IF;
  
  -- Update response with grading results
  NEW.is_correct := is_answer_correct;
  NEW.points_earned := points_to_award;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-grading
CREATE TRIGGER trigger_grade_question_response
  BEFORE INSERT OR UPDATE ON public.question_responses
  FOR EACH ROW EXECUTE FUNCTION public.grade_question_response();