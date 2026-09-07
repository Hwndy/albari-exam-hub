# Fix "No fees configured for this student's class yet"

## What's actually happening

Two things, both confirmed against the live data:

1. **There are no fee structures saved at all** — the fee list in the database is completely empty (0 rows), so no student anywhere can be matched to a fee item.
2. **This student (ALB/2026/0093, abdulrazaq anjola) is not in any class** — even once fees exist, a class-specific fee would still not be found for this student.

So the dialog is telling the truth, but it's a dead end: there's no way forward from that screen, and no way to take the money in the meantime.

## What will change

1. **A cash payment can always be recorded.** A "Other / not listed" option is added to the fee dropdown, where you type what the payment is for (e.g. "Tuition part payment", "Uniform"). It saves as a completed payment with a receipt, and appears in Payments and the finance reports like any other.
2. **Clearer, actionable messages.** Instead of one vague line, the dialog says either "This student isn't assigned to a class yet" or "No fee items set up for [class name] yet", each with a shortcut button to the right place (assign the class / create a fee structure).
3. **The student's class is shown** next to their name in the dialog, so you can see at a glance when it's missing.
4. **Fees not tied to a class still show.** Fee items created as "All classes" will be offered even when the student has no class assigned — today they were being filtered out by the class matching.
5. **Set up the standard fees.** I'll walk you through creating your first fee structures (Tuition per term, etc.) in Finance → Fees & Income → Fee Structures, or seed the common ones if you tell me the amounts.

## Technical notes

- `RecordCashPaymentDialog.tsx`: fix the item query so the class-less case uses `class_id.is.null` alone rather than an `.or()` with a dummy UUID; add an `other` item kind that saves `fee_structure_id: null` with the description in `notes`/`metadata` (both columns are nullable, and the `validate_fee_payment` trigger only requires `amount_paid > 0`, so this is safe).
- Receipt generation via `src/lib/receipt-pdf.ts` uses the typed description as the line item for "Other".
- Distinguish empty states with the loaded `class_id`/`class_name` and the fetched structure count; add navigation buttons to the Fee Structures tab and the student record.
- No schema changes.
