-- Add registration_token column to schools table
ALTER TABLE schools ADD COLUMN IF NOT EXISTS registration_token TEXT UNIQUE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_schools_registration_token ON schools(registration_token);

-- Set default school token
UPDATE schools SET registration_token = '4250645' WHERE subdomain = 'default' OR name ILIKE '%albari%';

-- Generate unique tokens for other schools (using last 7 characters of UUID without dashes)
UPDATE schools 
SET registration_token = SUBSTRING(REPLACE(id::text, '-', ''), 1, 7)
WHERE registration_token IS NULL;

-- Add RLS policy to allow public token lookup for active schools only
CREATE POLICY "Public can lookup schools by registration token"
ON schools FOR SELECT
USING (is_active = true);