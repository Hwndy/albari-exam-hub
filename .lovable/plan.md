## Goal
Make the school fees flow work cleanly on both sides: admins set fees, assign installment plans, and track who owes what; parents see clear balances per child, pay online (Paystack), and download receipts.

## Current gaps I found
- **Admin `FeeManagement`** (`src/components/admin/SMS/FeeManagement.tsx`): no installment plan creation, no per-student receivables view, empty Reports tab, no edit/delete of fee structures, no filter/summary of outstanding balances.
- **Parent side**: two overlapping components exist. `FeeManagementEnhanced.tsx` has a fake "Coming soon" button and is unused. `ParentFees.tsx` is the real one but has no receipt download, no plan enrollment, and no per-term filtering.
- **Reminders**: `send-fee-reminders` edge function exists but has no admin trigger UI.
- **Fee assignment**: only class-based `fee_structures`; no way to bill a single student one-off.

## What I'll build

### 1. Admin — rebuild Fee Management (tabbed)
Replace the current `SMS/FeeManagement.tsx` with a hub in `src/components/admin/fees/` split into focused pieces:

- **Overview**: total billed, collected, outstanding, this-month collections, count of overdue installments, top defaulters.
- **Fee Structures**: list + add/edit/delete. Fields: fee type, class (or "All classes"), academic year, term, amount, due date, mandatory flag. Fix current bug where new structure can't be class-agnostic.
- **Student Balances**: searchable table of every student with `Billed / Paid / Outstanding / Status`. Filter by class/year/term. Row action → open detail drawer showing per-fee breakdown, installment schedule, payment history, and buttons to (a) record offline payment, (b) create installment plan, (c) waive/adjust, (d) print statement.
- **Installment Plans**: create a plan for a student against a fee structure (N installments, start date, frequency monthly/termly). Auto-generates rows in `fee_installments` with due dates. List + edit/cancel existing plans.
- **Payments**: existing "Record Payment" flow, plus link a payment to an installment (currently only linked to structure). Filter, export CSV, reprint receipt via existing `FeeReceiptGenerator`.
- **Reminders**: pick class/year/term/overdue-only, preview recipients, then invoke `send-fee-reminders` edge function. Show `fee_reminder_logs` history.

### 2. Parent — polish `ParentFees.tsx`
- Add term/academic-year filter chips.
- Show per-fee breakdown of paid vs balance in one card, plus overall summary already present.
- If an installment plan exists for a fee, show it inline (already partly there) and hide the lump-sum "Pay" button in favor of installment buttons.
- Add "Download receipt" button on completed payments (reuses `FeeReceiptGenerator` in a print-friendly modal).
- Delete dead `FeeManagementEnhanced.tsx` and `parent/FeeManagement.tsx` (both unused after cleanup).
- Keep existing Paystack flow (`initialize-fee-payment` / `verify-fee-payment`) — no backend change needed.

### 3. Database (single migration)
- Extend `fee_structures` with `term text NULL` so billing can be per-term (Report cards already use terms).
- Extend `fee_payments` with `notes text NULL` for offline-payment context.
- Add `public.get_student_fee_summary(_student_id uuid)` SECURITY DEFINER function returning `{billed, paid, outstanding, next_due_date, next_due_amount}` — used by both admin balances table and parent overview to avoid N+1.
- Confirm/patch RLS: admins full access on all `fee_*` tables; teachers read-only; parents only for their linked children (already covered by existing policies — will verify and add anything missing).
- Grant `authenticated` the needed privileges (per project conventions).

### 4. Edge functions
- No changes to `initialize-fee-payment` / `verify-fee-payment` (already validated and working).
- `send-fee-reminders` already exists; wire the admin UI trigger and surface JSON errors properly.

## Technical notes
- Route stays `/admin?tab=fees`, but component becomes `<FeesHub />` in `src/components/admin/fees/FeesHub.tsx` with sub-tabs.
- Reuse existing `FeeReceiptGenerator.tsx` for printing receipts.
- All money formatted with existing `NGN()` helper.
- No changes to Paystack keys/secrets.

## Out of scope
- Bulk import of historical payments.
- Multi-currency / discounts / scholarships (can be added later as `fee_adjustments` table).
- Direct debit / recurring auto-charge.

## Rough file list
- New: `supabase/migrations/<ts>_fees_workflow.sql`
- New: `src/components/admin/fees/FeesHub.tsx`, `FeeOverview.tsx`, `FeeStructures.tsx`, `StudentBalances.tsx`, `StudentBalanceDrawer.tsx`, `InstallmentPlans.tsx`, `PaymentsList.tsx`, `RemindersPanel.tsx`
- Edit: `src/pages/AdminDashboard.tsx` (swap import), `src/components/parent/ParentFees.tsx` (polish + receipt download)
- Delete: `src/components/admin/SMS/FeeManagement.tsx`, `src/components/parent/FeeManagement.tsx`, `src/components/parent/FeeManagementEnhanced.tsx`
