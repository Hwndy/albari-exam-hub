-- Add class_id to questions table for categorization by both subject and class
ALTER TABLE public.questions 
ADD COLUMN class_id UUID REFERENCES public.classes(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_questions_class_id ON public.questions(class_id);

-- Update existing questions to have class_id based on their question_bank's class
UPDATE public.questions 
SET class_id = (
  SELECT qb.class_id 
  FROM public.question_banks qb 
  WHERE qb.id = questions.question_bank_id
) 
WHERE class_id IS NULL;