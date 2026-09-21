CREATE OR REPLACE FUNCTION public.get_audit_logs(
  p_search text DEFAULT NULL,
  p_domain text DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  actor_id uuid,
  actor_name text,
  actor_email text,
  actor_role text,
  action text,
  domain text,
  table_name text,
  row_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  p_limit := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
  p_offset := GREATEST(COALESCE(p_offset, 0), 0);

  RETURN QUERY
  WITH filtered AS (
    SELECT al.*
    FROM public.audit_logs al
    WHERE (NULLIF(trim(p_domain), '') IS NULL OR al.domain = lower(trim(p_domain)))
      AND (NULLIF(trim(p_action), '') IS NULL OR al.action = lower(trim(p_action)))
      AND (NULLIF(trim(p_role), '') IS NULL OR al.actor_role = lower(trim(p_role)))
      AND (p_actor_id IS NULL OR al.actor_id = p_actor_id)
      AND (p_from IS NULL OR al.created_at >= p_from)
      AND (p_to IS NULL OR al.created_at < p_to)
      AND (
        NULLIF(trim(p_search), '') IS NULL
        OR concat_ws(' ', al.actor_name, al.actor_email, al.actor_id::text, al.actor_role,
          al.action, al.domain, al.table_name, al.row_id,
          COALESCE(al.before_data, '{}'::jsonb)::text,
          COALESCE(al.after_data, '{}'::jsonb)::text,
          COALESCE(al.metadata, '{}'::jsonb)::text
        ) ILIKE '%' || trim(p_search) || '%'
      )
  )
  SELECT f.id, f.actor_id, f.actor_name, f.actor_email, f.actor_role, f.action, f.domain,
    f.table_name, f.row_id, f.before_data, f.after_data, f.metadata, f.created_at,
    count(*) OVER () AS total_count
  FROM filtered f
  ORDER BY f.created_at DESC, f.id DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_audit_log_actors()
RETURNS TABLE (
  actor_id uuid,
  actor_name text,
  actor_email text,
  actor_role text,
  event_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  RETURN QUERY
  SELECT al.actor_id, max(al.actor_name) AS actor_name, max(al.actor_email) AS actor_email,
    max(al.actor_role) AS actor_role, count(*) AS event_count
  FROM public.audit_logs al
  WHERE al.actor_id IS NOT NULL
  GROUP BY al.actor_id
  ORDER BY lower(COALESCE(max(al.actor_name), max(al.actor_email), al.actor_id::text));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_audit_logs(text, text, text, text, uuid, timestamptz, timestamptz, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_audit_log_actors() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_audit_logs(text, text, text, text, uuid, timestamptz, timestamptz, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_audit_log_actors() FROM anon;