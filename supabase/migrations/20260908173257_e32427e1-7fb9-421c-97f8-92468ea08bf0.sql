ALTER TABLE public.admission_documents ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.admission_applications ADD COLUMN IF NOT EXISTS nin text;

ALTER TABLE public.admission_documents
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason text;

UPDATE public.admission_documents
SET verification_status = 'verified'
WHERE verified IS TRUE AND verification_status <> 'verified';

ALTER TABLE public.admission_documents DROP CONSTRAINT IF EXISTS admission_documents_verification_status_check;
ALTER TABLE public.admission_documents
  ADD CONSTRAINT admission_documents_verification_status_check
  CHECK (verification_status IN ('pending','verified','rejected'));

CREATE OR REPLACE FUNCTION public.sync_document_verified()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.verified := (NEW.verification_status = 'verified');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_document_verified ON public.admission_documents;
CREATE TRIGGER trg_sync_document_verified
BEFORE INSERT OR UPDATE ON public.admission_documents
FOR EACH ROW EXECUTE FUNCTION public.sync_document_verified();

CREATE OR REPLACE FUNCTION public.set_document_verification(
  p_document_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS public.admission_documents
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.admission_documents;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can review documents' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('pending','verified','rejected') THEN
    RAISE EXCEPTION 'Invalid status %', p_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.admission_documents
  SET verification_status = p_status,
      rejection_reason = CASE WHEN p_status = 'rejected' THEN NULLIF(btrim(coalesce(p_reason,'')), '') ELSE NULL END,
      verified_by = CASE WHEN p_status = 'pending' THEN NULL ELSE auth.uid() END,
      verified_at = CASE WHEN p_status = 'pending' THEN NULL ELSE now() END
  WHERE id = p_document_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Document not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.set_document_verification(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_document_verification(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_document_verification(uuid, text, text) TO authenticated;