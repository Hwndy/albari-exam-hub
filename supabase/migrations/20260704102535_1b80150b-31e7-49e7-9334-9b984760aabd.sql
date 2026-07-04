
-- 1. Delete non-Al-Bari rows in dependency order (children first)
DO $$
DECLARE
  t text;
  al uuid := 'bbe68d9f-b5b4-481e-81d9-0766f4e030da'::uuid;
  tables text[] := ARRAY[
    -- deepest children first
    'question_responses','exam_questions','question_options','questions','question_banks',
    'exam_sessions','exams',
    'admission_workflow_logs','admission_documents','admission_payments','admission_offers',
    'admission_interviews','admission_exam_assignments','admission_applications','admission_sessions',
    'report_card_publications','report_card_comments','result_automation_settings',
    'gradebook_entries','grade_comments','grades','grading_scales','assessments','assessment_types',
    'promotion_history',
    'book_issues','library_books',
    'student_attendance','attendance_sessions','attendance_summary','staff_attendance',
    'class_timetables','timetable_templates','periods','rooms',
    'fee_reminder_logs','fee_payments','fee_installments','fee_installment_plans','fee_structures',
    'notification_queue','notification_templates','email_logs','announcements','academic_calendar',
    'news_articles','gallery','testimonials','website_pages','website_sections','website_settings','school_info',
    'student_id_cards','student_parent_relationships','parents','students',
    'teacher_class_assignments','subject_assignments','class_assignments','subjects','classes',
    'staff_details'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='school_id') THEN
      EXECUTE format('DELETE FROM public.%I WHERE school_id IS NOT NULL AND school_id <> %L', t, al);
    END IF;
  END LOOP;
END $$;

-- Reassign super admin, delete other profiles
UPDATE public.profiles SET school_id = 'bbe68d9f-b5b4-481e-81d9-0766f4e030da'::uuid WHERE school_id IS NULL;
DELETE FROM public.profiles WHERE school_id <> 'bbe68d9f-b5b4-481e-81d9-0766f4e030da'::uuid;

-- 2. Drop the view referencing school_id
DROP VIEW IF EXISTS public.v_student_term_scores CASCADE;

-- 3. Drop school_id columns via CASCADE
DO $$
DECLARE t text;
BEGIN
  FOR t IN 
    SELECT table_name FROM information_schema.columns 
    WHERE table_schema='public' AND column_name='school_id' AND table_name <> 'profiles'
    AND table_name IN (SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE')
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP COLUMN school_id CASCADE', t);
  END LOOP;
END $$;

-- 4. Drop multitenancy helpers
DROP FUNCTION IF EXISTS public.get_user_school_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_user_super_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_super_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_same_school(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.auto_populate_school_id_admission_child() CASCADE;
DROP FUNCTION IF EXISTS public.auto_populate_school_id_class_assignments() CASCADE;
DROP FUNCTION IF EXISTS public.auto_populate_school_id_question_responses() CASCADE;
DROP FUNCTION IF EXISTS public.auto_populate_school_id_exam_questions() CASCADE;
DROP FUNCTION IF EXISTS public.auto_populate_school_id_question_options() CASCADE;
DROP FUNCTION IF EXISTS public.populate_exam_session_school_id() CASCADE;

-- 5. Rewrite RPCs
DROP FUNCTION IF EXISTS public.submit_admission_application(jsonb);
CREATE OR REPLACE FUNCTION public.submit_admission_application(payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_class_id uuid; v_new_id uuid; v_app_no text;
BEGIN
  v_class_id := NULLIF(payload->>'applying_for_class_id','')::uuid;
  INSERT INTO public.admission_applications (
    application_number, status, first_name, middle_name, last_name,
    date_of_birth, gender, blood_group, state_of_origin, lga, nationality, religion,
    email, phone, address, previous_school, previous_class, applying_for_class_id,
    parent_guardian_info, medical_conditions, allergies, special_needs
  ) VALUES (
    NULL, 'submitted', payload->>'first_name', payload->>'middle_name', payload->>'last_name',
    (payload->>'date_of_birth')::date, payload->>'gender', payload->>'blood_group',
    payload->>'state_of_origin', payload->>'lga', COALESCE(payload->>'nationality','Nigerian'),
    payload->>'religion', payload->>'email', payload->>'phone',
    COALESCE(payload->'address','{}'::jsonb), payload->>'previous_school', payload->>'previous_class',
    v_class_id, COALESCE(payload->'parent_guardian_info','{}'::jsonb),
    payload->>'medical_conditions', payload->>'allergies', payload->>'special_needs'
  ) RETURNING id, application_number INTO v_new_id, v_app_no;
  RETURN jsonb_build_object('id', v_new_id, 'application_number', v_app_no);
END $$;

DROP FUNCTION IF EXISTS public.get_application_tracking(text, text);
CREATE OR REPLACE FUNCTION public.get_application_tracking(p_app_no text, p_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_app jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', a.id, 'application_number', a.application_number,
    'first_name', a.first_name, 'last_name', a.last_name, 'email', a.email,
    'status', a.status, 'application_date', a.application_date,
    'applying_for_class_id', a.applying_for_class_id, 'class_name', c.name,
    'offer', (SELECT jsonb_build_object('id',o.id,'status',o.status,'offer_date',o.offer_date,'response_deadline',o.response_deadline)
              FROM public.admission_offers o WHERE o.application_id=a.id ORDER BY o.created_at DESC LIMIT 1),
    'payment', (SELECT jsonb_build_object('id',p.id,'status',p.status,'amount',p.amount)
                FROM public.admission_payments p WHERE p.application_id=a.id ORDER BY p.created_at DESC LIMIT 1)
  ) INTO v_app
  FROM public.admission_applications a LEFT JOIN public.classes c ON c.id=a.applying_for_class_id
  WHERE lower(a.application_number)=lower(p_app_no) AND lower(a.email)=lower(p_email);
  IF v_app IS NULL THEN RAISE EXCEPTION 'Application not found' USING ERRCODE='P0002'; END IF;
  RETURN v_app;
END $$;

DROP FUNCTION IF EXISTS public.transition_admission_status(uuid, admission_status, text);
CREATE OR REPLACE FUNCTION public.transition_admission_status(p_application_id uuid, p_new_status admission_status, p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_current admission_status; v_allowed boolean := false;
BEGIN
  SELECT status INTO v_current FROM public.admission_applications WHERE id=p_application_id;
  IF v_current IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  v_allowed := CASE
    WHEN p_new_status='withdrawn' THEN true
    WHEN v_current='submitted' AND p_new_status IN ('under_review','rejected') THEN true
    WHEN v_current='under_review' AND p_new_status IN ('interview_scheduled','accepted','rejected') THEN true
    WHEN v_current='interview_scheduled' AND p_new_status IN ('accepted','rejected') THEN true
    WHEN v_current='accepted' AND p_new_status='payment_pending' THEN true
    WHEN v_current='payment_pending' AND p_new_status='enrolled' THEN true
    WHEN v_current=p_new_status THEN true ELSE false END;
  IF NOT v_allowed THEN RAISE EXCEPTION 'Invalid status transition: % -> %', v_current, p_new_status; END IF;
  UPDATE public.admission_applications
  SET status=p_new_status, reviewed_by=auth.uid(), reviewed_at=now(), review_notes=COALESCE(p_notes,review_notes), updated_at=now()
  WHERE id=p_application_id;
  INSERT INTO public.admission_workflow_logs (application_id, from_status, to_status, changed_by, notes)
  VALUES (p_application_id, v_current::text, p_new_status::text, auth.uid(), p_notes) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success', true, 'from', v_current, 'to', p_new_status);
END $$;

DROP FUNCTION IF EXISTS public.get_current_session(uuid);
CREATE OR REPLACE FUNCTION public.get_current_session()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT id FROM public.admission_sessions WHERE is_current=true LIMIT 1
$$;

-- 6. Drop profiles.school_id and schools table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS school_id CASCADE;
DROP TABLE IF EXISTS public.schools CASCADE;

-- 7. Recreate v_student_term_scores without school_id
CREATE OR REPLACE VIEW public.v_student_term_scores AS
WITH online_scores AS (
  SELECT es.student_id, e.session_id, e.term, e.class_id, e.subject_id, e.assessment_category,
         es.percentage
  FROM public.exam_sessions es JOIN public.exams e ON e.id=es.exam_id
  WHERE es.status='completed'::session_status
    AND e.assessment_category = ANY (ARRAY['test1'::text,'test2'::text,'exam'::text])
    AND e.session_id IS NOT NULL AND e.term IS NOT NULL
),
online_pivot AS (
  SELECT student_id, session_id, term, class_id, subject_id,
    max(CASE WHEN assessment_category='test1' THEN round(percentage*20.0/100.0,2) END) AS o_test1,
    max(CASE WHEN assessment_category='test2' THEN round(percentage*20.0/100.0,2) END) AS o_test2,
    max(CASE WHEN assessment_category='exam'  THEN round(percentage*60.0/100.0,2) END) AS o_exam
  FROM online_scores GROUP BY student_id, session_id, term, class_id, subject_id
),
manual AS (
  SELECT student_id, session_id, term, class_id, subject_id,
    max(test1_score) AS m_test1, max(test2_score) AS m_test2, max(exam_score) AS m_exam
  FROM public.gradebook_entries
  WHERE session_id IS NOT NULL AND term IS NOT NULL
  GROUP BY student_id, session_id, term, class_id, subject_id
),
combined AS (
  SELECT COALESCE(m.student_id,o.student_id) AS student_id,
         COALESCE(m.session_id,o.session_id) AS session_id,
         COALESCE(m.term,o.term::varchar) AS term,
         COALESCE(m.class_id,o.class_id) AS class_id,
         COALESCE(m.subject_id,o.subject_id) AS subject_id,
         COALESCE(m.m_test1,o.o_test1,0) AS test1,
         COALESCE(m.m_test2,o.o_test2,0) AS test2,
         COALESCE(m.m_exam,o.o_exam,0)   AS exam_score
  FROM manual m FULL JOIN online_pivot o
    ON m.student_id=o.student_id AND m.session_id=o.session_id
   AND m.term::text=o.term AND m.subject_id=o.subject_id
)
SELECT student_id, session_id, term, class_id, subject_id, test1, test2, exam_score,
       test1+test2+exam_score AS total,
       rank() OVER (PARTITION BY session_id, term, class_id, subject_id ORDER BY (test1+test2+exam_score) DESC) AS subject_position
FROM combined;

GRANT SELECT ON public.v_student_term_scores TO authenticated;

-- 8. Recreate policies for previously-scoped tables
DO $$
DECLARE tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'academic_calendar','admission_applications','admission_documents','admission_interviews',
    'admission_offers','admission_payments','admission_sessions','admission_workflow_logs',
    'announcements','assessment_types','assessments','attendance_sessions','attendance_summary',
    'book_issues','class_assignments','class_timetables','classes','exam_questions','exam_sessions',
    'exams','fee_installment_plans','fee_installments','fee_payments','fee_reminder_logs',
    'fee_structures','gallery','grade_comments','gradebook_entries','grades','grading_scales',
    'library_books','news_articles','notification_queue','notification_templates','parents',
    'periods','promotion_history','question_banks','question_options','question_responses',
    'questions','report_card_comments','report_card_publications','result_automation_settings',
    'rooms','staff_attendance','staff_details','student_attendance','student_id_cards',
    'student_parent_relationships','students','subject_assignments','subjects',
    'teacher_class_assignments','testimonials','timetable_templates','website_pages',
    'website_sections','website_settings','school_info'
  ])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=tbl) THEN
      EXECUTE format('DROP POLICY IF EXISTS "Admins full access" ON public.%I', tbl);
      EXECUTE format('CREATE POLICY "Admins full access" ON public.%I FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())', tbl);
    END IF;
  END LOOP;

  FOR tbl IN SELECT unnest(ARRAY[
    'announcements','assessment_types','assessments','attendance_sessions','class_timetables',
    'exam_questions','exam_sessions','exams','grade_comments','gradebook_entries',
    'grades','question_banks','question_options','question_responses','questions',
    'student_attendance','subject_assignments','subjects','students','parents',
    'student_parent_relationships','teacher_class_assignments','report_card_comments',
    'report_card_publications','result_automation_settings','classes'
  ])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=tbl) THEN
      EXECUTE format('DROP POLICY IF EXISTS "Teachers full access" ON public.%I', tbl);
      EXECUTE format('CREATE POLICY "Teachers full access" ON public.%I FOR ALL TO authenticated USING (is_teacher()) WITH CHECK (is_teacher())', tbl);
    END IF;
  END LOOP;

  FOR tbl IN SELECT unnest(ARRAY['news_articles','gallery','testimonials','website_pages','website_sections','website_settings','school_info','classes','admission_sessions'])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=tbl) THEN
      EXECUTE format('DROP POLICY IF EXISTS "Public read" ON public.%I', tbl);
      EXECUTE format('CREATE POLICY "Public read" ON public.%I FOR SELECT TO anon, authenticated USING (true)', tbl);
    END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Anyone can submit applications" ON public.admission_applications;
CREATE POLICY "Anyone can submit applications" ON public.admission_applications
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Public can upload docs" ON public.admission_documents;
CREATE POLICY "Public can upload docs" ON public.admission_documents
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Public can create payments" ON public.admission_payments;
CREATE POLICY "Public can create payments" ON public.admission_payments
  FOR INSERT TO anon, authenticated WITH CHECK (true);
