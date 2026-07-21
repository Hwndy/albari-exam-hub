DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.student_parent_relationships'::regclass
      AND conname = 'student_parent_relationships_relationship_type_check'
  ) THEN
    ALTER TABLE public.student_parent_relationships
      DROP CONSTRAINT student_parent_relationships_relationship_type_check;
  END IF;
END $$;

ALTER TABLE public.student_parent_relationships
  ADD CONSTRAINT student_parent_relationships_relationship_type_check
  CHECK (relationship_type = ANY (ARRAY['parent'::text, 'father'::text, 'mother'::text, 'guardian'::text, 'other'::text]));

CREATE UNIQUE INDEX IF NOT EXISTS student_parent_relationships_parent_student_unique
  ON public.student_parent_relationships(parent_id, student_id);

CREATE UNIQUE INDEX IF NOT EXISTS parents_user_id_unique
  ON public.parents(user_id)
  WHERE user_id IS NOT NULL;