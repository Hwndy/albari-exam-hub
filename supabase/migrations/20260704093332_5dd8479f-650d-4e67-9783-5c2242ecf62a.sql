CREATE UNIQUE INDEX IF NOT EXISTS gradebook_entries_term_key
ON public.gradebook_entries (school_id, student_id, subject_id, class_id, session_id, term)
WHERE session_id IS NOT NULL AND term IS NOT NULL;