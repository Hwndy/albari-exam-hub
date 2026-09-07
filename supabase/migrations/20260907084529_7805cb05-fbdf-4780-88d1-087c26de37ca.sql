ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('finance_delete_code', '"4250645"'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;