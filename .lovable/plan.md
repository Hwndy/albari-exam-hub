# Parent portal onboarding and workflow plan

## Confirmed current state
- The active registration form no longer contains a registration-token step, and the signup backend does not use a token or school assignment.
- The screenshot’s `4250645` authorization screen is therefore a stale multitenancy flow. Restoring a raw public lookup would expose unnecessary school data and would not affect account provisioning.
- Parent self-registration already sends the `parent` role and phone number. The database signup trigger provisions `profiles`, `user_roles`, and `parents` rows.
- Parent login routing already sends a correctly provisioned parent to `ParentDashboard`.
- Two existing students can be used for an end-to-end linked-account test; both currently have no assigned class.
- The current admin “Add User” implementation only supports admin/teacher/student and performs a second client-side signup, which can replace the admin session. It is not suitable for parent creation.

## 1. Remove the stale registration-token blocker
- Locate and remove any remaining route, component, cached redirect, or service-worker artifact that can still render “Authorization Required.”
- Keep registration single-school and remove the dead token dependency rather than reopening anonymous access to the former schools data.
- Update the PWA/service-worker cache version if required so deployed clients stop serving the obsolete screen.
- Confirm `/auth?mode=register` opens the real role-based registration form directly on mobile and desktop.

## 2. Harden parent self-registration
- Keep `4250645` as a backward-compatible accepted code only if a token field still exists in any reachable client bundle during cleanup; it will not be used for tenant assignment.
- Validate parent name, email, phone, password, and confirmation client-side.
- Preserve server-side provisioning through `handle_new_user`: profile, parent role, and parent record must be created atomically.
- Remove the dangerous fallback that silently treats a missing role as `student`; show a clear account-setup error instead.
- After email confirmation, route parent login to the parent dashboard and display a clear empty-child state when no child is linked.

## 3. Add secure admin-created parent accounts
- Create a dedicated authenticated edge function for parent creation instead of calling `supabase.auth.admin` or `signUp` from the browser.
- Validate the caller’s JWT and admin role, then validate all parent inputs server-side.
- Create the auth user using the service client without modifying the caller’s session.
- Provision parent metadata through the existing signup trigger and verify the parent role/record exists.
- Support two secure onboarding modes:
  - Send an account invitation/password-setup email.
  - Create with a temporary password and force the parent through password reset before normal use.
- Extend Admin → User Management with a Parent role, phone field, optional student selection, relationship type, and access toggles for results, attendance, and fees.
- Link the selected student using the existing admin RPC after account creation; never trust a client-supplied parent identity without server authorization.

## 4. Create and link a working test parent
- Use clearly labelled test data rather than impersonating a real person.
- Link the test parent to an existing student with a valid admission number and date of birth.
- Because the available students currently have no class assignment, explicitly show “Not assigned” rather than implying the parent linkage failed.
- Do not expose a password in source code, logs, documentation, or chat; use invitation/password setup or a one-time reset flow.

## 5. Complete the parent-side workflow
- Verify child switching for one and multiple linked children.
- Verify parent access controls for results, report-card publications, attendance, fee balances, installments, and payment history.
- Ensure report cards respect the relationship’s grade-access flag and provide a usable open/download action when a published report exists.
- Filter announcements to parent/all audiences; label unfinished messaging surfaces accurately instead of presenting inactive controls.
- Verify the Paystack initialization path exists and that the authenticated parent can only initiate payment for a linked child.

## 6. Create the explanatory file
Create `PARENT_WORKFLOW.md` covering:
- Parent self-registration and email confirmation.
- Parent login URL and dashboard routing.
- Admin-created parent invitation/password setup.
- How to link one or multiple children using admission number + DOB or the admin interface.
- What each parent dashboard section shows.
- Relationship access flags and RLS protection.
- Fee payment and callback flow.
- Common support issues: wrong DOB, missing parent role, no class assignment, unpublished results, no configured fee structure, and payment initialization errors.
- A short admin checklist for onboarding a parent safely.

## 7. End-to-end verification
- Self-register a parent and confirm the auth user, profile, parent role, and parent row are all created.
- Log out and log back in; confirm routing to the parent dashboard.
- Admin-create a second parent and confirm the admin session remains intact.
- Link a child through both parent self-service and admin-assisted paths; attempt an invalid admission number/DOB and confirm no link is created.
- Verify a parent cannot read or pay for an unlinked student.
- Verify results, attendance, fees, payment history, announcements, child switching, and profile settings at desktop and mobile widths.
- Re-run focused auth/RLS checks and confirm no service key or temporary password reaches frontend code.