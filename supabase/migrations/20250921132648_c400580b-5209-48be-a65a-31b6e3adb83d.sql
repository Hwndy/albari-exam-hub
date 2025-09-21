-- Enable leaked password protection for better security
-- This addresses the security linter warning about disabled password protection

-- Enable password strength requirements
INSERT INTO auth.config (parameter, value) 
VALUES ('password_min_length', '8') 
ON CONFLICT (parameter) DO UPDATE SET value = '8';

-- Enable leaked password protection if not already enabled
INSERT INTO auth.config (parameter, value) 
VALUES ('leaked_password_protection', 'true') 
ON CONFLICT (parameter) DO UPDATE SET value = 'true';

-- Set password strength requirements
INSERT INTO auth.config (parameter, value) 
VALUES ('password_require_letters', 'true') 
ON CONFLICT (parameter) DO UPDATE SET value = 'true';

INSERT INTO auth.config (parameter, value) 
VALUES ('password_require_numbers', 'true') 
ON CONFLICT (parameter) DO UPDATE SET value = 'true';