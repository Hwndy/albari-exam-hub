-- Create secure RPC function to manage teacher class assignments
CREATE OR REPLACE FUNCTION public.create_teacher_class_assignments(
  p_teacher_id uuid,
  p_class_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing assignments for this teacher
  DELETE FROM teacher_class_assignments
  WHERE teacher_id = p_teacher_id;
  
  -- Insert new assignments
  INSERT INTO teacher_class_assignments (teacher_id, class_id)
  SELECT p_teacher_id, unnest(p_class_ids);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_teacher_class_assignments(uuid, uuid[]) TO authenticated;

-- Backfill missing class assignments for existing teacher "Sulaimon Ibrahim Semako"
-- This fixes the current issue where teacher has subject_assignments but no teacher_class_assignments
INSERT INTO teacher_class_assignments (teacher_id, class_id)
SELECT '7da1a8c8-8eef-4fa2-a55e-f2b30eb23620'::uuid, unnest(ARRAY[
  '7aa4d643-37bb-4ed3-a95a-448dae49dc05'::uuid,  -- JSS 1
  'd2cd93d4-09e2-414d-bca3-7da88d479330'::uuid   -- JSS 2
])
ON CONFLICT DO NOTHING;