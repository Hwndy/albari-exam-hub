# Why the fee item won't delete — and the fix

## What's happening

Each of the three fee items already has a recorded payment attached to it (including the "tution" 300,000 one). The system refuses to delete a fee item that money has been received against, because deleting it would orphan the receipt history. That's the red "Delete failed ... violates foreign key" message.

This is not a permissions problem, so an access code alone would not have helped. But you asked for one, so it's included for the safe cases.

## What I'll build

1. **Retire instead of delete (default).**
   Fee items that already have payments get a "Retire" action. A retired item:
   - stops being billed to students (disappears from Student Balances, parent portal, cash payment dialog),
   - keeps its past receipts and payment history intact,
   - shows in the list with a "Retired" tag and can be restored.

2. **Real delete stays available** for fee items with no payments at all.

3. **Access code confirmation.** Both "Delete" and "Retire" open a confirmation box that asks for the finance access code before it will proceed. The code is `4250645` unless you want a different one.

4. **Clear messaging.** If a delete is blocked, the screen says "3 payments recorded against this fee — retire it instead" rather than a database error.

5. **Show usage.** The Fee Structures table gains a small "Payments" count column so you can see at a glance which items are safe to remove.

## Note on the duplicate

The lowercase "tution" 300,000 item applies to all classes and is being billed on top of the 200,000 Tuition. Once retiring exists, retire it and every student's outstanding drops by 300,000 immediately.

## Technical details

- Migration: add `is_active boolean not null default true` to `public.fee_structures`.
- Filter `is_active = true` in the billing read paths: `StudentBalances.tsx`, `FeeOverview.tsx`, `StudentBalanceDrawer.tsx`, `RecordCashPaymentDialog.tsx`, `InstallmentPlans.tsx`, `ParentFees.tsx`. Fee Structures admin list shows all, with a status badge.
- `FeeStructures.tsx`: replace `confirm()` with an `AlertDialog` that requires the access code; count `fee_payments` and `fee_installment_plans` per structure on load to decide Delete vs Retire and to render the count column.
- Access code stored in `app_settings` (key `finance_delete_code`) so it can be changed later without a code edit; seeded with `4250645`.
