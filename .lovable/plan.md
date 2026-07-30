## What's actually wrong

Confirmed from the database: the latest acceptance payment (`ACC-APP2026-000021-...`) is `completed`, but its application is still `under_review` with no `student_id`.

Cause: after Paystack returns, `PaymentCallbackPage` queries `admission_payments` to read `payment_type` so it can choose which verify function to call. The applicant is anonymous, and the RLS policies on `admission_payments` only allow reads by admins or by a signed-in user whose email matches the application. So the lookup returns nothing, the page falls back to `verify-admission-payment`, and that function unconditionally sets the application status to `under_review` — overwriting the accepted/payment_pending state and skipping enrollment entirely.

## The fix

**1. Stop guessing the payment type on the client**
- Route on the Paystack reference prefix instead of a blocked DB read: references are generated as `ACC-...` for acceptance fees and `ADM-...` for application fees. `PaymentCallbackPage` picks `verify-acceptance-payment` for `ACC-`, `verify-admission-payment` otherwise.

**2. Make the verify functions self-guarding (server-side truth)**
- `verify-admission-payment`: look up the payment's `payment_type` with the service role. If it is `acceptance_fee`, do not touch the status — hand the work to the acceptance logic and return the enrollment payload. Only set `under_review` for genuine `application_fee` payments, and only when the current status is an earlier stage (never downgrade `accepted`, `payment_pending`, or `enrolled`).
- `verify-acceptance-payment`: keep the existing idempotency guard; additionally treat an application already at `enrolled` as complete.

**3. Repair the stuck applicant**
- Re-run acceptance verification for the already-paid reference so that applicant gets their student record, admission number, class assignment, fee credit and welcome email — no manual data editing.

**4. Success page: "Payment Successful" + details + print**
- Rework `PaymentCallbackPage` into a receipt-style confirmation:
  - Header: "Payment Successful" with amount paid, payment reference, date, and method.
  - Details block: student name, application number, **admission number**, login email, class (when available), plus the note that login credentials were emailed and the acceptance fee has been credited towards school fees.
  - Buttons: **Print / Download Receipt** (browser print of a clean receipt layout with school name and logo), **Go to Student Login**, **Track Application**.
  - Application-fee payments get the same receipt layout minus the enrollment block.
- Verify functions return `amount`, `reference`, `paid_at`, and `payment_method` so the receipt shows real values.

## Technical notes
- Files: `src/pages/website/PaymentCallbackPage.tsx`, `supabase/functions/verify-admission-payment/index.ts`, `supabase/functions/verify-acceptance-payment/index.ts`. Both functions redeploy.
- No schema migration needed; the RLS read that fails is simply removed from the flow.
- Print uses a print-only CSS section (same approach as existing fee receipts) rather than a new PDF dependency.
