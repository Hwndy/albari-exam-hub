# Fix teacher roles and restore the user directory

## Confirmed findings
- The server-side staff-account function accepts `teacher`, removes the signup-created `student` role, and writes the requested role.
- The general registration flow still accepts a requested teacher role, but the database signup trigger intentionally converts self-service teacher/admin signups to `student`. That mismatch explains why a teacher can become a student when the wrong creation path is used.
- The user directory currently reads `profiles` directly, ignores errors from the profiles, roles, classes, subjects, and student queries, and falls back to displaying an unassigned profile as `student` when no role row is returned. A failed or restricted query therefore looks like an empty list or incorrect roles.
- The database contains role/profile inconsistencies: several role rows have no profile, and at least one user has both `student` and `parent` roles. Existing teacher/admin records will be checked before any repair is applied.

## Implementation
1. **Make account creation role-safe**
   - Restrict the general self-registration helper to the supported public roles and prevent it from attempting to create teacher/admin accounts.
   - Keep teacher/admin provisioning exclusively on the authenticated admin edge-function path.
   - Harden that path so it validates the requested role, removes any trigger-created fallback role, writes exactly the requested role, and verifies the final stored role before returning success.
   - Preserve atomic rollback: if role, profile, staff record, or assignment setup fails, remove the newly created auth account and return the actual failure.
   - Add a clear UI error when an admin attempts to use an unsupported account-creation path.

2. **Repair existing role records safely**
   - Inspect staff records and current role rows to distinguish genuine teachers, admins, students, and parents.
   - Apply only deterministic repairs: staff records marked/designated as teachers receive `teacher`, administrators receive `admin`, and stale trigger-created `student` rows are removed only when the staff record proves the account is staff.
   - Leave ambiguous multi-role accounts untouched and surface them for review rather than guessing.

3. **Replace the fragile user-directory read**
   - Add an admin-only `list-users` server action that authenticates the caller, verifies the admin role, paginates auth users, and joins non-sensitive profile, role, staff, student, parent, class, admission, and employee data.
   - Return one normalized row per account with the authoritative role, email, name, admission number, employee ID, class, status, and created date. Never return passwords, tokens, or private auth metadata.
   - Keep CSV export working against the same normalized account model so the on-screen list and export cannot disagree.

4. **Make the screen diagnose and display correctly**
   - Update the Users screen to use the normalized server response rather than assuming every auth account has a readable profile row.
   - Propagate query errors instead of silently converting them to an empty array.
   - Add visible loading, error/retry, and no-results states; search by name, email, admission number, or employee ID; and show the authoritative role badge.
   - Refresh the list after account creation, edits, deletion, and manual retry.
   - Keep the existing admin-only controls and user workflows intact.

## Verification
- Create a teacher from the admin Users screen and confirm the stored role is `teacher`, no fallback `student` role remains, and a staff record is present.
- Attempt the same request with a caller-supplied conflicting role and confirm the server rejects or ignores the conflict rather than creating a student account.
- Load the Users screen while signed in as an administrator and confirm existing students, teachers, admins, and parents are displayed with their correct roles.
- Confirm the list shows a useful error and retry action when its server request fails.
- Confirm search, role filtering, refresh, deletion/edit refresh, and CSV export still work.
- Run the project’s automatic validation and report authenticated verification separately from any check blocked by the external Supabase session.
