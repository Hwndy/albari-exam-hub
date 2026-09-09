# Fix the dashboard error

The new admin overview screen fails to load and shows "aggregate functions are not allowed in GROUP BY".

## Cause

Inside the overview report, the six-month fee-collection section builds its result object and groups by that whole object at the same time. Because the object already contains a total, the database rejects the request, so the entire dashboard report fails and no cards or charts appear.

## Fix

Rewrite that part of the report so the monthly totals are calculated first, and the result object is built afterwards from those totals. The same pattern is checked for the attendance-trend and class-breakdown sections so they can't hit the same problem.

Nothing else changes: no data is touched and no screens are redesigned.

## Technical detail

Replace `public.get_dashboard_overview()` with a corrected version where the `fee_trend` CTE/subquery does `SELECT date_trunc('month', ...) AS m, sum(amount_paid) AS amt ... GROUP BY 1` and only wraps the rows in `jsonb_build_object` in an outer select. Verify the function runs without error before finishing.
