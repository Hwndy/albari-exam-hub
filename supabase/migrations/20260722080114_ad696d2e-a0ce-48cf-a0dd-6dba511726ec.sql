ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  table_name text,
  row_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view audit logs" ON public.audit_logs;
CREATE POLICY "Admins view audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Authenticated can insert audit" ON public.audit_logs;
CREATE POLICY "Authenticated can insert audit" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON public.audit_logs (table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.audit_sensitive_writes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := auth.uid(); v_email text; v_row_id text;
BEGIN
  BEGIN SELECT email::text INTO v_email FROM auth.users WHERE id = v_actor;
  EXCEPTION WHEN OTHERS THEN v_email := NULL; END;
  v_row_id := COALESCE((CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)->>'id' ELSE row_to_json(NEW)->>'id' END), '');
  INSERT INTO public.audit_logs (actor_id, actor_email, action, table_name, row_id, before_data, after_data)
  VALUES (v_actor, v_email, TG_OP, TG_TABLE_NAME, v_row_id,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE','INSERT') THEN to_jsonb(NEW) ELSE NULL END);
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_writes();

DROP TRIGGER IF EXISTS trg_audit_fee_payments ON public.fee_payments;
CREATE TRIGGER trg_audit_fee_payments AFTER INSERT OR UPDATE OR DELETE ON public.fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_writes();

DROP TRIGGER IF EXISTS trg_audit_admission_apps ON public.admission_applications;
CREATE TRIGGER trg_audit_admission_apps AFTER UPDATE OF status ON public.admission_applications
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_writes();

DROP TRIGGER IF EXISTS trg_audit_students ON public.students;
CREATE TRIGGER trg_audit_students AFTER INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_writes();

CREATE UNIQUE INDEX IF NOT EXISTS uq_fee_payments_reference
  ON public.fee_payments (payment_reference) WHERE payment_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_admission_payments_reference
  ON public.admission_payments (payment_reference) WHERE payment_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_admission_payments_transaction
  ON public.admission_payments (transaction_id) WHERE transaction_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_fee_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.amount_paid IS NULL OR NEW.amount_paid <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_fee_payment ON public.fee_payments;
CREATE TRIGGER trg_validate_fee_payment BEFORE INSERT OR UPDATE ON public.fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.validate_fee_payment();

CREATE OR REPLACE FUNCTION public.expire_old_qr_tokens()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.student_qr_tokens SET revoked_at = now()
  WHERE revoked_at IS NULL AND created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;

REVOKE EXECUTE ON FUNCTION public.delete_user_profile(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_user_with_profile(text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_link_parent_to_student(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_unlink_parent(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.transition_admission_status(uuid, admission_status, text) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.auto_assign_teacher_class()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role != 'teacher' THEN RETURN NEW; END IF;
  RETURN NEW;
END; $$;