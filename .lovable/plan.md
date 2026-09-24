# Promotion page missing students + automatic student IDs

## What I found
- Student records and class placements agree for every class (e.g. SSS 1 A has 23 in both), so students are not lost.
- The class list contains near-duplicate classes: "JSS1B" (17 students) vs "JSS 1 B" (1), "JSS2A" (0) vs "JSS 2 A" (18), "JSS3 B", plus "Basic 1-6" alongside "Primary 1-6". Picking the wrong twin on the Promotion page shows few or no students. This is the most likely cause, but still needs confirming by opening the page signed in.
- The Promotion page also hides students with no name record and gives no hint when a class is empty.
- Adding a student from the class page never sends an admission number, and nothing in the database fills one in automatically, so new students can end up with no ID. The database already has a numbering routine (ALB/2026/0001 format) that is simply not being used on this path.

## Fix
1. **Promotion page**
   - Show the number of students next to each class in the class picker, and hide empty duplicate classes (keep them available with a "show empty classes" toggle).
   - Load students from both placement records (old class assignment and new campus/class/arm placement) so no one is missed.
   - Show students even when their name record is missing (fall back to admission number).
   - Clear message when a class truly has no students.
2. **Duplicate classes**: a small "Merge classes" action in Classes management to move all students/teachers from a duplicate (e.g. "JSS1B") into the correct class ("JSS 1 B") and retire the duplicate. You choose which to merge; nothing is merged automatically.
3. **Automatic student ID**
   - Database rule: any new student saved without an admission number automatically gets the next ALB/YYYY/NNNN number. Covers every entry point (class page, student management, teacher-created, admissions).
   - "Add student" forms show the number as "Auto-assigned" (still editable if you want a custom one); the student-management form no longer requires typing one.
   - One-off fill for existing active students with no number.

## Technical notes
- Migration: `BEFORE INSERT` trigger on `students` setting `admission_number := next_admission_number()` when null/blank; backfill via run_sql for active students with null numbers.
- `PromotionPanel.tsx`: union `class_assignments` (user_id) and current `student_enrollments.legacy_class_id` (students.id); class counts via one grouped query; name fallback.
- Merge action: RPC `merge_classes(from, to)` (admin-only) updating `class_assignments`, `student_enrollments.legacy_class_id`, `teacher_class_assignments`, `class_timetables`, then deleting/archiving the source class.
- `create-student` returns the assigned admission number for the success toast; `StudentManagement.tsx` drops the required check.
