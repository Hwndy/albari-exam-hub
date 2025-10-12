-- Fix RLS policy for admission_documents to allow admin access
DROP POLICY IF EXISTS "Admins can manage documents" ON admission_documents;

-- Create new policy that checks profiles table directly for admin role
CREATE POLICY "Admins can manage documents" 
ON admission_documents 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);