
GRANT SELECT ON public.class_assignments TO authenticated;

DROP POLICY IF EXISTS "Students can view their own class assignment" ON public.class_assignments;
CREATE POLICY "Students can view their own class assignment"
ON public.class_assignments FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = auth.uid())
  OR public.is_teacher()
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Students can view their class timetable" ON public.class_timetables;
CREATE POLICY "Students can view their class timetable"
ON public.class_timetables FOR SELECT
USING (
  class_id IN (
    SELECT ca.class_id FROM public.class_assignments ca
    WHERE ca.student_id = auth.uid()
       OR ca.student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = auth.uid())
  )
  OR teacher_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Student passport photo uploads: students/<auth uid>/...
DROP POLICY IF EXISTS "Students manage their own photo" ON storage.objects;
CREATE POLICY "Students manage their own photo"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'admission-documents'
  AND (storage.foldername(name))[1] = 'students'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'admission-documents'
  AND (storage.foldername(name))[1] = 'students'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
