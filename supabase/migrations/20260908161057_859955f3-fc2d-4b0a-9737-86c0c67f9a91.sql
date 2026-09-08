
-- ---------- helper: normalise a legacy class name ----------
CREATE OR REPLACE FUNCTION public.parse_legacy_class(_name text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE n text; campus text; lvl text; arm text; ord int := 0; num int := 0; pre text;
BEGIN
  n := upper(btrim(regexp_replace(coalesce(_name,''), '\s+', ' ', 'g')));
  campus := CASE WHEN n LIKE '%IMEKE%' THEN 'ANNEX' ELSE 'MAIN' END;
  n := btrim(regexp_replace(n, 'IMEKE', '', 'g'));
  n := btrim(regexp_replace(n, '\s+', ' ', 'g'));

  IF n ~ '^(.*[0-9])\s*([A-C])$' THEN
    lvl := btrim((regexp_match(n, '^(.*[0-9])\s*([A-C])$'))[1]);
    arm := (regexp_match(n, '^(.*[0-9])\s*([A-C])$'))[2];
  ELSE
    lvl := n; arm := NULL;
  END IF;

  lvl := btrim(regexp_replace(lvl, '([A-Z])([0-9])', '\1 \2', 'g'));
  lvl := btrim(regexp_replace(lvl, '\s+', ' ', 'g'));
  IF lvl = 'PRIMARY 4' THEN lvl := 'BASIC 4'; END IF;
  IF lvl = 'PRIMARY 5' THEN lvl := 'BASIC 5'; END IF;
  IF lvl = 'PRIMARY 6' THEN lvl := 'BASIC 6'; END IF;

  num := COALESCE((regexp_match(lvl, '([0-9]+)'))[1]::int, 0);
  pre := btrim(regexp_replace(lvl, '[0-9]+', '', 'g'));
  ord := CASE
    WHEN pre LIKE 'PREPARAT%' THEN 0
    WHEN pre LIKE 'NURSERY%' THEN 10
    WHEN pre LIKE 'KG%' THEN 20
    WHEN pre LIKE 'BASIC%' OR pre LIKE 'PRIMARY%' THEN 30
    WHEN pre LIKE 'JSS%' THEN 50
    WHEN pre LIKE 'SSS%' OR pre LIKE 'SS%' THEN 70
    ELSE 90 END + num;

  RETURN jsonb_build_object('campus_code', campus, 'level_name', lvl, 'arm_code', arm, 'level_order', ord);
END; $$;

-- ---------- build / refresh the proposal ----------
CREATE OR REPLACE FUNCTION public.build_class_structure_map()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; p jsonb; n int := 0;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  FOR c IN SELECT id, name FROM public.classes LOOP
    p := public.parse_legacy_class(c.name);
    INSERT INTO public.class_structure_map (legacy_class_id, legacy_name, campus_code, level_name, level_order, arm_code)
    VALUES (c.id, c.name, p->>'campus_code', p->>'level_name', (p->>'level_order')::int, p->>'arm_code')
    ON CONFLICT (legacy_class_id) DO UPDATE
      SET legacy_name = EXCLUDED.legacy_name
    WHERE public.class_structure_map.applied_at IS NULL;
    n := n + 1;
  END LOOP;
  RETURN jsonb_build_object('classes', n);
END; $$;

-- ---------- apply the approved mapping ----------
CREATE OR REPLACE FUNCTION public.apply_class_structure_map()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m record; v_campus uuid; v_level uuid; v_offering uuid; v_arm uuid;
        v_enrolled int := 0; v_levels int := 0; s record; v_new boolean; sess record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO sess FROM public.admission_sessions WHERE is_active ORDER BY created_at DESC LIMIT 1;

  FOR m IN SELECT * FROM public.class_structure_map LOOP
    SELECT id INTO v_campus FROM public.campuses WHERE code = m.campus_code;
    IF v_campus IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.class_levels (name, level_order) VALUES (m.level_name, m.level_order)
    ON CONFLICT (name) DO UPDATE SET level_order = EXCLUDED.level_order
    RETURNING id INTO v_level;
    IF v_level IS NULL THEN SELECT id INTO v_level FROM public.class_levels WHERE name = m.level_name; END IF;
    v_levels := v_levels + 1;

    INSERT INTO public.campus_class_offerings (campus_id, class_level_id) VALUES (v_campus, v_level)
    ON CONFLICT (campus_id, class_level_id) DO UPDATE SET is_active = true
    RETURNING id INTO v_offering;

    v_arm := NULL;
    IF m.arm_code IS NOT NULL THEN
      INSERT INTO public.arms (offering_id, code, legacy_class_id) VALUES (v_offering, m.arm_code, m.legacy_class_id)
      ON CONFLICT (offering_id, code) DO UPDATE SET legacy_class_id = EXCLUDED.legacy_class_id, is_active = true
      RETURNING id INTO v_arm;
    END IF;

    -- enrol every student attached to this legacy class
    FOR s IN
      SELECT st.* FROM public.students st
      WHERE EXISTS (
        SELECT 1 FROM public.class_assignments ca
        WHERE ca.class_id = m.legacy_class_id AND (ca.student_id = st.id OR ca.student_id = st.user_id)
      )
    LOOP
      v_new := false;
      IF sess.id IS NOT NULL AND s.admission_date IS NOT NULL THEN
        v_new := s.admission_date >= sess.start_date AND (sess.end_date IS NULL OR s.admission_date <= sess.end_date);
      END IF;

      IF EXISTS (SELECT 1 FROM public.student_enrollments e WHERE e.student_id = s.id AND e.is_current) THEN
        UPDATE public.student_enrollments SET
          campus_id = v_campus, class_level_id = v_level, arm_id = v_arm,
          legacy_class_id = m.legacy_class_id,
          student_type = CASE WHEN v_new THEN 'new' ELSE 'returning' END,
          boarding = CASE WHEN COALESCE(s.is_boarder,false) THEN 'boarding' ELSE 'day' END,
          status = COALESCE(s.status,'active')
        WHERE student_id = s.id AND is_current;
      ELSE
        INSERT INTO public.student_enrollments
          (student_id, academic_year, campus_id, class_level_id, arm_id, legacy_class_id, student_type, boarding, status)
        VALUES (s.id, sess.academic_year, v_campus, v_level, v_arm, m.legacy_class_id,
          CASE WHEN v_new THEN 'new' ELSE 'returning' END,
          CASE WHEN COALESCE(s.is_boarder,false) THEN 'boarding' ELSE 'day' END,
          COALESCE(s.status,'active'));
      END IF;
      v_enrolled := v_enrolled + 1;
    END LOOP;

    UPDATE public.class_structure_map SET applied_at = now() WHERE id = m.id;
  END LOOP;

  RETURN jsonb_build_object('levels', v_levels, 'students_enrolled', v_enrolled,
    'students_total', (SELECT count(*) FROM public.students WHERE archived_at IS NULL),
    'without_enrollment', (SELECT count(*) FROM public.students st WHERE st.archived_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.student_enrollments e WHERE e.student_id = st.id AND e.is_current)));
END; $$;

-- ---------- landing page counts ----------
CREATE OR REPLACE FUNCTION public.get_students_overview()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'campuses', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'name',name,'code',code) ORDER BY name), '[]') FROM public.campuses WHERE is_active),
    'levels', (
      SELECT COALESCE(jsonb_agg(x ORDER BY x->>'level_order', x->>'name'), '[]') FROM (
        SELECT jsonb_build_object(
          'id', cl.id, 'name', cl.name, 'level_order', cl.level_order,
          'total', count(e.id) FILTER (WHERE e.id IS NOT NULL),
          'male', count(*) FILTER (WHERE lower(st.gender) = 'male'),
          'female', count(*) FILTER (WHERE lower(st.gender) = 'female'),
          'by_campus', (
            SELECT COALESCE(jsonb_object_agg(c2.code, cnt), '{}'::jsonb) FROM (
              SELECT e2.campus_id, count(*) cnt FROM public.student_enrollments e2
              JOIN public.students s2 ON s2.id = e2.student_id AND s2.archived_at IS NULL AND COALESCE(s2.status,'active') = 'active'
              WHERE e2.is_current AND e2.class_level_id = cl.id GROUP BY e2.campus_id
            ) q JOIN public.campuses c2 ON c2.id = q.campus_id
          )
        ) AS x
        FROM public.class_levels cl
        LEFT JOIN public.student_enrollments e ON e.class_level_id = cl.id AND e.is_current
        LEFT JOIN public.students st ON st.id = e.student_id AND st.archived_at IS NULL AND COALESCE(st.status,'active') = 'active'
        WHERE cl.is_active
        GROUP BY cl.id, cl.name, cl.level_order
      ) t
    ),
    'totals', (
      SELECT jsonb_build_object(
        'students', count(*),
        'male', count(*) FILTER (WHERE lower(st.gender)='male'),
        'female', count(*) FILTER (WHERE lower(st.gender)='female'),
        'missing_gender', count(*) FILTER (WHERE st.gender IS NULL OR btrim(st.gender)=''),
        'boarding', count(*) FILTER (WHERE COALESCE(st.is_boarder,false)),
        'day', count(*) FILTER (WHERE NOT COALESCE(st.is_boarder,false)),
        'unplaced', count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM public.student_enrollments e3 WHERE e3.student_id = st.id AND e3.is_current))
      ) FROM public.students st WHERE st.archived_at IS NULL AND COALESCE(st.status,'active')='active'
    )
  );
$$;

-- ---------- filtered roster ----------
CREATE OR REPLACE FUNCTION public.list_students_filtered(
  p_class_level_id uuid DEFAULT NULL, p_campus_id uuid DEFAULT NULL, p_arm_id uuid DEFAULT NULL,
  p_gender text DEFAULT NULL, p_boarding text DEFAULT NULL, p_student_type text DEFAULT NULL,
  p_status text DEFAULT 'active', p_search text DEFAULT NULL, p_admission_year int DEFAULT NULL,
  p_limit int DEFAULT 50, p_offset int DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows jsonb; v_total int;
BEGIN
  IF NOT (public.is_admin() OR public.is_teacher()) THEN RAISE EXCEPTION 'Not allowed'; END IF;

  CREATE TEMP TABLE IF NOT EXISTS _noop(x int);

  WITH base AS (
    SELECT st.id, st.user_id, st.admission_number, st.gender, st.date_of_birth, st.status,
           st.photo_url, st.is_boarder, st.admission_date, st.archived_at,
           p.full_name, e.campus_id, e.class_level_id, e.arm_id, e.student_type, e.legacy_class_id,
           c.name AS campus_name, cl.name AS class_name, a.code AS arm_code
    FROM public.students st
    LEFT JOIN public.profiles p ON p.user_id = st.user_id
    LEFT JOIN public.student_enrollments e ON e.student_id = st.id AND e.is_current
    LEFT JOIN public.campuses c ON c.id = e.campus_id
    LEFT JOIN public.class_levels cl ON cl.id = e.class_level_id
    LEFT JOIN public.arms a ON a.id = e.arm_id
    WHERE st.archived_at IS NULL
      AND (p_class_level_id IS NULL OR e.class_level_id = p_class_level_id)
      AND (p_campus_id IS NULL OR e.campus_id = p_campus_id)
      AND (p_arm_id IS NULL OR e.arm_id = p_arm_id)
      AND (p_gender IS NULL OR lower(st.gender) = lower(p_gender))
      AND (p_boarding IS NULL OR (p_boarding = 'boarding') = COALESCE(st.is_boarder,false))
      AND (p_student_type IS NULL OR COALESCE(e.student_type,'returning') = p_student_type)
      AND (p_status IS NULL OR COALESCE(st.status,'active') = p_status)
      AND (p_admission_year IS NULL OR EXTRACT(YEAR FROM st.admission_date) = p_admission_year)
      AND (p_search IS NULL OR btrim(p_search) = '' OR
           st.admission_number ILIKE '%'||p_search||'%' OR p.full_name ILIKE '%'||p_search||'%')
  )
  SELECT count(*)::int,
         COALESCE((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.full_name NULLS LAST, b.admission_number)
                   FROM (SELECT * FROM base ORDER BY full_name NULLS LAST, admission_number
                         LIMIT COALESCE(p_limit, 50) OFFSET COALESCE(p_offset,0)) b), '[]'::jsonb)
  INTO v_total, v_rows FROM base;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END; $$;

-- ---------- structure reports ----------
CREATE OR REPLACE FUNCTION public.get_student_structure_report()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH b AS (
    SELECT st.id, lower(coalesce(st.gender,'unknown')) gender, coalesce(st.is_boarder,false) boarder,
           coalesce(e.student_type,'returning') stype, c.name campus, cl.name class_name, a.code arm
    FROM public.students st
    LEFT JOIN public.student_enrollments e ON e.student_id = st.id AND e.is_current
    LEFT JOIN public.campuses c ON c.id = e.campus_id
    LEFT JOIN public.class_levels cl ON cl.id = e.class_level_id
    LEFT JOIN public.arms a ON a.id = e.arm_id
    WHERE st.archived_at IS NULL AND coalesce(st.status,'active')='active'
  )
  SELECT jsonb_build_object(
    'by_campus', (SELECT COALESCE(jsonb_agg(jsonb_build_object('campus',coalesce(campus,'Unassigned'),'count',n)),'[]') FROM (SELECT campus, count(*) n FROM b GROUP BY campus) q),
    'by_gender', (SELECT COALESCE(jsonb_agg(jsonb_build_object('gender',gender,'count',n)),'[]') FROM (SELECT gender, count(*) n FROM b GROUP BY gender) q),
    'by_class_gender', (SELECT COALESCE(jsonb_agg(jsonb_build_object('class',coalesce(class_name,'Unassigned'),'gender',gender,'count',n)),'[]') FROM (SELECT class_name, gender, count(*) n FROM b GROUP BY class_name, gender) q),
    'by_campus_gender', (SELECT COALESCE(jsonb_agg(jsonb_build_object('campus',coalesce(campus,'Unassigned'),'gender',gender,'count',n)),'[]') FROM (SELECT campus, gender, count(*) n FROM b GROUP BY campus, gender) q),
    'by_arm', (SELECT COALESCE(jsonb_agg(jsonb_build_object('class',coalesce(class_name,'Unassigned'),'arm',coalesce(arm,'—'),'count',n)),'[]') FROM (SELECT class_name, arm, count(*) n FROM b GROUP BY class_name, arm) q),
    'boarding', (SELECT jsonb_build_object('boarding', count(*) FILTER (WHERE boarder), 'day', count(*) FILTER (WHERE NOT boarder)) FROM b),
    'student_type', (SELECT jsonb_build_object('new', count(*) FILTER (WHERE stype='new'), 'returning', count(*) FILTER (WHERE stype='returning')) FROM b)
  );
$$;

-- ---------- billing: include gender / campus / arm ----------
CREATE OR REPLACE FUNCTION public.student_billing_profile(_student_id uuid, _academic_year text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; sess record; v_new boolean := false; e record;
BEGIN
  SELECT * INTO s FROM public.students WHERE id = _student_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO sess FROM public.admission_sessions WHERE academic_year = _academic_year ORDER BY created_at DESC LIMIT 1;
  IF sess.id IS NOT NULL AND s.admission_date IS NOT NULL THEN
    v_new := s.admission_date >= sess.start_date AND (sess.end_date IS NULL OR s.admission_date <= sess.end_date);
  END IF;
  SELECT * INTO e FROM public.student_enrollments WHERE student_id = s.id AND is_current LIMIT 1;
  RETURN jsonb_build_object(
    'student_id', s.id,
    'class_id', COALESCE(e.legacy_class_id, public.student_class_id(s.id)),
    'class_level_id', e.class_level_id,
    'campus_id', e.campus_id,
    'arm_id', e.arm_id,
    'gender', lower(NULLIF(btrim(COALESCE(s.gender,'')), '')),
    'student_type', CASE WHEN COALESCE(e.student_type, CASE WHEN v_new THEN 'new' ELSE 'returning' END) = 'new' THEN 'new' ELSE 'returning' END,
    'student_category', CASE WHEN COALESCE(s.is_boarder,false) THEN 'boarding' ELSE 'day' END
  );
END; $$;

CREATE OR REPLACE FUNCTION public.preview_student_bill(_student_id uuid, _academic_year text, _term text, _class_id uuid DEFAULT NULL, _student_type text DEFAULT NULL, _student_category text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE prof jsonb; v_class uuid; v_type text; v_cat text; v_items jsonb; v_opt jsonb;
        v_gender text; v_campus uuid; v_arm uuid; v_level uuid;
BEGIN
  IF _student_id IS NOT NULL THEN
    prof := public.student_billing_profile(_student_id, _academic_year);
  END IF;
  v_class := COALESCE(_class_id, (prof->>'class_id')::uuid);
  v_type := COALESCE(_student_type, prof->>'student_type', 'returning');
  v_cat := COALESCE(_student_category, prof->>'student_category', 'day');
  v_gender := prof->>'gender';
  v_campus := NULLIF(prof->>'campus_id','')::uuid;
  v_arm := NULLIF(prof->>'arm_id','')::uuid;
  v_level := NULLIF(prof->>'class_level_id','')::uuid;

  WITH eligible AS (
    SELECT r.*, f.name AS fee_name,
      public.fee_period_key(r.frequency, r.academic_year, _term) AS period_key
    FROM public.fee_rules r JOIN public.fees f ON f.id = r.fee_id
    WHERE r.is_active AND f.is_active
      AND r.academic_year = _academic_year
      AND (r.frequency <> 'termly' OR _term = ANY(r.terms))
      AND (r.frequency = 'termly' OR _term = ANY(r.terms) OR array_length(r.terms,1) IS NULL)
      AND (r.student_type = 'both' OR r.student_type = v_type)
      AND (r.student_category = 'both' OR r.student_category = v_cat)
      AND (COALESCE(array_length(r.class_ids,1),0) = 0 OR v_class = ANY(r.class_ids))
      AND (COALESCE(array_length(r.class_level_ids,1),0) = 0 OR v_level = ANY(r.class_level_ids))
      AND (COALESCE(array_length(r.genders,1),0) = 0 OR (v_gender IS NOT NULL AND v_gender = ANY(r.genders)))
      AND (COALESCE(array_length(r.campus_ids,1),0) = 0 OR v_campus = ANY(r.campus_ids))
      AND (COALESCE(array_length(r.arm_ids,1),0) = 0 OR v_arm = ANY(r.arm_ids))
      AND (r.effective_from IS NULL OR r.effective_from <= CURRENT_DATE)
      AND (r.effective_to IS NULL OR r.effective_to >= CURRENT_DATE)
  ), already AS (
    SELECT fee_id, period_key FROM public.invoice_items
    WHERE student_id = _student_id AND status = 'active'
  )
  SELECT
    COALESCE(jsonb_agg(to_jsonb(e) - 'created_by') FILTER (WHERE e.requirement_type = 'compulsory'), '[]'::jsonb),
    COALESCE(jsonb_agg(to_jsonb(e) - 'created_by') FILTER (WHERE e.requirement_type = 'optional'), '[]'::jsonb)
  INTO v_items, v_opt
  FROM eligible e
  WHERE _student_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM already a WHERE a.fee_id = e.fee_id AND a.period_key = e.period_key
  );

  RETURN jsonb_build_object(
    'student_id', _student_id, 'class_id', v_class, 'student_type', v_type,
    'student_category', v_cat, 'gender', v_gender, 'academic_year', _academic_year, 'term', _term,
    'compulsory', v_items, 'optional', v_opt,
    'total_compulsory', COALESCE((SELECT sum((x->>'amount')::numeric) FROM jsonb_array_elements(v_items) x), 0)
  );
END; $$;
