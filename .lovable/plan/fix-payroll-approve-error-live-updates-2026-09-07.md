# Fix payroll "Approve" error + live updates

## What's wrong
Approving a payroll month fails with "Update failed … violates check constraint". Confirmed cause: the payroll screen sets a month's status to **approved**, but the database only accepts draft, processing, paid or closed for months (individual staff pay lines already accept "approved"). So the approve step is rejected every time.

## The fix
1. Allow "approved" as a valid month status in the database (keeping draft, processing, paid, closed).
2. Approve then works: month moves Draft/Processing → Approved → Paid → Closed, with approver and time recorded.

## Live updates
Make the payroll screens refresh by themselves so a change made anywhere (another admin, another tab, or the pay-run actions) shows up without a manual reload:
- Re-read the period list and the open period's pay lines right after every save, approve, or mark-paid.
- Subscribe to live database changes on payroll months and pay items while the payroll screen is open, and refresh the visible lists when something changes; unsubscribe when leaving the screen.

## Technical notes
- Migration: drop and recreate `payroll_periods_status_check` as `status IN ('draft','processing','approved','paid','closed')`.
- `src/components/admin/hr/PayrollHub.tsx`: after `advance()`, `markPaid()` and item saves, refetch periods and open-period items; add a `useEffect` Supabase Realtime channel on `payroll_periods` and `payroll_items` with `supabase.removeChannel` cleanup.
- Requires Realtime enabled for those two tables (`ALTER PUBLICATION supabase_realtime ADD TABLE ...`) in the same migration.
