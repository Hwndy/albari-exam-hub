# Enrich the Users page CSV export with admission numbers, employee IDs, and full details

## Goal
The Users page (`src/components/admin/UserManagement.tsx`) already has an "Export CSV" button, but the file it produces only contains Full Name, Email, Role, School, Class, and Created Date. It does not include the **student admission number** or the **staff employee ID**, and it drops several other useful fields the database already holds. We will enrich the export so the CSV captures all user details.

## Current state (verified)
- `UserManagement.tsx` calls the `export-users` edge function and builds the CSV client-side from `data.users`.
- `supabase/functions/export-users/index.ts` currently returns per user: `full_name, email, role, school (hardcoded), class_name, created_at`. It fetches `profiles`, `user_roles`, `auth.users` (for email), and `class_assignments` (for student class name).
- The DB has the extra fields we need:
  - `students` → `admission_number`, `gender`, `date_of_birth`, `section`, `status`, `is_boarder` (keyed by `user_id`)
  - `staff_details` → `employee_id`, `department`, `designation`, `phone`, `employment_type`, `status` (keyed by `user_id`)
  - `parents` → `phone_primary` (keyed by `user_id`)

## Changes

### 1. `supabase/functions/export-users/index.ts` — return richer per-user data
After the existing `profiles` + `roles` + `class_assignments` + auth-email fetches, also fetch and join:
- `students`: select `user_id, admission_number, gender, date_of_birth, section, status, is_boarder` (no archived filter needed for an export — admins want to see everyone; include a flag so the CSV can show "Archived"). Build `studentMap` keyed by `user_id`.
- `staff_details`: select `user_id, employee_id, department, designation, phone, employment_type, status`. Build `staffMap` keyed by `user_id`.
- `parents`: select `user_id, phone_primary`. Build `parentPhoneMap` keyed by `user_id`.

Extend each returned user object with:
- `admission_number` (students) — empty string otherwise
- `employee_id` (staff/teachers) — empty string otherwise
- `phone` — `staff_details.phone` for staff, `parents.phone_primary` for parents, empty otherwise
- `department`, `designation`, `employment_type` (staff)
- `gender`, `date_of_birth`, `section`, `is_boarder` (students)
- `archived` boolean (students with non-null `archived_at`)
- Keep existing `full_name, email, role, school, class_name, created_at`.

No new tables, no RLS changes (the edge function runs with the service role key and already bypasses RLS).

### 2. `src/components/admin/UserManagement.tsx` — expand the CSV columns
Update `exportToCSV` so the CSV headers and rows include the new fields. New column order:

```
Full Name, Email, Role, Admission Number, Employee ID, Class, Phone,
Department, Designation, Gender, Date of Birth, Section, Boarding, Status, Archived, Created Date
```

Mapping (empty string when not applicable):
- Admission Number ← `user.admission_number`
- Employee ID ← `user.employee_id`
- Phone ← `user.phone`
- Department ← `user.department`
- Designation ← `user.designation`
- Gender ← `user.gender`
- Date of Birth ← `user.date_of_birth` (formatted, or empty)
- Section ← `user.section`
- Boarding ← `user.is_boarder ? 'Yes' : 'No'` (students only)
- Status ← `user.status`
- Archived ← `user.archived ? 'Yes' : 'No'`

Everything else stays the same (download filename, toast, loading state).

## Verification
- `npx tsgo --noEmit -p tsconfig.json` passes.
- Re-read the edited edge function and `UserManagement.tsx` to confirm the new fields flow end-to-end.
- Note for the user that, since this is an external (BYO) Supabase project, I cannot sign in to click the button myself — they should open Users → Export CSV and confirm the new columns appear.

## Not in scope
- No changes to the Users table UI, filters, stats, or add/edit/delete flows.
- No schema or RLS migration.
