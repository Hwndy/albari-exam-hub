# Fix the Users CSV export: empty admission numbers, employee IDs, roles and classes

## What's wrong

The data is in the system — I checked: 364 students all have admission numbers, 51 staff all have employee IDs, and there are 367 class assignments and 453 role records.

The export builds a list of ~400 people, then asks the database for the matching students, staff, roles and classes by passing all 400 IDs at once in a single request. That request is too long, so it comes back empty instead of failing loudly. The function's own log confirms it: "Found 0 class assignments". Because nothing matched, every row falls back to blanks and the default role "student" — exactly what the uploaded file shows.

## The fix

Rewrite how the export gathers its data:

1. Load each supporting table in full (students, staff details, parents, roles, class assignments with class names) instead of filtering by a long list of IDs.
2. Read them in pages of 1000 rows so nothing is silently cut off by the database row cap.
3. Check and report errors for every one of these reads, so a failure shows a clear message instead of a file full of blanks.
4. Match records to people by user ID, then fill in admission number, employee ID, class, phone, department, designation, employment type, gender, date of birth, section, boarding, status and archived state.
5. Keep the CSV columns as they are.

After this, export again from Users → Export CSV and the admission number, employee ID, role and class columns will be populated.

## Technical notes

- File: `supabase/functions/export-users/index.ts`.
- Replace all `.in('user_id', userIds)` / `.in('student_id', userIds)` filters with unfiltered paginated fetches using `.range(from, from + 999)` in a `while` loop.
- Add error handling on the roles, class assignments, students, staff and parents queries.
- Role lookup should keep the first admin/teacher/parent/student role per user rather than defaulting silently; class lookup keeps using `class_assignments.student_id` → `profiles.user_id`.
- No frontend change needed; `UserManagement.tsx` column mapping already matches the returned fields.
