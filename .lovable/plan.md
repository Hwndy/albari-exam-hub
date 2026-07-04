# Remove Multitenancy — Al-Bari Only

Goal: strip every multi-school concept (super admin, school switcher, `school_id` scoping, `schools` table) and dedicate the entire app to Al-Bari Model Schools (`bbe68d9f-b5b4-481e-81d9-0766f4e030da`).

This is destructive and irreversible. Rolling back means restoring from the History tab.

---

## 1. Data cleanup (destructive)

For every table that has a `school_id`, delete rows where `school_id != 'bbe68d9f-…'`. Then drop other schools from `public.schools`.

Order matters (children before parents). Roughly:
- admission_workflow_logs, admission_documents, admission_payments, admission_offers, admission_interviews, admission_exam_assignments, admission_applications, admission_sessions
- gradebook_entries, grades, grade_comments, report_card_comments, report_card_publications, result_automation_settings, assessments, assessment_types, grading_scales, promotion_history
- exam_sessions, question_responses, exam_questions, questions, question_options, question_banks, exams
- student_attendance, attendance_sessions, attendance_summary, staff_attendance, staff_details
- class_timetables, timetable_templates, periods, rooms
- book_issues, library_books
- fee_payments, fee_installments, fee_installment_plans, fee_structures, fee_reminder_logs
- notification_queue, notification_templates, email_logs, announcements, academic_calendar
- news_articles, gallery, testimonials, website_pages, website_sections, website_settings, school_info
- student_id_cards, student_parent_relationships, parents, students
- teacher_class_assignments, subject_assignments, class_assignments, subjects, classes
- profiles (delete profiles whose `school_id != Al-Bari` AND is not the super admin; then reassign the super admin's `school_id` to Al-Bari — see step 2)
- schools: `DELETE WHERE id != 'bbe68d9f-…'`

Also purge `auth.users` rows that belonged to other schools' profiles (via edge function or a service-role SQL block in the migration using `auth.admin_delete_user` equivalent — safest to just delete profiles + user_roles and leave orphaned auth rows; call out to user).

## 2. Schema simplification

- Reassign the current super admin: `UPDATE profiles SET school_id = 'bbe68d9f-…' WHERE school_id IS NULL AND user_id IN (SELECT user_id FROM user_roles WHERE role='admin')`.
- Drop helper functions `is_super_admin`, `is_user_super_admin`, `create_super_admin`, `get_user_school_id`, `is_same_school`, `auto_populate_school_id_*`, and the triggers that call them.
- Rewrite every RLS policy that references `school_id` / `is_super_admin()` / `get_user_school_id()` to drop the school clause (keep the role/ownership clause). Do this table-by-table across all ~60 tables.
- Drop `school_id` columns from every table (and any indexes/FKs on them).
- Drop `public.schools` table entirely.
- Drop `profiles.school_id`.

## 3. Frontend removal

Delete files:
- `src/contexts/SchoolContext.tsx`
- `src/hooks/useSchoolQuery.ts`
- `src/lib/school-utils.ts`
- `src/components/shared/SchoolSwitcher.tsx`
- `src/components/admin/SchoolManagement.tsx`
- `src/pages/SuperAdminDashboard.tsx`
- `src/components/ui/super-admin-sidebar.tsx`
- `supabase/functions/create-school/`

Edits:
- `src/App.tsx`: remove `SchoolProvider`, remove `SuperAdminDashboard` import + branch, remove `/super-admin` redirect, drop the super-admin check in `DashboardRouter` — admins always land on `AdminDashboard`.
- Every component using `useSchool` / `useSchoolQuery` (grep across `src/`): remove the hook, drop `school_id` from selects/inserts/updates, remove `withSchoolFilter`/`withSchoolData` wrappers. Affects a large set of admin/teacher/parent/website components — will handle in bulk find-and-replace.
- Edge functions that read/write `school_id` (create-student, create-school-admins, admission functions, offer/payment functions, bulk email/SMS, send-fee-reminders, track-application, submit_admission_application RPC): drop the `school_id` param and column write. The `submit_admission_application` RPC and `get_application_tracking` RPC need to be replaced with `school_id`-free versions.
- `.lovable/plan.md` and any admin sidebar entries referencing "Schools" or "Super Admin" removed.

## 4. Regenerated types + smoke test

- Types will regenerate after the migration runs.
- After code edits, boot-check: `/dashboard` for admin/teacher/student/parent, Results Management, Admissions, Report Cards.

---

## Technical notes

- Because `school_id` appears in ~40 RLS policies, the migration will be long (single file, ~400 SQL statements). All grouped into one migration for atomicity.
- The `bbe68d9f-…` UUID is the Al-Bari school id detected from `src/lib/school-utils.ts`.
- Auth users orphaned by deleted profiles: I will NOT delete `auth.users` rows automatically; you can purge them later via the Supabase dashboard if desired.

## Out of scope
- ID card / report card visual work (unchanged).
- Feature behavior beyond removing the school filter.
- Re-introducing multitenancy later (would require a full restore).

Confirm and I'll execute in build mode.