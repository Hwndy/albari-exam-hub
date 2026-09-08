# Clear finance data

Wipe the finance records so you can start entering fees and payroll fresh. No backup is kept — this is permanent.

## What gets deleted

- **Fee payments and receipts** — all 3 recorded payments, plus any installment plans, installments and fee reminder history attached to them.
- **Fee items** — all 3 fee structures, including the duplicate lowercase "tution" ₦300,000 item.
- **Payroll** — all 3 payroll periods and their 51 staff pay lines.

## What is left untouched

- Students, classes, staff records and everything outside Finance.
- Expenses and Other Revenue (both already empty) and their categories, so your category list stays.
- Salary components (already empty).

## After this runs

- Student Balances shows every student with nothing billed and nothing paid.
- The Payments, Receipts and Installment Plans tabs are empty.
- Payroll starts from a clean slate, and Reports show zero income and zero expenses.
- Fee Structures is empty — add your fee items again per class before billing resumes.

## Technical details

Data-only deletion (no schema change), in dependency order:

```text
fee_reminder_logs -> fee_installments -> fee_installment_plans
-> fee_payments -> fee_structures
payroll_items -> payroll_periods
```

Also clears `paystack_webhooks` fee-related rows only if they reference deleted payments; otherwise left alone. No code changes required — existing screens already handle empty states.
