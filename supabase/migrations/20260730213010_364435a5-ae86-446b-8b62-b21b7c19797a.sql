-- 1. Sequence-backed employee IDs
CREATE SEQUENCE IF NOT EXISTS public.employee_id_seq START 1;

CREATE OR REPLACE FUNCTION public.next_employee_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id text;
BEGIN
  LOOP
    v_id := 'ALB/STF/' || LPAD(nextval('public.employee_id_seq')::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.staff_details WHERE employee_id = v_id);
  END LOOP;
  RETURN v_id;
END;
$$;

-- Re-issue unique IDs to existing rows
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at NULLS LAST, id) AS rn
  FROM public.staff_details
)
UPDATE public.staff_details s
SET employee_id = 'ALB/STF/' || LPAD(o.rn::text, 4, '0')
FROM ordered o
WHERE s.id = o.id;

SELECT setval('public.employee_id_seq', GREATEST((SELECT COUNT(*) FROM public.staff_details), 1));

CREATE UNIQUE INDEX IF NOT EXISTS staff_details_employee_id_key
  ON public.staff_details (employee_id) WHERE employee_id IS NOT NULL;

-- Auto-assign employee_id when missing
CREATE OR REPLACE FUNCTION public.set_employee_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.employee_id IS NULL OR btrim(NEW.employee_id) = '' THEN
    NEW.employee_id := public.next_employee_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_employee_id ON public.staff_details;
CREATE TRIGGER trg_set_employee_id
BEFORE INSERT ON public.staff_details
FOR EACH ROW EXECUTE FUNCTION public.set_employee_id();

-- 2. One attendance row per staff per day
DELETE FROM public.staff_attendance a
USING public.staff_attendance b
WHERE a.staff_id = b.staff_id AND a.date = b.date AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS staff_attendance_staff_date_key
  ON public.staff_attendance (staff_id, date);

-- 3. Attach unallocated acceptance-fee credits to the student's tuition structure
UPDATE public.fee_payments fp
SET fee_structure_id = fs.id
FROM public.class_assignments ca
JOIN public.fee_structures fs
  ON fs.class_id = ca.class_id AND fs.is_mandatory = true
WHERE fp.student_id = ca.student_id
  AND fp.fee_structure_id IS NULL
  AND fp.status = 'completed'
  AND fs.id = (
    SELECT f2.id FROM public.fee_structures f2
    WHERE f2.class_id = ca.class_id AND f2.is_mandatory = true
    ORDER BY f2.created_at DESC LIMIT 1
  );