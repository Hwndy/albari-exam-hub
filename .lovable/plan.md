## Goal
Give admins a dedicated area to manage everything related to parents and the parent portal, instead of the current single "Add Parent" entry inside Users.

## New admin surface: "Parents" tab in Admin Dashboard

Add a top-level `Parents` tab in `AdminDashboard.tsx` that renders a new `ParentsHub` component with 4 sub-tabs:

### 1. Parents (list)
`src/components/admin/parents/ParentsList.tsx`
- Table of all parent accounts: name, email, phone, # linked children, last sign-in, status.
- Search by name/email/phone. Filter: has children / no children.
- Row actions:
  - View details (opens Parent Detail drawer)
  - Edit profile (name, phone, notification prefs) — reuses `UserEditModal` pattern
  - Resend invitation (calls existing invite flow)
  - Reset password (calls existing `update-user-password` edge function)
  - Deactivate / delete account (edge function; cascades relationships)
- "Add Parent" button → reuses existing `create-parent-account` edge function via a dialog (same fields as current Users flow).
- CSV export of parent list.

### 2. Parent Detail (drawer/page)
`src/components/admin/parents/ParentDetail.tsx`
- Header: parent profile + contact.
- Sections:
  - **Linked children**: table with student name, admission #, class, relationship, permissions (grades/attendance/fees), verified flag. Actions: edit permissions, unlink (uses `admin_unlink_parent`), link another child.
  - **Fee activity**: recent `fee_payments` across all their children.
  - **Login activity**: last sign-in, account created.
  - **Notification preferences** (read-only view of `parents.notification_preferences`).

### 3. Child Links
`src/components/admin/parents/ChildLinks.tsx`
- All `student_parent_relationships` rows in one view — useful for auditing.
- Filter by class, verified/unverified, permission flags.
- Bulk actions: verify, unlink.
- "Link parent ↔ student" dialog using existing `admin_link_parent_to_student` RPC (search parent, search student, set relationship + permissions).

### 4. Announcements to Parents
`src/components/admin/parents/ParentAnnouncements.tsx`
- Thin wrapper around existing announcements creator, pre-filtering `target_audience` to `parent`/`all`.
- List of past parent-targeted announcements with edit/delete.

## Wiring
- Add `Parents` icon/tab in `AdminDashboard.tsx` nav.
- Route: keep inside dashboard tabs (no new URL) to match existing patterns; or add `/admin/parents` if the dashboard uses routes — will follow whatever `AdminDashboard.tsx` currently does.
- Remove the "Parent" option from the existing generic `UserManagement.tsx` Add User flow (or keep it and just link out to the new hub) — will keep it as a shortcut that opens the ParentsHub Add dialog to avoid duplicate code paths.

## Backend
No schema changes needed. Reuses:
- `create-parent-account` edge function (add)
- `admin_link_parent_to_student` RPC (link)
- `admin_unlink_parent` RPC (unlink)
- `update-user-password` edge function (reset)
- `parents`, `student_parent_relationships`, `profiles`, `fee_payments` tables

One new edge function: `delete-parent-account` — deletes auth user + cascades parent row & relationships (admin-only, mirrors `delete-student`).

## Out of scope
- Direct messaging parent↔admin (not implemented yet).
- SMS/email templates redesign.
- Changes to the parent-facing portal itself.

## Deliverables
- `src/components/admin/parents/ParentsHub.tsx`
- `src/components/admin/parents/ParentsList.tsx`
- `src/components/admin/parents/ParentDetail.tsx`
- `src/components/admin/parents/ChildLinks.tsx`
- `src/components/admin/parents/ParentAnnouncements.tsx`
- `src/components/admin/parents/AddParentDialog.tsx` (extracted from UserManagement)
- `src/components/admin/parents/LinkParentStudentDialog.tsx`
- `supabase/functions/delete-parent-account/index.ts`
- `AdminDashboard.tsx` — add Parents tab
