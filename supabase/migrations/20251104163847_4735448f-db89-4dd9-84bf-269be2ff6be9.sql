-- Fix admission_applications schema to make application_number auto-generated
-- Update the column to have a default empty string (will be overwritten by trigger)
ALTER TABLE admission_applications 
ALTER COLUMN application_number SET DEFAULT '';