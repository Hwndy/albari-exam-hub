CREATE UNIQUE INDEX IF NOT EXISTS gradebook_entries_unique_term_score
  ON public.gradebook_entries (student_id, subject_id, class_id, session_id, term);