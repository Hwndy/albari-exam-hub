# End-to-end administrator audit log

## Goal
Give administrators one reliable audit workspace showing who changed what, when, and in which operational area, with server-side search and filters for admissions, payments, results, attendance, timetables, and staff accounts.

## User-facing work
- Add an **Audit log** entry under the admin System navigation at `/admin?tab=system&subtab=audit-logs`.
- Replace the current simulated/duplicated activity screens with one database-backed page.
- Provide:
  - free-text search across actor name, email, user ID, entity, row ID, action, and captured details;
  - domain filter: Admissions, Payments, Results, Attendance, Timetables, Staff accounts;
  - action filter: Created, Updated, Deleted;
  - role filter: Admin, Teacher, Student, Parent;
  - actor/user filter populated from known audit actors;
  - date presets plus custom start/end dates;
  - server-side pagination, refresh, empty/error/loading states, and CSV export of the currently filtered results;
  - a detail view for each entry with timestamp, actor, role, domain, action, affected record, changed fields, and before/after values.
- Keep the existing admin visual language and existing `tab`/`subtab` navigation contract.

## Database and security
Use a Supabase migration through the database migration tool; do not edit generated Supabase types or migration files manually.

1. Extend `public.audit_logs` with indexed actor display/role and domain fields (while preserving existing rows), and add indexes for created time, actor, role, domain, action, and table.
2. Harden the audit writer so the actor is always derived from `auth.uid()`, with a role snapshot from `public.user_roles` and a display name from `public.profiles`; never trust caller-supplied actor fields.
3. Add a domain mapping for the requested tables and attach audit triggers to the complete write surface:
   - admissions: applications, documents, interviews, offers, admission payments, and admission sessions;
   - payments: fee payments, student invoices, invoice adjustments, and admission payments;
   - results: grades, gradebook entries, assessment types, report-card publications, and promotion history;
   - attendance: student attendance, attendance sessions, staff attendance, and relevant scan records;
   - timetables: class timetables, timetable templates, and teacher/class timetable assignments;
   - staff accounts: profiles, user roles, and staff details.
4. Preserve existing audit history and avoid logging credentials, OTPs, tokens, or other sensitive secrets. Store only the fields needed to explain a change, with sensitive admission/account fields redacted in the audit snapshot.
5. Add an admin-only, `SECURITY DEFINER` read function for filtered, paginated audit results and a companion function for filter options/counts. The function will validate the caller with the existing server-side admin role check, return actor metadata, and apply all search/date/domain/action/role filters in SQL.
6. Grant only the required function execution/read access to authenticated users and keep the audit table admin-readable under RLS. Include explicit grants for any new public table or view created by the migration.

## Frontend implementation
- Create a typed audit query model matching the database function output, including JSON before/after snapshots.
- Build the page around the server-side query rather than downloading a large table and filtering in the browser.
- Debounce text search, reset pagination when filters change, and keep the last successful results visible during refresh.
- Render safe, readable diffs for changed fields and handle null/system actors without breaking the table.
- Export the filtered result set with escaped CSV values and a meaningful date-based filename.
- Wire the System route in `AdminDashboard.tsx`, the sidebar leaf in `admin-sidebar.tsx`, and the existing breadcrumb lookup.
- Consolidate or retire the existing fake `AuditLogs`/`EnhancedAuditLogs` behavior so administrators cannot be shown simulated visitor data or unrelated reconstructed exam activity.

## Verification
- Query the migration-created trigger/function definitions and confirm all requested domains are covered.
- Sign in as an administrator and verify the page loads, filters, pagination, detail view, and export.
- Exercise representative writes for each domain and confirm a row appears with the authenticated actor and correct role/domain/action.
- Confirm a non-admin cannot read audit data or invoke the search function.
- Confirm sensitive values are not exposed in before/after snapshots and existing historical rows remain readable.
- Run the project’s automatic validation and browser smoke-check the new admin route and mobile layout.
