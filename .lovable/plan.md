# Quick cash payment entry in Finance

## Where cash is recorded today
Finance → Fees & Income → Student Balances → open a student → "Record Offline Payment"
(Cash, Bank transfer, Cheque, POS). It creates a completed payment with a receipt number
and it already counts in the finance reports. Non-fee cash goes to Finance → Other Revenue.

## What to add

### 1. "Record cash payment" button on the Payments tab
A prominent button at the top of Finance → Fees & Income → Payments that opens a dialog:
- Search and pick any student (name or admission number)
- Pick what the money is for: a fee item, or an installment from the student's plan
- Amount, payment method (cash / bank transfer / cheque / POS), date, notes/reference
- Shows the outstanding balance for the selected item so part-payments are obvious

Saving creates the same completed payment record as today, with an auto receipt number,
and refreshes the payments list.

### 2. Part-payments against installments
When an installment is chosen, the amount is added to that installment's paid amount and
its status becomes "partial" or "paid" depending on whether the balance is cleared.
Amounts above the remaining balance are blocked.

### 3. Print receipt right after saving
After a successful save, the branded A4 receipt opens for printing/download using the
existing receipt generator, so the parent can be handed a receipt on the spot.

## Technical notes
- New component `src/components/admin/fees/RecordCashPaymentDialog.tsx`, mounted from
  `PaymentsList.tsx` (and reusable from `StudentBalanceDrawer.tsx`).
- Writes to `fee_payments` (status `completed`, `paid_at`, `payment_date`, `receipt_number`,
  `payment_method`, `notes`); installment case also updates `fee_installments.paid_amount`
  and `status`.
- Receipt uses the existing `src/lib/receipt-pdf.ts` helper.
- No schema changes required.
