-- Allow public to view classes for registration
DROP POLICY IF EXISTS "Public can view classes for registration" ON classes;
CREATE POLICY "Public can view classes for registration"
ON classes FOR SELECT
TO public
USING (true);

-- Allow public to view subjects for registration
DROP POLICY IF EXISTS "Public can view subjects for registration" ON subjects;
CREATE POLICY "Public can view subjects for registration"
ON subjects FOR SELECT
TO public
USING (true);