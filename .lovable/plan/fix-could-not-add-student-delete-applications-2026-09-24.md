# Fix "Could not add student" + delete applications

## Why the error appeared
The email **belloabdullateef@gmail.com** is already in use. It belongs to **Bello Abdul-lateef** (ALB/2026/0022), an active student currently in **BASIC 6**. The system won't create a second account with the same email. Right now the screen only says "Edge Function returned a non-2xx status code", which hides the real reason.

## 1. Clear messages when adding a student
- When the email is already used, show: "This email already belongs to Bello Abdul-lateef (ALB/2026/0022, BASIC 6)."
- Add a **Move this student to JSS 1** button inside that message. This fits the case where you're promoting or moving an existing student instead of creating a new one.
- Show every other failure in plain words (for example missing permission or a password that's too short) instead of the generic code.
- Fix the same thing in the other Add Student form on Student Management.

## 2. Delete applications (Admissions > Applications)
- Add a **Delete** option to each application row and inside the application details window. Also let you select several applications and delete them together.
- Before anything is deleted, a confirmation box shows the applicant's name and application number, and you have to type DELETE.
- Deleting an application also removes its documents, interview, exam booking, offer, payment records, and history.
- **Safety rule:** you can't delete an application once the applicant has been **enrolled** as a student. You'd need to archive the student instead. Applications with a confirmed payment show an extra warning.
- Only admins can delete. Each deletion is written to the Audit Log.

## Technical details
- `create-student`: return 409 `{code:'email_exists', existing:{user_id, full_name, admission_number, class}}` via a service-role lookup; the frontend reads `error.context.json()` (FunctionsHttpError) so it can show the message.
- `ClassRoster.tsx` + `SMS/StudentManagement.tsx`: parse the error. The "move" action updates `class_assignments` and `student_enrollments` for the existing student.
- New SECURITY DEFINER RPC `admin_delete_application(_ids uuid[])`: checks `has_role(auth.uid(),'admin')`, refuses when status = `enrolled` or the application is linked to a student, and deletes the rows (child tables already cascade). Uploaded document files are removed from storage on the client side after the RPC succeeds. EXECUTE is granted to authenticated only.
- `AdmissionManagement.tsx`: row checkbox, bulk bar, and an AlertDialog confirmation. The console warning about refs on `Dialog` in this file also gets fixed (a Dialog is passed where a ref-forwarding trigger is expected).
