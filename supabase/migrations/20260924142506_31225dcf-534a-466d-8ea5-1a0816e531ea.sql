CREATE OR REPLACE FUNCTION public.students_auto_admission_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.admission_number IS NULL OR btrim(NEW.admission_number) = '' THEN
    NEW.admission_number := public.next_admission_number();
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_students_auto_admission_number ON public.students;
CREATE TRIGGER trg_students_auto_admission_number BEFORE INSERT ON public.students
FOR EACH ROW EXECUTE FUNCTION public.students_auto_admission_number();

CREATE OR REPLACE FUNCTION public.merge_classes(_from uuid, _to uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can merge classes'; END IF;
  IF _from = _to THEN RAISE EXCEPTION 'Pick two different classes'; END IF;
  DELETE FROM class_assignments a WHERE a.class_id = _from
    AND EXISTS (SELECT 1 FROM class_assignments b WHERE b.class_id = _to AND b.student_id = a.student_id);
  UPDATE class_assignments SET class_id = _to WHERE class_id = _from;
  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE student_enrollments SET legacy_class_id = _to WHERE legacy_class_id = _from;
  DELETE FROM teacher_class_assignments a WHERE a.class_id = _from
    AND EXISTS (SELECT 1 FROM teacher_class_assignments b WHERE b.class_id = _to AND b.teacher_id = a.teacher_id);
  UPDATE teacher_class_assignments SET class_id = _to WHERE class_id = _from;
  UPDATE class_timetables SET class_id = _to WHERE class_id = _from;
  RETURN n;
END; $$;
REVOKE ALL ON FUNCTION public.merge_classes(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_classes(uuid, uuid) TO authenticated;