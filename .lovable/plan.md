# Academic → Students (grouped by Class)

Add a new admin page under **Academic › Students** that lists all classes as collapsible groups. Clicking a class reveals its students with per-student actions matching the attached mockup.

## Navigation
- Add sidebar item `Students` under Academic (between `Classes` and `Subjects`), value `students`.
- Route it in `AdminDashboard.renderContent()` and `getPageTitle()`.

## New component: `src/components/admin/StudentsByClass.tsx`

Layout:
- Header row: page title + two buttons — **Add Student** and **Export Class List** (exports currently expanded/selected class as CSV; if none selected, prompts to pick).
- Search box (filters by name / admission number across all classes).
- Accordion list of classes (each row shows class name + student count).
- On expand: table of students with columns Photo · Full Name · Admission # · Gender · Status · Actions (kebab menu).

Per-student kebab menu (from attached image):
1. **View Profile** – opens a Dialog with full student details (profile, parents, class assignment, attendance summary if available).
2. **Update Photo** – Dialog with file input, uploads to `question-media` bucket path `students/<student_id>/avatar.<ext>` (or new bucket if needed; reuse existing to avoid migration). Saves public URL to `students.photo_url` (add column if missing — see Technical).
3. **View ID Card** – opens existing `IDCardGenerator` filtered to that student (or renders the same card preview in a dialog).
4. **Edit Profile** – opens existing `UserEditModal` prefilled with student's user.
5. **Delete Student** – AlertDialog confirm; calls a new edge function `delete-student` (service-role) that removes auth user + cascades profile/student/class_assignment rows. Falls back to soft-delete (`students.status = 'inactive'`) if hard delete fails.

## Add Student
Reuse the create flow from `TeacherStudentCreator` form (full name, email, password, class). Calls existing `create-student` edge function. Default class = the currently expanded class.

## Export Class List
Client-side CSV: `Admission #, Full Name, Gender, DOB, Status, Parent Name, Parent Phone`. Filename `<class-name>-students-<YYYYMMDD>.csv`.

## Data fetching
- `classes` filtered by `useSchoolQuery` ordered by name.
- For each class, fetch `class_assignments → students → profiles` (single batched query using `in('class_id', classIds)` then group client-side).
- Parent info via `student_parent_relationships → parents → profiles` (lazy, only when View Profile opens).

## Technical notes
- **Schema check needed**: confirm `students.photo_url` column exists. If not, a small migration adds `photo_url text`.
- **Storage**: photos go to existing `question-media` bucket under `students/<id>/...` to avoid creating a new bucket. RLS already restricts to school members.
- **Delete edge function**: new `supabase/functions/delete-student/index.ts` using service role; verifies caller is admin of the student's school via JWT.
- Multi-tenancy: every query goes through `useSchoolQuery`; new edge function enforces `school_id` match.
- No changes to existing exam/report-card flow.

## Out of scope
- Bulk import / promotion (already exist elsewhere).
- Editing parent linkages (separate screen).
