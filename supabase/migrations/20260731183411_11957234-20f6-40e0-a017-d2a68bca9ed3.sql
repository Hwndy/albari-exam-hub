
-- 1. Application / student flags
ALTER TABLE public.admission_applications ADD COLUMN IF NOT EXISTS boarding_interest boolean NOT NULL DEFAULT false;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_boarder boolean NOT NULL DEFAULT false;

-- 2. Hostels
CREATE TABLE IF NOT EXISTS public.hostels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  gender text NOT NULL DEFAULT 'mixed',
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hostels TO authenticated;
GRANT ALL ON public.hostels TO service_role;
ALTER TABLE public.hostels ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.hostel_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
  room_number text NOT NULL,
  room_type text NOT NULL DEFAULT 'dormitory',
  capacity int NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hostel_id, room_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hostel_rooms TO authenticated;
GRANT ALL ON public.hostel_rooms TO service_role;
ALTER TABLE public.hostel_rooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.hostel_wardens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'warden',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hostel_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hostel_wardens TO authenticated;
GRANT ALL ON public.hostel_wardens TO service_role;
ALTER TABLE public.hostel_wardens ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.hostel_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.hostel_rooms(id) ON DELETE CASCADE,
  bed_label text,
  status text NOT NULL DEFAULT 'active',
  allocated_on date NOT NULL DEFAULT CURRENT_DATE,
  checked_out_on date,
  reason text,
  allocated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hostel_allocations TO authenticated;
GRANT ALL ON public.hostel_allocations TO service_role;
ALTER TABLE public.hostel_allocations ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS hostel_allocations_one_active
  ON public.hostel_allocations (student_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.hostel_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.hostel_rooms(id) ON DELETE SET NULL,
  inspection_date date NOT NULL DEFAULT CURRENT_DATE,
  inspector_id uuid,
  cleanliness_score int,
  discipline_score int,
  notes text,
  follow_up_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hostel_inspections TO authenticated;
GRANT ALL ON public.hostel_inspections TO service_role;
ALTER TABLE public.hostel_inspections ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.hostel_exeat_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  hostel_id uuid REFERENCES public.hostels(id) ON DELETE SET NULL,
  pass_type text NOT NULL DEFAULT 'exeat',
  out_at timestamptz NOT NULL,
  expected_back_at timestamptz NOT NULL,
  returned_at timestamptz,
  destination text,
  guardian_contact text,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hostel_exeat_passes TO authenticated;
GRANT ALL ON public.hostel_exeat_passes TO service_role;
ALTER TABLE public.hostel_exeat_passes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.hostel_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  roll_date date NOT NULL DEFAULT CURRENT_DATE,
  roll_session text NOT NULL DEFAULT 'night',
  status text NOT NULL DEFAULT 'present',
  notes text,
  marked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hostel_id, student_id, roll_date, roll_session)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hostel_attendance TO authenticated;
GRANT ALL ON public.hostel_attendance TO service_role;
ALTER TABLE public.hostel_attendance ENABLE ROW LEVEL SECURITY;

-- 3. Helpers
CREATE OR REPLACE FUNCTION public.is_hostel_warden(_hostel_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.hostel_wardens w WHERE w.hostel_id = _hostel_id AND w.user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.hostel_of_room(_room_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT hostel_id FROM public.hostel_rooms WHERE id = _room_id
$$;

-- 4. Policies
CREATE POLICY "hostels_read" ON public.hostels FOR SELECT TO authenticated USING (true);
CREATE POLICY "hostels_write" ON public.hostels FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "hostel_rooms_read" ON public.hostel_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "hostel_rooms_write" ON public.hostel_rooms FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "hostel_wardens_read" ON public.hostel_wardens FOR SELECT TO authenticated USING (true);
CREATE POLICY "hostel_wardens_write" ON public.hostel_wardens FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "hostel_allocations_read" ON public.hostel_allocations FOR SELECT TO authenticated
  USING (
    public.is_teacher()
    OR public.is_my_student_record(student_id)
    OR public.is_parent_of_student(student_id)
  );
CREATE POLICY "hostel_allocations_write" ON public.hostel_allocations FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_hostel_warden(public.hostel_of_room(room_id)))
  WITH CHECK (public.is_admin() OR public.is_hostel_warden(public.hostel_of_room(room_id)));

CREATE POLICY "hostel_inspections_read" ON public.hostel_inspections FOR SELECT TO authenticated
  USING (public.is_teacher());
CREATE POLICY "hostel_inspections_write" ON public.hostel_inspections FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_hostel_warden(hostel_id))
  WITH CHECK (public.is_admin() OR public.is_hostel_warden(hostel_id));

CREATE POLICY "hostel_passes_read" ON public.hostel_exeat_passes FOR SELECT TO authenticated
  USING (
    public.is_teacher()
    OR public.is_my_student_record(student_id)
    OR public.is_parent_of_student(student_id)
  );
CREATE POLICY "hostel_passes_write" ON public.hostel_exeat_passes FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_hostel_warden(hostel_id))
  WITH CHECK (public.is_admin() OR public.is_hostel_warden(hostel_id));

CREATE POLICY "hostel_attendance_read" ON public.hostel_attendance FOR SELECT TO authenticated
  USING (
    public.is_teacher()
    OR public.is_my_student_record(student_id)
    OR public.is_parent_of_student(student_id)
  );
CREATE POLICY "hostel_attendance_write" ON public.hostel_attendance FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_hostel_warden(hostel_id))
  WITH CHECK (public.is_admin() OR public.is_hostel_warden(hostel_id));

-- 5. Validation trigger: capacity + gender
CREATE OR REPLACE FUNCTION public.validate_hostel_allocation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_capacity int;
  v_used int;
  v_hostel_gender text;
  v_student_gender text;
  v_hostel_id uuid;
BEGIN
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;

  SELECT r.capacity, r.hostel_id, h.gender
    INTO v_capacity, v_hostel_id, v_hostel_gender
  FROM public.hostel_rooms r JOIN public.hostels h ON h.id = r.hostel_id
  WHERE r.id = NEW.room_id;

  SELECT COUNT(*) INTO v_used
  FROM public.hostel_allocations a
  WHERE a.room_id = NEW.room_id AND a.status = 'active' AND a.id <> COALESCE(NEW.id, gen_random_uuid());

  IF v_used >= COALESCE(v_capacity, 0) THEN
    RAISE EXCEPTION 'This room is full (capacity %)', v_capacity;
  END IF;

  SELECT lower(gender) INTO v_student_gender FROM public.students WHERE id = NEW.student_id;
  IF v_hostel_gender IN ('male','female') AND v_student_gender IS NOT NULL
     AND v_student_gender <> v_hostel_gender THEN
    RAISE EXCEPTION 'This hostel is % only', v_hostel_gender;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_hostel_allocation ON public.hostel_allocations;
CREATE TRIGGER trg_validate_hostel_allocation
  BEFORE INSERT OR UPDATE ON public.hostel_allocations
  FOR EACH ROW EXECUTE FUNCTION public.validate_hostel_allocation();

-- 6. updated_at triggers
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['hostels','hostel_rooms','hostel_wardens','hostel_allocations','hostel_inspections','hostel_exeat_passes','hostel_attendance']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;

-- 7. Occupancy RPC
CREATE OR REPLACE FUNCTION public.get_hostel_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.is_teacher() THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501'; END IF;
  SELECT COALESCE(jsonb_agg(t ORDER BY t->>'name'), '[]'::jsonb) INTO v FROM (
    SELECT jsonb_build_object(
      'id', h.id, 'name', h.name, 'gender', h.gender, 'is_active', h.is_active,
      'rooms', (SELECT COUNT(*) FROM public.hostel_rooms r WHERE r.hostel_id = h.id),
      'capacity', COALESCE((SELECT SUM(r.capacity) FROM public.hostel_rooms r WHERE r.hostel_id = h.id), 0),
      'occupied', COALESCE((SELECT COUNT(*) FROM public.hostel_allocations a
          JOIN public.hostel_rooms r ON r.id = a.room_id
          WHERE r.hostel_id = h.id AND a.status = 'active'), 0)
    ) AS t
    FROM public.hostels h
  ) x;
  RETURN v;
END; $$;

-- 8. Application submission accepts boarding interest
CREATE OR REPLACE FUNCTION public.submit_admission_application(payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_class_id uuid; v_new_id uuid; v_app_no text;
BEGIN
  v_class_id := NULLIF(payload->>'applying_for_class_id','')::uuid;
  INSERT INTO public.admission_applications (
    application_number, status, first_name, middle_name, last_name,
    date_of_birth, gender, blood_group, state_of_origin, lga, nationality, religion,
    email, phone, address, previous_school, previous_class, applying_for_class_id,
    parent_guardian_info, medical_conditions, allergies, special_needs, boarding_interest
  ) VALUES (
    NULL, 'submitted', payload->>'first_name', payload->>'middle_name', payload->>'last_name',
    (payload->>'date_of_birth')::date, payload->>'gender', payload->>'blood_group',
    payload->>'state_of_origin', payload->>'lga', COALESCE(payload->>'nationality','Nigerian'),
    payload->>'religion', payload->>'email', payload->>'phone',
    COALESCE(payload->'address','{}'::jsonb), payload->>'previous_school', payload->>'previous_class',
    v_class_id, COALESCE(payload->'parent_guardian_info','{}'::jsonb),
    payload->>'medical_conditions', payload->>'allergies', payload->>'special_needs',
    COALESCE((payload->>'boarding_interest')::boolean, false)
  ) RETURNING id, application_number INTO v_new_id, v_app_no;
  RETURN jsonb_build_object('id', v_new_id, 'application_number', v_app_no);
END $$;
