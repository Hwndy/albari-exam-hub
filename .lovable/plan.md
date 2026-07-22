## Goal
Give admins a tool to reconcile Paystack transactions against `fee_payments` — either by pulling directly from the Paystack API for a date range, or by uploading a Paystack CSV export. The tool matches transactions by reference, flags mismatches, and lets admins fix them in one click.

## New: Reconciliation tab in Fees Hub
Add a `Reconciliation` tab in `src/components/admin/fees/FeesHub.tsx` backed by a new `src/components/admin/fees/Reconciliation.tsx`.

### Source selector
- **From Paystack API**: pick date range (from/to), click "Fetch". Calls new edge function `paystack-reconcile` which lists transactions via `GET https://api.paystack.co/transaction?from=&to=&perPage=100&page=N` (paginated server-side until done). Returns normalized rows.
- **From CSV upload**: file input accepting Paystack's standard CSV export (columns: `Reference`, `Amount`, `Status`, `Paid At`, `Customer Email`, `Channel`, `Currency`). Parsed client-side with `papaparse` (already patterned in project). Normalized to the same row shape as the API result.

### Matching engine (client-side after fetch)
For each Paystack row, match to `fee_payments` by `payment_reference`. Classify:
- **Matched & consistent** — reference found, both amounts equal (kobo→naira compared), both `success`/`completed`. Green.
- **Matched, needs update** — reference found but our record is `pending`/`failed` while Paystack is `success`, OR amount differs, OR missing `receipt_number`/`paid_at`. Amber.
- **Paystack only (orphan)** — reference not in `fee_payments`. Blue. Likely a payment made outside the app flow or a lost callback.
- **Our record only (unreconciled)** — `fee_payments` row with status `pending` older than X hours whose reference isn't in the Paystack batch. Red. (Loaded separately with a second query bounded to the same date window.)

### Actions per row
- **Reconcile** (amber): updates the matching `fee_payments` row via edge function — sets `status='completed'`, `paid_at`, `payment_date`, generates `receipt_number` if missing, and if `fee_installment_id` present marks the installment `paid`. Reuses the exact update path from `verify-fee-payment` so behaviour is identical.
- **Mark failed** (red unreconciled): sets `status='failed'` with an audit note.
- **Ignore** (orphan / row user doesn't own): stores a dismissal in local state only (no persistence needed for MVP).
- **Reconcile all** bulk button for amber rows.

Every server-side write goes through the edge function so the service role can bypass RLS safely, and every action is recorded via a note in `fee_payments.notes` (e.g. `Reconciled from Paystack API by admin @ 2026-07-22`).

## Edge function: `paystack-reconcile`
`supabase/functions/paystack-reconcile/index.ts`, `verify_jwt = true`.

Actions (single function, `action` field in body):
1. `list` — `{ from: ISO, to: ISO }` → paginates Paystack `/transaction` and returns `[{ reference, amount, status, paid_at, customer_email, channel }]`. Uses `PAYSTACK_SECRET_KEY`.
2. `verify` — `{ reference }` → calls `/transaction/verify/:ref`, returns normalized row. Used by "Re-verify" single-row action.
3. `apply` — `{ reference, amount, paid_at }` → updates `fee_payments` (same logic as `verify-fee-payment` but admin-scoped and skips `parent_user_id` guard). Requires caller has `admin` role (checked via `has_role` RPC using the caller's JWT).
4. `mark_failed` — `{ payment_id, reason }` → sets `status='failed'`, appends note.

All actions validate input with Zod, log via `console.error` with reference context, and return provider errors verbatim (per project convention).

Config change: add `[functions.paystack-reconcile] verify_jwt = true` to `supabase/config.toml`.

## No database migration needed
`fee_payments` already has `notes`, `payment_reference`, `status`, `receipt_number`, `paid_at`, `payment_date`, `fee_installment_id`. Reconciliation writes those existing columns.

## Files
- New: `supabase/functions/paystack-reconcile/index.ts`
- New: `src/components/admin/fees/Reconciliation.tsx` (source picker, match table, per-row + bulk actions)
- Edit: `src/components/admin/fees/FeesHub.tsx` (add tab)
- Edit: `supabase/config.toml` (register function)

## Out of scope
- Persistent reconciliation history log table (can add later if needed).
- Auto-creating a `fee_payments` row for pure Paystack-only orphans — surfaced but not created, since we can't guess the student/fee_structure. Admin can copy the reference into the existing "Record Payment" flow.
- Refund handling.
