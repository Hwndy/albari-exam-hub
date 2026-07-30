## The problem (confirmed)

- 3 families already share one email across siblings: `rabiugaffarshola@gmail.com` (3 applications), `hasco4you35@gmail.com` (2), `youngyusuffali2@gmail.com` (2).
- Enrollment (`verify-acceptance-payment`) creates the student's login account **using the application email**. For a second sibling it hits "user already exists", reuses the first child's account, then reuses that child's student record — so the second child would silently get **no account and no student record**, and the first child's data could be overwritten.
- Only 2 applications are enrolled so far, so this is fixable before it spreads.

**Parents do NOT need to create new emails.** Sharing an email is normal and the system should support it.

## The fix: school-issued student login IDs

Students stop logging in with the family email. Each student gets a unique, school-issued login derived from their admission number, e.g.

```text
alb-2026-0007@students.albari.com.ng
```

This is a login identifier only (auto-confirmed, never needs to receive mail). All correspondence — offer letter, credentials, receipts, results — still goes to the parent's real email, which can be shared by any number of children.

### 1. Enrollment changes (`verify-acceptance-payment`)
- Build the login ID from the newly generated admission number; guarantee uniqueness with a numeric suffix if ever needed.
- Create the auth user with that login ID + temp password; never reuse an account found by family email.
- Reuse/idempotency keyed on `application.student_id` / application id, not email.
- Store the login ID on the application (new `login_email` column) so admins and re-sent emails always show the right value.

### 2. Parent account + sibling linking (automatic)
- On enrollment, look up (or create) a **parent** auth account for `application.email` with role `parent`.
- Insert a `student_parent_relationships` row linking that parent to the new child.
- Result: one parent login, all children visible in the parent portal — which is what these families actually need.
- If a parent account is newly created, include its credentials in the welcome email; if it already exists, the email says "use your existing parent login".

### 3. Emails
- Welcome/credentials email clearly separates:
  - **Student portal login:** the school-issued ID + temp password
  - **Parent portal login:** parent email + password (or "existing password")
- Sent to the parent email as today.

### 4. Repair the existing data
- Migration/backfill script: for each already-enrolled student, assign a login ID from their admission number, update their auth email, and create the parent link. Admin gets the new credentials to pass on.
- Admin screen shows, per application, a "shared email — sibling applications" badge listing the other applicants on that address, so nothing is mistaken for a duplicate submission.

### 5. Admin controls
- `StudentDetail`: display **Login ID** (school-issued) and **Contact email** (parent) as separate fields; keep the existing "reset password" button.
- Allow an admin to override a student's login ID if a student later has their own real email.

### 6. Application form
- Add a helper note under the email field: "You may use the same email for all your children — each child gets their own school login ID."
- Remove any implicit assumption that email identifies one applicant.

## Technical notes

- New column: `admission_applications.login_email` (text, nullable, unique index where not null).
- Login domain configurable in `app_settings` (default `students.albari.com.ng`) so it can change without a redeploy.
- `guard_enrolled_status` trigger and existing idempotency logic stay intact.
- No change to Paystack, offer-token, or report-card flows.

## Answer to your immediate question

No — do not ask parents to create new emails or edit their applications. The 7 affected applications will be handled automatically by the new login-ID scheme and the backfill.
