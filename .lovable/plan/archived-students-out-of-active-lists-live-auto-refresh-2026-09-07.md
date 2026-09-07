# Archived students out of active lists + live auto-refresh

## What's wrong today

Archiving a student only stamps an "archived" date on their record. Nothing else in the app looks at that date, so the student keeps appearing in the class lists, rosters, fees, hostel and report-card pickers exactly as before. Only the Past Students page and the promotion screen check it.

Screens also only load data once, so a change made in one place (or by another staff member) isn't visible until the page is reloaded.

## What will change

1. Archived students disappear from every "active" list
   - Admin students by class, teacher class lists, gradebook and attendance rosters
   - Fees (balances, cash payment student picker, installment plans), hostel allocation/roll call/passes, report card and ID card pickers, bulk SMS student picker, parent linking dialogs
   - Counts and CSV exports follow the same rule
2. An "Archive student" action in the admin student list, with a reason, so a student can be archived without waiting for graduation. Restoring stays on the Past Students page.
3. Archived students remain fully visible on the Past Students page, and their historical records (payments, results, attendance) are untouched.
4. Auto-refresh: student, class assignment, fee payment and hostel allocation screens update themselves when records change — archive a student in one tab and the class list elsewhere updates without a reload.

## Technical notes

- Central helper in `src/lib/class-roster.ts` (plus a small shared `activeStudentsQuery` helper) applying `.is('archived_at', null)` to every student read; roster resolution keeps handling both `id` and `user_id` refs.
- Update the student-fetching call sites listed above; leave `PastStudents.tsx` and `PromotionPanel.tsx` logic as-is.
- Archive action in `StudentsByClass.tsx` / `StudentDetail.tsx` writing `archived_at` + `archived_reason`, mirroring the graduation path in `PromotionPanel.tsx`. Also set `status` to `archived` so badges read correctly.
- Live updates via `supabase.channel(...)` postgres_changes subscriptions inside `useEffect` with `removeChannel` cleanup, on `students`, `class_assignments`, `fee_payments`, `hostel_allocations`, plus refetch after every local mutation.
- No schema changes: `archived_at` and `archived_reason` already exist on `students`.
