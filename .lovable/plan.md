## Plan

1. **Fix the data/RLS blockers first**
   - Add a migration to make `students.admission_number` optional so new students can exist before admission numbers are assigned.
   - Backfill missing `students` rows for existing student profile/class assignments, because the live database currently has class-assigned student users but no rows in `students`.
   - Replace recursive student/parent RLS checks with security-definer helper functions so the Students page can load without `infinite recursion detected in policy for relation "students"`.
   - Ensure admin/student update policies support editing student rows, photo URLs, and admission number assignment safely within the same school.

2. **Repair admission number assignment**
   - Update `create-student` so it no longer silently succeeds when the student row fails to create.
   - Update the assign dialog to show exact failures instead of “0 updated” with no actionable error.
   - Keep bulk + single assignment using the `PREFIX/YEAR/####` format, and refresh the list after assignment.

3. **Repair student editing**
   - Replace the generic user edit flow for student rows with a student-focused edit dialog that updates:
     - full name
     - class assignment
     - admission number
     - gender
     - date of birth
     - status
     - section/registration number/basic details already present in the schema
   - Preserve school isolation on all reads/writes.

4. **Fix Student Detail data loading and empty states**
   - Correct `attendance_summary` lookup to use the internal `students.id` because that table references `students.id`, not the auth `user_id`.
   - Keep exam results lookup by auth `user_id`, because `exam_sessions.student_id` references `profiles.user_id`.
   - Correct `fee_payments` lookup to use `students.id`.
   - Add clear empty states for attendance, recent exam results, fee payments, parents/guardians, and missing profile/student records.

5. **Redesign Student ID Card to match the reference**
   - Rebuild `StudentIDCard` as a portrait card closer to the attached design:
     - school logo and school name/address at the top
     - green/yellow/charcoal geometric bands
     - large circular student photo frame
     - faint school-building style background/watermark effect
     - bold centered student name and `ID: admission_number`
     - large QR code beneath
   - Use the existing `/albari_logo.jpg` fallback when the school logo URL is missing.
   - Keep the blurred/covered face area out of consideration and preserve actual uploaded student photo when available.

6. **Fix printing/export so only the card is exported**
   - Update print CSS so `window.print()` hides the dialog/app chrome and prints only the ID card at the correct portrait dimensions with colors preserved.
   - Add a PNG download/export action for the currently previewed ID card using `html2canvas`, so printing and exporting do not capture the modal/background.

7. **Update export parameters for class lists**
   - Expand class CSV export to include useful student list fields: S/N, admission number, full name, class, gender, date of birth, status, section, and registration number where available.
   - Keep filename based on class name and date.

8. **Test/validate after implementation**
   - Use Supabase read checks to confirm existing student rows were backfilled and admission-number candidates exist.
   - Use the preview/session where available to verify:
     - Student Detail loads attendance/exam/fee sections and empty states correctly.
     - Admission number assignment updates rows.
     - Student editing saves changes.
     - ID card preview visually matches the reference more closely.
     - Print/export targets only the card.