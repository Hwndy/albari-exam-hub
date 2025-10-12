-- Fix search_path for interview_exists function
CREATE OR REPLACE FUNCTION interview_exists(interview_uuid UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM admission_interviews 
    WHERE id = interview_uuid
  );
END;
$$;