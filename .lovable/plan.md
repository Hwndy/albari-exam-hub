## Goal

Right now the acceptance fee is hardcoded at ₦50,000 in three places (the accept-offer page, the offer-letter edge function, and the admin offer dialog). Make it editable by an admin, and add a clear note that the acceptance fee is deducted from the child's school fees.

## What changes

**1. A configurable default fee (Admin > Settings)**
- Store the amount as an `app_settings` row (`acceptance_fee_amount`, default 50000), plus an editable note text (`acceptance_fee_note`, default: "This acceptance fee is deducted from your child's school fees.").
- Add an "Admissions" card in the Settings hub with a naira amount field and the note field, saved by admins only.

**2. Per-offer override (Admin > Admissions > Send Offer)**
- The Send Offer dialog gains an "Acceptance Fee (₦)" input, pre-filled with the configured default, so a specific applicant can be given a different amount.
- The amount is passed to the offer-letter function and saved on the offer record (the `admission_offers.acceptance_fee` column already exists) instead of the hardcoded 50000.

**3. Offer letter email/PDF**
- Show the actual fee amount from the offer, and add the deduction note under the payment instructions.

**4. Accept Offer page (public link)**
- Replace the hardcoded ₦50,000 in the "Admission Details" box and the "Next Steps" list with the fee stored on the offer (returned by the existing `get_offer_by_token` function, so it works for logged-out applicants).
- Add the note line: "This acceptance fee will be deducted from your child's school fees."
- Send the real amount to the payment initialisation instead of a fixed 50000.

**5. Fees ledger credit (so the note is true)**
- When an acceptance payment is confirmed and the student record is created, record the paid acceptance fee as a credit/payment against the student's fee account so their outstanding balance drops by that amount. Otherwise parents would be charged twice.

## Technical notes

- Migration: insert the two `app_settings` keys; extend `get_offer_by_token` to return `acceptance_fee` and the note so anonymous visitors can read them (app_settings itself is authenticated-only, so the value must travel via the offer record / function output).
- Files touched: `src/components/admin/SettingsHub.tsx`, `src/components/admin/OfferLetterGenerator.tsx`, `src/pages/website/AcceptOfferPage.tsx`, `supabase/functions/send-offer-letter/index.ts`, `supabase/functions/initialize-acceptance-payment/index.ts` (validate amount against the offer rather than trusting the client), `supabase/functions/verify-acceptance-payment/index.ts` (credit the fee ledger).
- Amount validation server-side: the payment function will use the offer's stored `acceptance_fee`, not the value posted from the browser.
