
-- storage.objects policies for assignments bucket
DROP POLICY IF EXISTS "assignments read auth" ON storage.objects;
CREATE POLICY "assignments read auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'assignments');

DROP POLICY IF EXISTS "assignments insert auth" ON storage.objects;
CREATE POLICY "assignments insert auth" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assignments');

DROP POLICY IF EXISTS "assignments update own" ON storage.objects;
CREATE POLICY "assignments update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'assignments' AND (owner = auth.uid() OR public.is_admin() OR public.is_teacher()))
  WITH CHECK (bucket_id = 'assignments');

DROP POLICY IF EXISTS "assignments delete own" ON storage.objects;
CREATE POLICY "assignments delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'assignments' AND (owner = auth.uid() OR public.is_admin() OR public.is_teacher()));
