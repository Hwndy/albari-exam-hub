## Sprint D — Academics Depth

Focus: give teachers, students, and parents the day-to-day academic tooling that sits between attendance and report cards. Everything plugs into the existing `classes`, `subjects`, `class_assignments`, `teacher_class_assignments`, and `profiles` tables.

### 1. Homework / Assignments
New tables:
- `assignments` — `class_id`, `subject_id`, `teacher_id`, `title`, `instructions` (text), `attachment_url?`, `due_date`, `max_score?`, `is_published`.
- `assignment_submissions` — `assignment_id`, `student_id`, `submitted_at`, `content?`, `attachment_url?`, `score?`, `feedback?`, `graded_by?`, `graded_at?`.
- Storage bucket `assignments` (private) for teacher attachments + student uploads.
- RLS: teachers manage rows for their assigned classes; students read published assignments for their class and manage their own submission; parents read via `is_parent_of_student`; admins full access.

UI:
- Teacher: `src/components/teacher/AssignmentsManager.tsx` — list/create/edit assignments, view submissions, grade + feedback. New tab in `TeacherDashboard`.
- Student: `src/components/student/StudentAssignments.tsx` — upcoming/past assignments, submit dialog (text + file). New tab in `StudentDashboard`.
- Parent: read-only assignments card inside `ParentAcademics.tsx` (per selected child).

### 2. Lesson Notes / Scheme of Work
New table:
- `lesson_notes` — `class_id`, `subject_id`, `teacher_id`, `title`, `week_number?`, `term?`, `session_id?`, `content` (HTML/markdown), `attachment_url?`, `is_published`.
- Reuse `assignments` storage bucket (folder `lesson-notes/`).
- RLS mirrors assignments (teachers own; students/parents read published for their class; admins all).

UI:
- Teacher: `src/components/teacher/LessonNotesManager.tsx` — rich-text (existing textarea + sanitize on render), publish toggle. New tab in `TeacherDashboard`.
- Admin review: `src/components/admin/LessonNotesReview.tsx` — approve/reject flag column `approved_by`, `approved_at`, `review_notes` (optional; MVP just lets admin see & unpublish).
- Student/Parent: read-only viewer inside academics section.

### 3. Grading Scale (single source of truth)
- `grading_scales` table already exists. Seed the Al-Bari A–F scale via migration if empty, and add helper RPC `public.get_grade_for_score(score numeric)` returning `{grade, remark}`.
- Refactor `src/lib/report-card-html.ts` and `ManualScoresEntry.tsx` to call the RPC / read the table instead of any hardcoded ladders — one canonical scale used everywhere (report cards, gradebook, broadsheet).
- Admin editor: `src/components/admin/GradingScaleEditor.tsx` inside `SettingsHub` → new "Grading" tab.

### 4. Timetable → student/parent visibility polish
Small touch-ups only:
- Ensure `StudentTimetable` and a new `ParentTimetable` (per selected child) render from `class_timetables` for the child's class.
- Add "Today" filter chip.

### 5. Wiring & nav
- `TeacherDashboard`: add `Assignments`, `Lesson Notes` tabs.
- `StudentDashboard`: add `Assignments`, `Lesson Notes` tabs.
- `ParentDashboard` → `ParentAcademics`: add Assignments + Lesson Notes cards; add Timetable tab.
- `SettingsHub`: add `Grading Scale` tab.

### Technical notes
- Sanitize any HTML rendered from `lesson_notes.content` and assignment instructions with `dompurify` (already installed in Sprint C).
- File uploads: use signed URLs; validate mime + size client-side (max 10 MB).
- All new tables follow the required order: `CREATE TABLE` → `GRANT SELECT, INSERT, UPDATE, DELETE ON ... TO authenticated; GRANT ALL ... TO service_role;` → `ENABLE RLS` → policies using existing `is_teacher()`, `is_admin()`, `is_my_student_record()`, `is_parent_of_student()` helpers.
- No new secrets, no edge functions required for MVP (grading + submissions are pure DB).

### Deliverables checklist
```text
[ ] assignments + assignment_submissions tables + RLS + storage bucket
[ ] Teacher AssignmentsManager + Student/Parent views
[ ] lesson_notes table + RLS
[ ] Teacher LessonNotesManager + Student/Parent viewer
[ ] Grading scale seed + get_grade_for_score RPC
[ ] Refactor report card + manual scores to use canonical scale
[ ] GradingScaleEditor in SettingsHub
[ ] Parent/Student timetable views polished
[ ] Dashboard tabs + navigation wired
```

Approve to build.