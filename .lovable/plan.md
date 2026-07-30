## What's wrong

Confirmed by reading the routers and the acceptance-payment flow:

1. `AcceptOfferPage` (mounted at the top level `/accept-offer/:token`) sends Paystack a callback of `${origin}/payment-callback`. That route only exists **inside** `WebsiteRouter`, which is mounted at `/website/*` — so the real path is `/website/payment-callback`. Paystack returns the applicant to `/payment-callback`, which hits the catch-all `NotFound` route → the 404 page.
2. Even on the correct page, the success screen only says "Payment verified successfully!" — it never shows the admission number, login email, or next steps, and `verify-acceptance-payment` doesn't return them.
3. `verify-acceptance-payment` enrolls unconditionally: if the Paystack webhook already enrolled the applicant (or the page is refreshed), it tries to create a second auth user + student record for the same application.

## The fix

**Routing**
- Add a top-level `/payment-callback` route in `App.tsx` pointing at `PaymentCallbackPage` (keeping the existing `/website/payment-callback` one so old links still work).

**Return enrollment details**
- In `verify-acceptance-payment`, before enrolling, check whether the application already has a `student_id` / `status = 'enrolled'`. If so, skip creation and just read the existing admission number.
- Include `admission_number`, `login_email`, `application_number`, and `student_name` in the JSON response (never the temporary password — that stays in the welcome email only).

**Confirmation screen**
- Update `PaymentCallbackPage` so the acceptance-fee success state shows a proper "Enrollment complete" card: student name, application number, **admission number**, login email, and a note that login credentials were emailed.
- Buttons: "Go to Student Login" (`/login`) and "Track Application".
- Keep the generic success message for application-fee payments (unchanged behaviour).

## Technical notes
- Files touched: `src/App.tsx`, `src/pages/website/PaymentCallbackPage.tsx`, `supabase/functions/verify-acceptance-payment/index.ts`.
- `PaymentCallbackPage` wraps content in `WebsiteLayout`, which renders fine at the top level too.
- No database migration needed; the idempotency guard is a read on `admission_applications` before the enrollment block.
