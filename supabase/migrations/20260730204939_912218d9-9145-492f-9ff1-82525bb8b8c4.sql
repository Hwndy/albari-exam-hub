CREATE POLICY "Staff can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_teacher());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_requested text;
  v_role app_role;
BEGIN
  v_requested := lower(coalesce(NEW.raw_user_meta_data ->> 'role', 'student'));

  -- Self-service signup may only create students or parents. Teacher/admin
  -- accounts are provisioned server-side (edge functions / admin tools).
  IF v_requested = 'parent' THEN
    v_role := 'parent'::app_role;
  ELSE
    v_role := 'student'::app_role;
  END IF;

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email))
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (NEW.id, v_role, NEW.id)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_role = 'parent' THEN
    INSERT INTO public.parents (user_id, phone_primary)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'phone')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;