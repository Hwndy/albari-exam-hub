
## Root cause

`record_scan_by_ref` (and the earlier `record_student_scan`) inserts into `student_attendance` with a `date` column, but that table has no such column. Its shape is:

```
id, attendance_session_id, student_id, status,
marked_at, marked_by, notes,
scanned_at, scan_direction, scanned_by
```

The daily bucket is held on `attendance_sessions.date`, and each `student_attendance` row is expected to hang off an `attendance_session_id`. That's why scanning fails with `column "date" of relation "student_attendance" does not exist`.

## Fix

Rewrite the RPCs to work with the actual schema by introducing a "walk-in scan" attendance session per day per scanner:

- Add a helper `get_or_create_scan_session(p_date date)` (SECURITY DEFINER):
  - Finds or creates one `attendance_sessions` row per day used specifically for QR/ID scans (`class_id = NULL`, `subject_id = NULL`, `teacher_id = auth.uid()`, `period_number = 0`, `status = 'scan'`).
  - Returns its id.
- Update `record_scan_by_ref(p_ref, p_direction)`:
  - Resolves the student the same way (UUID token → active token; else admission number).
  - Calls the helper to get today's scan session id.
  - Inserts into `student_attendance` with `attendance_session_id`, `student_id`, `status='present'`, `marked_at=now()`, `marked_by=auth.uid()`, `scanned_at=now()`, `scan_direction=p_direction`, `scanned_by=auth.uid()`. No `date` column.
  - If a row already exists for that student in that session, update its `scan_direction`/`scanned_at` instead of inserting a duplicate (so a check-out after a check-in updates the same row).
- Update `record_student_scan(p_token, p_direction)` the same way so any older callers keep working.

No frontend changes needed — `ScanStation.tsx` already calls `record_scan_by_ref` and surfaces the returned error.

## Technical notes
- One migration: `get_or_create_scan_session`, plus `CREATE OR REPLACE` for `record_scan_by_ref` and `record_student_scan`. Grants unchanged (still `authenticated`).
- No data backfill needed.
