ALTER TABLE public.admission_applications ADD COLUMN IF NOT EXISTS login_email text;
CREATE UNIQUE INDEX IF NOT EXISTS admission_applications_login_email_uidx ON public.admission_applications (lower(login_email)) WHERE login_email IS NOT NULL;
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('student_login_domain', '"students.albari.com.ng"'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;