## Fix: admins/panel can't view application documents from Interview review

**Symptoms observed:** Modal shows "No documents uploaded yet" plus a red toast "Unable to load documents. Please contact support." on applications that actually have documents in the database (verified: APP2026-000014 has 1 doc, APP2026-000017 has 2). The toast fires from the `error.code === '42501'` branch in `AdmissionDocumentViewer.tsx`, meaning the SELECT is rejected at the database layer even though `has_table_privilege('authenticated', 'admission_documents', 'SELECT')` is true and an "Admins full access" RLS policy exists.

**Likely causes**
1. The signed-in reviewer is not (or not only) a `admin` — could be a teacher/panel member — so `is_admin()` returns false and no other SELECT policy matches, but the raw error PostgREST returns still surfaces as `42501` due to how the "Applicants can view their documents" policy's sub-select against `auth.users` fails for non-owner sessions.
2. Even for real admins the `Download` button hits the private `admission-documents` bucket with `storage.download(file_url)`. Currently `storage.objects` has a public SELECT policy but the client uses `download()`, which still fails if the object path stored in `file_url` includes the bucket prefix or is a full URL.

**Changes**

1. **DB migration**
   - Add a `SECURITY DEFINER` function `public.get_application_documents(p_application_id uuid)` that returns the `admission_documents` rows for one application when the caller is an admin OR has a row in `interview_panels` for an `admission_interviews` record tied to that application. `SET search_path = public`, `REVOKE ... FROM public`, `GRANT EXECUTE TO authenticated`.
   - Add a second SELECT policy on `admission_documents` mirroring the same check so future direct queries also work for panel members, not only admins.

2. **`AdmissionDocumentViewer.tsx`**
   - Call `supabase.rpc('get_application_documents', { p_application_id })` instead of querying the table directly.
   - Replace the generic "Please contact support" toast with the real error message (still logged), and only render the "No documents" empty state when the call succeeds and returns zero rows.
   - Rework `handleDownload` to (a) if `file_url` looks like a full URL, `window.open` it in a new tab; (b) otherwise call `supabase.storage.from('admission-documents').createSignedUrl(path, 60)` and open that — this survives whether the object path is stored with or without a leading `admission-documents/` segment. Fall back to `.download()` only if the signed URL call fails.
   - Add a "Preview" (open in new tab) button next to Download for images/PDFs.

3. **No functional or business-logic changes elsewhere.** Applicant-side upload, verify, and reject flows stay identical.

### Verification
- Sign in as the admin `suleayo04@gmail.com`, open APP2026-000014 → the 1 uploaded document renders and downloads.
- Sign in as an interview panel member for a scheduled interview → same modal now lists that application's docs.
- Applications with zero docs still show the "No documents uploaded yet" empty state with no red toast.