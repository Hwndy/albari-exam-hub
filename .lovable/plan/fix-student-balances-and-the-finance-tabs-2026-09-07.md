# Fix Student Balances and the finance tabs

## What is wrong

I checked the live data and the screens.

- Your fees are saved correctly: 30 fee items exist, 200,000 Tuition for every class (plus one stray item, see below).
- 312 active students exist.
- Student Balances still shows nothing because of how the page asks for the student-to-class link. The class list is stored against the student's login account, not the student record, so the request the page makes is rejected outright and the whole table comes back empty — not just the class column.

The same wrong link is used in three more places, which explains earlier problems too:

| Screen | Symptom today |
| --- | --- |
| Fees & Income → Student Balances | Empty table ("No students match") |
| Fees & Income → Overview | Billed/outstanding totals under-counted |
| Student balance drawer (eye icon) | Class never found, so class fees are missed |
| Record cash payment dialog | "No fees configured for this student's class yet" even when fees exist |

Tabs I checked that are fine as they are: Fee Structures, Installment Plans, Payments, Receipts, Reminders, Reconciliation.

## What I will do

1. Add one shared helper that resolves each student's class correctly (matching on the login account id, with a fallback to the student record id so old rows still work).
2. Use it in Student Balances, Fee Overview, the balance drawer and the cash payment dialog, so:
   - Student Balances lists all 312 students with class, billed, paid, outstanding and status.
   - The Overview totals reflect real billing.
   - Opening a student shows their class fees and lets you record a payment against a real fee item instead of falling back to "Other".
3. Show a clear error message on screen if the data request ever fails again, instead of an empty table that looks like "no students".
4. Flag one data cleanup for you: there is a fee item typed as "tution" with 300,000 and no class, so it is currently billed to every student on top of the 200,000 tuition. I will not delete it without your say-so — tell me and I will remove it, or you can delete it from Fee Structures.

## Technical notes

- `class_assignments.student_id` holds `auth.users.id` (verified: 363 of 366 rows match `students.user_id`, 0 match `students.id`). The PostgREST embed `students(...class_assignments(...))` returns `PGRST200` — no FK between the two tables — so `StudentBalances.tsx` and `FeeOverview.tsx` get `data: null`.
- New helper `fetchStudentClassMap()` in `src/lib/class-roster.ts`: one `class_assignments` select, keyed by `student_id`, mapped back through `students.user_id` (falling back to `students.id`), joined to `classes` for names.
- Update `src/components/admin/fees/StudentBalances.tsx`, `FeeOverview.tsx`, `StudentBalanceDrawer.tsx`, `RecordCashPaymentDialog.tsx` to use it; surface `error` from the queries in the UI.
- No schema or RLS change required.
