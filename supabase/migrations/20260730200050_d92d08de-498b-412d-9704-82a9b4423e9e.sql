CREATE OR REPLACE FUNCTION public.get_attendance_summary(p_start date, p_end date, p_class_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_rows jsonb;
BEGIN
  IF NOT public.is_teacher() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.full_name), '[]'::jsonb) INTO v_rows FROM (
    SELECT s.id AS student_id, p.full_name, s.admission_number, c.name AS class_name,
      COUNT(*) FILTER (WHERE sa.status='present') AS present,
      COUNT(*) FILTER (WHERE sa.status='absent') AS absent,
      COUNT(*) FILTER (WHERE sa.status='late') AS late,
      COUNT(sa.id) AS total
    FROM students s
    LEFT JOIN profiles p ON p.user_id = s.user_id
    LEFT JOIN class_assignments ca ON ca.student_id = s.id
    LEFT JOIN classes c ON c.id = ca.class_id
    LEFT JOIN attendance_sessions ses ON ses.date BETWEEN p_start AND p_end
    LEFT JOIN student_attendance sa ON sa.student_id = s.id AND sa.attendance_session_id = ses.id
    WHERE (p_class_id IS NULL OR ca.class_id = p_class_id)
    GROUP BY s.id, p.full_name, s.admission_number, c.name
  ) t;
  RETURN jsonb_build_object('rows', v_rows, 'start', p_start, 'end', p_end);
END; $function$;