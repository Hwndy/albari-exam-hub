# Fix staff onboarding and staff record editing

## What's actually broken (verified)

1. **Creating a teacher or admin from the Users page signs you out.**
   The screen creates the account with a normal browser sign-up call, which replaces the
   admin's own session with the brand-new account. The admin is effectively logged out
   mid-way, so the rest of the setup (subjects, classes) often never runs.

2. **Even when the account is created, it is never a teacher or admin.**
   The database rule that runs on every new sign-up only ever grants "student" or
   "parent" (self-service sign-up is deliberately locked down). So a staff member created
   this way lands in the system as a student, is invisible to the Staff Directory, and has
   no staff record.

3. **Editing a person's name never saves.**
   The profiles table only allows a person to edit their *own* name. There is no rule
   allowing an administrator to edit anyone else's, so the save reports success while
   changing nothing.

4. **New staff get no staff record.**
   Nothing creates the staff_details row at account creation, so a new hire only appears
   after someone remembers to press "Sync staff from accounts".

Staff Directory edits of department/designation/status/employee ID are permitted at the
database level; the failures reported there come from the same missing name-update rule
and from duplicate employee IDs being rejected with a raw database message.

## The fix

### 1. Server-side staff onboarding
A new admin-only server routine creates staff accounts properly:
- verifies the caller is a signed-in administrator,
- creates the account already confirmed with the temporary password the admin typed,
- grants the correct role (teacher or admin),
- writes the profile,
- creates the staff record with department, designation, join date, employment type and an
  auto-issued employee ID,
- writes class and subject assignments for teachers,
- rolls the account back if any step fails, and returns clear messages
  ("this email already exists", "password too short", and so on).

The Users page calls this instead of the browser sign-up, so the admin stays signed in.

### 2. Add Staff can onboard a brand-new person
The Staff Directory "Add Staff" dialog gains two modes:
- **Link existing account** (today's behaviour, for users who already have a login),
- **New staff member** — name, email, temporary password, role, department, designation,
  join date, employment type — which uses the same server routine above.

### 3. Administrators can edit names and staff details
- Add a database rule letting administrators update any profile.
- Staff Directory edit dialog also edits the person's full name and phone, shows a clear
  "that employee ID is already in use" message instead of a raw database error, and
  reports failures with a toast (today a failure can pass unnoticed).
- Add a "Reset password" action on a staff row using the existing password-update routine.

### 4. Consistency
- Staff Directory reloads after add/edit/reset.
- "Sync staff from accounts" stays as a repair tool for older accounts.

## Technical notes

- New edge function `supabase/functions/create-staff-user/index.ts` (service role, validates
  the caller's JWT and `has_role(admin)`; Zod-style input validation; `email_confirm: true`;
  upserts `user_roles`, `profiles`, `staff_details`, `teacher_class_assignments`,
  `subject_assignments`; deletes the auth user on failure). Registered in `supabase/config.toml`.
- Migration: `CREATE POLICY admins_can_update_profiles ON public.profiles FOR UPDATE TO
  authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'))`.
  No schema change otherwise — `staff_details` grants, RLS and the `set_employee_id`
  trigger are already correct.
- `src/components/admin/UserManagement.tsx`: replace the `create_user_with_profile` +
  `supabase.auth.signUp` path for teacher/admin (and student) with
  `supabase.functions.invoke('create-staff-user')`; keep the parent path unchanged.
- `src/components/admin/StaffManagement.tsx`: dual-mode Add dialog, name/phone in the edit
  form, duplicate-employee-ID handling, error toasts on fetch failures, reset-password action.
