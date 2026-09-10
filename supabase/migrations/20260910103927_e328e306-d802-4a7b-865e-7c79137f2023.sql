DROP POLICY IF EXISTS admins_can_update_profiles ON public.profiles;
CREATE POLICY admins_can_update_profiles
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));