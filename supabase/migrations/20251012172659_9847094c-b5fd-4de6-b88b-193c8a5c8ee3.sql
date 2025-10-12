-- Fix RLS policy for admission_documents to allow admin access
DROP POLICY IF EXISTS "Admins can manage documents" ON admission_documents;

CREATE POLICY "Admins can manage documents" 
ON admission_documents 
FOR ALL 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add validation function to check if interview exists
CREATE OR REPLACE FUNCTION interview_exists(interview_uuid UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM admission_interviews 
    WHERE id = interview_uuid
  );
END;
$$;