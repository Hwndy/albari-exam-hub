-- Make school_id nullable temporarily to allow gradual migration
-- This allows the application to build and run while we update code

ALTER TABLE public.classes ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE public.subjects ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE public.exams ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE public.question_banks ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE public.questions ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE public.admission_sessions ALTER COLUMN school_id DROP NOT NULL;