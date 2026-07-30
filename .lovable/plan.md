## What I verified

- **The enrollment did work.** Application `APP2026-000021` went `under_review → enrolled` at 12:20:16 (by the verify function, no user), then an admin account changed it **back to `accepted`** 30 seconds later at 12:20:46. The workflow log shows both entries. So the enrollment path sets `enrolled` correctly, but the admin UI let it be overwritten, and the board itself never refreshes/blocks that.
- **The password is generated but never emailed.** `verify-acceptance-payment` creates a random password and passes `temporary_password` to the notification function, but the `enrolled` email template literally prints *"Temporary Password: Will be sent separately"* and ignores the value.
- **Nothing in the enrolled email is editable.** Orientation date, first day, class, and the "Required Actions" list are hardcoded strings in the edge function; `AdmissionSettingsEditor` only has acceptance fee + note.
- **The `must_change_password` flag exists** on `profiles` and is already enforced by `AuthContext` + `ResetPasswordPage` — the acceptance-payment enrollment just never sets it.
- Side finding: `AdmissionManagement.enrollStudent()` is a second, older enrollment path that calls `auth.admin` from the browser, uses the *application number* as the admission number, and sends the welcome email with no password.

## The fix

**1. Status sticks at Enrolled on the admin dashboard**
- Guard against downgrades server-side: a trigger on `admission_applications` rejects any status change away from `enrolled` unless it is an explicit withdrawal, so no click or stale screen can revert an enrolled applicant.
- In the admin UI, once an application is `enrolled` the status controls become read-only (badge + "Enrolled" summary), removing the accidental revert.
- Add a realtime subscription (or refetch on focus) to the Applications and Pipeline tabs so a payment completing in the background flips the row to Enrolled without a manual reload.
- Repair the current record: set `APP2026-000021` back to `enrolled` (its student record already exists).

**2. Password actually reaches the applicant**
- The `enrolled` email template renders the real `temporary_password` when supplied, in a highlighted credentials block (email, admission number, temporary password), with a "sign in and change it immediately" note.
- `verify-acceptance-payment` sets `profiles.must_change_password = true` for the new student, so the existing forced-reset flow kicks in on first login.
- The legacy `AdmissionManagement.enrollStudent()` browser path is replaced by a call to the same server-side enrollment logic, so both routes produce identical credentials, admission numbers and emails.

**3. Admin can edit the welcome email content**
- New "Enrollment Email" section in Settings → Admissions, saving to `app_settings`:
  - Orientation date, first day of school
  - Portal login URL
  - Welcome intro paragraph
  - Editable "Required Actions" checklist (add/remove/reorder lines, each optionally with a link)
  - Support contact line
- The edge function reads these settings at send time and falls back to today's defaults when a field is blank. Class name is pulled from the applicant's assigned class instead of "As assigned".

**4. Required actions become real**
- *Change your password on first login* — enforced by the `must_change_password` flag above; the email links straight to the portal login.
- *Complete your student profile* — a "Complete your profile" prompt on the student dashboard until DOB/photo/contact are filled; the email links to it.
- *Review the fee structure* — email links to the student/parent fees view, and includes the acceptance-fee credit already applied.
- *Download the school calendar* — link to the public academic calendar page; the settings screen lets an admin swap in an uploaded calendar file URL.

## Technical notes
- Files: `supabase/functions/send-admission-notification/index.ts`, `supabase/functions/verify-acceptance-payment/index.ts`, `src/components/admin/AdmissionSettingsEditor.tsx`, `src/components/admin/AdmissionManagement.tsx`, `src/components/admin/AdmissionDecisionBoard.tsx`, plus a small student-dashboard profile-completion prompt.
- One migration: the enrolled-status guard trigger. All new email copy lives in `app_settings` rows (no schema change).
- Both edge functions redeploy; emails still send via the current Resend sender.
