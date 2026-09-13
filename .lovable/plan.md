# Record acceptance fee at the school office and enrol the applicant

Parents who pay the acceptance fee in cash or by bank transfer currently have no way through the system: enrolment only happens after an online Paystack payment. This adds an admin-side way to record that payment, which then runs the exact same enrolment the online payment runs — admission number, student login, class placement, credit against school fees and the welcome email.

## What the admin will see

In Admissions, on any applicant who has been offered a place (accepted, or awaiting payment):

- A **Record acceptance payment** action opens a small form:
  - Amount (pre-filled from the offer's acceptance fee, editable)
  - Method: cash, bank transfer, POS, cheque
  - Date received
  - Bank reference / teller number (optional) and a note
- On save, the applicant is enrolled immediately and the dialog shows the result: admission number, student login email and temporary password, with a copy button, plus confirmation that the welcome email has gone out.
- If the applicant was already enrolled, it says so and shows the existing admission number instead of creating a second record.

A matching **Record offline payment** button is added to the admission payments screen, and offline entries appear there alongside online ones with their method and reference, so the money is visible in one place.

## What happens behind the scenes

The enrolment steps are identical to the online path, so nothing about the workflow changes:

1. A completed acceptance-fee payment row is written for the application (marked as an offline payment, recorded by the admin who entered it).
2. The applicant gets a collision-free admission number, a school-issued student login, a profile with a forced password change, and a student record carrying gender, boarding interest, date of birth and contact details.
3. The student is placed in the admitted class (both the class assignment and the current enrolment records).
4. The acceptance fee is credited to the student's school fees, so it is deducted from the bill exactly as the offer promises.
5. The application moves to "enrolled" with the student linked.
6. The welcome email with login details is sent.

Re-running it on the same applicant is safe: it reuses the existing login, student record and fee credit rather than duplicating anything.

## Technical notes

- Extract the enrolment body of `supabase/functions/verify-acceptance-payment/index.ts` into `supabase/functions/_shared/enroll-applicant.ts` (service-role client + `application_id` + payment details in, enrolment summary out). The Paystack verify function and the webhook both call it, so all three paths stay in step.
- New edge function `supabase/functions/record-offline-acceptance-payment/index.ts`:
  - Validates the caller's JWT in code and requires `has_role(uid,'admin')`; rejects otherwise.
  - Zod-validated body: `application_id`, `amount`, `method`, `paid_at`, optional `reference`, `note`.
  - Inserts/updates `admission_payments` with `payment_type = 'acceptance_fee'`, `status = 'completed'`, `transaction_id = OFFLINE-<application_number>-<timestamp>` when no bank reference is supplied, and metadata recording the admin user id.
  - Calls the shared enrolment helper; returns the enrolment summary, or a clear error while leaving the recorded payment intact.
- Fee credit keeps the existing `transaction_id` guard in `fee_payments` so it cannot double-credit, and continues to attach to the admitted class's mandatory fee structure.
- Frontend: new `src/components/admin/admissions/RecordAcceptancePaymentDialog.tsx`, wired into `AdmissionManagement.tsx` / `AdmissionDecisionBoard.tsx` row actions and into `AdmissionPaymentVerification.tsx` as a toolbar button; both refresh their lists on success.
- No schema change is expected; `admission_payments` already carries amount, method, reference, status and paid_at.
