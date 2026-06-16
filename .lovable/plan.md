# Students Page – Fixes & Enhancements

## 1. Fix "Upload failed: permission denied for table users"

**Cause.** Photo upload to `admission-documents/students/<user_id>/…` triggers Storage RLS. The existing policy *"Users can view their own application documents"* references `auth.users` directly, which `authenticated` cannot read — so the post-INSERT `RETURNING` fails with `permission denied for table users`.

**Fix (migration).**
- Rewrite that policy to use the existing `SECURITY DEFINER` helper `public.get_user_email()` instead of querying `auth.users` directly.
- Add a clean, admin-only storage policy pair scoped to `students/` prefix in `admission-documents`:
  - `INSERT/UPDATE/DELETE/SELECT` allowed when `bucket_id='admission-documents' AND foldername[1]='students' AND has_role(auth.uid(),'admin')`.

After this, photo upload from `StudentsByClass` works unchanged.

## 2. Bulk-assign admission numbers ("action buttons not working")

The kebab actions work, but most existing students have no `admission_number`, so the ID Card shows `—` and admins want to assign them in bulk.

Add a new header button **"Generate Admission Numbers"** on the Students page:
- Opens a dialog with format preview: `ALB/YYYY/####` (configurable prefix, year auto, 4-digit sequence per school).
- Lists students missing an `admission_number`, grouped by class, with checkboxes (all selected by default).
- On confirm: computes next sequence per school (max existing numeric tail + 1) and updates each selected `students` row.
- Per-row action **"Assign Admission #"** added to the kebab menu for single-student assignment.

Also extend the **Add Student** form so admins can enter (or auto-generate) an admission number at creation time — passed to the existing `create-student` edge function (server applies it to the `students` row).

## 3. Redesign the ID Card to match the uploaded artwork

Rebuild the ID Card dialog as a portrait card (≈ 320 × 540 px) that mirrors the reference:
- Top band: yellow/dark-green geometric shapes + diagonal stripes.
- School logo (circular) + school name + address on top row.
- Centered circular photo with dark-green ring.
- Faded school-building watermark behind the lower half.
- Bold uppercase student full name + `ID: <admission_number>`.
- QR code generated from a JSON payload (`{id, name, admission_no, school}`) using `qrcode` (already-suitable lightweight lib; add `qrcode` if missing).
- Bottom band: matching yellow/green geometric shapes.

Pulls school name/address/logo from `schools` (logo_url) + `school_info` (address). Print button uses an isolated print stylesheet so only the card prints.

A reusable `<StudentIDCard student={…} school={…} />` component renders the design and is used by both the dialog and (later) bulk printing.

## 4. Student Detail page

New route `/admin/students/:userId` (rendered inside `AdminDashboard`'s existing view system as a `student-detail` view).

Sections:
- **Header**: photo, full name, admission #, class, status badge, quick actions (Edit, Update Photo, View ID Card, Delete).
- **Personal**: gender, DOB, age, blood group, address, religion, nationality.
- **Academic**: current class/section, admission date, recent exam sessions (score, %, status) with link to result.
- **Attendance**: summary from `attendance_summary` (present/absent/late %).
- **Fees**: outstanding installments + recent payments from `fee_installments` / `fee_payments`.
- **Parents/Guardians**: list from `student_parent_relationships` → `parents` → `profiles` (name, phone, email, relationship).
- **Documents**: any items in `admission-documents/students/<user_id>/`.

Each row in the Students-by-class table becomes clickable (name links to the detail page); a "View Details" item is added to the kebab menu.

## Technical details

**Migration**
```sql
-- Replace policy that touches auth.users
DROP POLICY "Users can view their own application documents" ON storage.objects;
CREATE POLICY "Users can view their own application documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'admission-documents' AND (
    EXISTS (
      SELECT 1 FROM public.admission_applications aa
      WHERE aa.email = public.get_user_email()
        AND (storage.foldername(objects.name))[1] = aa.id::text
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Admin-scoped policies for students photo folder
CREATE POLICY "Admins manage student photos"
ON storage.objects FOR ALL
USING (bucket_id='admission-documents'
       AND (storage.foldername(name))[1]='students'
       AND public.has_role(auth.uid(),'admin'))
WITH CHECK (bucket_id='admission-documents'
       AND (storage.foldername(name))[1]='students'
       AND public.has_role(auth.uid(),'admin'));
```

**Files to add/edit**
- `supabase/migrations/<ts>_students_storage_fix.sql` — policies above.
- `src/components/admin/StudentsByClass.tsx` — add `Generate Admission #` header button + dialog, per-row "Assign Admission #" + "View Details", link names to detail page.
- `src/components/admin/AssignAdmissionNumbersDialog.tsx` — bulk/single admission # assignment.
- `src/components/admin/StudentIDCard.tsx` — new visual ID card component (uses `qrcode`).
- `src/components/admin/StudentDetail.tsx` — full detail page.
- `src/pages/AdminDashboard.tsx` + `src/components/ui/admin-sidebar.tsx` — wire `student-detail` view + navigation by `userId`.
- `supabase/functions/create-student/index.ts` — accept optional `admissionNumber`.
- `package.json` — add `qrcode` + `@types/qrcode` if not present.

**Out of scope**
- Bulk-printing all ID cards (can follow up).
- Editing parent records inline (open in Users page).
