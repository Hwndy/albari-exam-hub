## 1. Student profile: upload a photo instead of pasting a URL

`ProfileCompletionPrompt` (shown on the student dashboard after first login) currently asks for a "Passport Photo URL" text field. Replace it with an upload control:

- Reuse the existing upload pattern from `ImageUrlInput` (validated file picker → Supabase Storage → public URL), extracted into a small student-facing photo uploader with an avatar preview, "Upload photo" and "Remove" buttons. Accept images only, with the existing size/MIME guard.
- Files go to the existing public bucket under a `students/<user_id>/…` prefix; the resulting URL is saved to `students.photo_url` exactly as today.
- Add a storage RLS policy so an authenticated student may upload/replace files only under their own `students/<their user id>/` prefix (admins keep full access).
- Apply the same uploader to the admin `EditStudentDialog` "Photo URL" field so both sides behave consistently (URL paste still allowed as a secondary option there).

## 2. Student timetable: "You are not assigned to any class yet"

Verified in the database: the enrolled students *do* have `class_assignments` rows (keyed by auth `user_id`). Two things block the student from seeing them:

- **`class_assignments` has only one policy — `Admins full access`.** A logged-in student cannot read their own assignment row, so the timetable component's lookup returns nothing and shows the "contact your administrator" message.
- **`class_timetables`' student policy is joined wrong**: it does `class_assignments ca JOIN students s ON s.id = ca.student_id WHERE s.user_id = auth.uid()`, but `class_assignments.student_id` stores the **auth user id**, not `students.id`. So even with the assignment readable, no timetable rows would match.

Fixes:
- Add a SELECT policy on `class_assignments` letting a student read rows where `student_id = auth.uid()` (and teachers/admins keep their access), plus the matching `GRANT SELECT` to `authenticated`.
- Correct the `class_timetables` student SELECT policy to match on `ca.student_id = auth.uid()` (tolerating both `students.id` and `user_id` forms so no existing data breaks).
- In `StudentTimetable.tsx`, replace `.single()` with `.maybeSingle()` (a student with two rows currently throws) and distinguish "no class assigned" from "class assigned but no timetable published yet", so the message is accurate.

## Verification
Sign in as the newly enrolled student in a browser session, confirm the timetable renders their class schedule, then upload a profile photo and confirm it appears on the profile and on the ID card.
