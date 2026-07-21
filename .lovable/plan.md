
## Goal
Remove all mention of the ₦50,000 acceptance fee from the offer letter PDF and the offer email — applicants should see only the offer and next steps.

## Changes to `supabase/functions/send-offer-letter/index.ts`

**PDF (`generateOfferLetterPDF`):**
- Delete the "Acceptance Fee: ₦50,000.00" line
- Shrink the Admission Details box (currently 50mm tall) to fit the remaining rows
- Update Next Steps: drop step 2 ("Pay the acceptance fee…") and renumber

**HTML email body:**
- Remove the "Acceptance Fee" row from the admission details table (both the primary block and the duplicated legacy block still in the template)
- Change CTA button label from "Accept Offer & Pay Fee →" to "Accept Offer →"
- Remove the "If you accept, you'll be directed to pay the acceptance fee (₦50,000)" step from the Next Steps list
- Remove the "The acceptance page includes a secure payment button" caption under the button

**Database record:**
- Leave `acceptance_fee: 50000` on the `admission_offers` insert as-is (it's a stored field, not displayed to the applicant here). If you also want it zeroed / dropped from the schema, say so and I'll add that.

## Out of scope (unless you say otherwise)
- The `AcceptOfferPage` and `initialize-acceptance-payment` / `verify-acceptance-payment` edge functions still reference the fee. Since your message is scoped to the offer letter, I'll leave those alone.
