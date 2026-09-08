# Check-up after the class-structure changes: what still breaks

I checked the live data and the code paths around admissions, students, fees, teachers and reports.

## Good news (verified)

- The structure was applied: all 30 old classes mapped, 2 campuses, 17 class levels, 12 arms, 364 current placement records for 313 active students.
- Class rosters load again (the earlier error is gone).
- Billing still works for old students: when a student has no new-style placement, the bill falls back to their old class, so existing fee rules keep matching.
- Teacher screens, attendance, gradebook, exams, report cards and ID cards still read the old class list, which is untouched, so they keep working.

## The real gap: new students only land on one side

There are now two records of "which class a student is in" — the old class assignment and the new placement (campus + class + arm). Nothing keeps them in step, so:

1. **Students admitted through the website** (after paying the acceptance fee) get only the old class assignment. They will not appear in the new Students pages or class rosters, have no campus or arm, and any fee rule targeting campus, arm, class level or gender will skip them.
2. **Students created by a teacher** (Teacher → add student) get only the old class assignment — same problem.
3. **Students added from the new class roster page** get both, but their placement is created without an academic year, and if they are ever added twice they could end up with two "current" placements.
4. **Class changes made on the old screens** (edit student, promotion, bulk moves) update only the old assignment, so the new Students pages keep showing the previous class.
5. **Deleting/archiving a student** removes the old assignment but leaves the placement behind.

## The fix (end to end)

Keep both sides in step automatically, in the database, so every existing and future screen stays correct:

- When an old-style class assignment is created or changed, automatically create or update that student's current placement — deriving campus, class level and arm from the mapping table built during the structure migration. Existing placement history is preserved: the old row is closed and a new one opened, with a movement log entry on class or campus change.
- When a placement is created or changed from the new screens, keep the matching old-style class assignment in step, so teachers, attendance, gradebook, timetable and report cards immediately see the student.
- When a student is archived or deleted, close their placement too.
- Stamp every placement with the current academic year and guarantee only one current placement per student.
- Backfill: create placements for any student who currently has an old class assignment but no placement, and vice versa.

Then adjust the admission enrolment step so newly enrolled candidates also carry gender (already collected on the application) and boarding interest onto their student record, so gender-based fees (Friday wear, uniforms) apply from day one instead of showing up in the "Missing gender" list.

## Also worth fixing while here

- The new class roster's "Add student" writes the placement without an academic year — corrected by the same rule above.
- Students with no gender still block gender-targeted fees; the Missing gender screen already handles this, currently 4 students.

## Technical notes

- One migration: a trigger on `class_assignments` (insert/update) that upserts `student_enrollments` using `class_structure_map` (legacy_class_id → campus_code, level_name, arm_code) and logs to `student_movement_log`; a trigger on `student_enrollments` that mirrors `legacy_class_id` into `class_assignments` (keyed by `students.user_id`); a trigger on `students.archived_at`/status to close placements; a partial unique index on `student_enrollments(student_id) WHERE is_current`; academic year defaulted from the current `admission_sessions` row (`is_current` first).
- Backfill statements inside the same migration for both directions.
- `verify-acceptance-payment` and `paystack-webhook`: copy `gender` and boarding interest from the application onto the student row at enrolment; class placement then flows through the trigger.
- No changes needed to `preview_student_bill` / `student_billing_profile` — they already read the new fields with a legacy fallback.

## Not covered

The Supabase security linter still reports pre-existing warnings (security-definer functions exposed to signed-in users, leaked-password protection off). Unrelated to this work — tell me if you want a separate pass on it.
