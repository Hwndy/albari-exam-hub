## Results Management & Report Cards — plan

### Root cause of "N/A / 0" on Report Cards page
The Save button on the Enter Scores tab returned "there is no unique or exclusion constraint matching the ON CONFLICT specification". The migration created a **partial** unique index (`WHERE session_id IS NOT NULL AND term IS NOT NULL`), which Postgres cannot match for `upsert(onConflict: ...)`. So no gradebook rows are being written, so the view returns 0 for every student → the table shows 0/0 and F.

Fix: replace it with a plain unique constraint (no WHERE) and enforce `session_id`/`term` NOT NULL on rows we insert (already the case for manual entries). Also treat rows where `session_id`/`term` are null as legacy and leave them alone by scoping the constraint to only the manual-entry columns.

---

### 1. Move "Enter Scores" out of Report Cards
- Remove the Tabs from `ReportCardGenerator.tsx`; it goes back to being just the report-card list/preview/print.
- Register a new admin sidebar entry **Results Management → Enter Scores** rendering `ManualScoresEntry` (already built).
- Also expose the same page in the Teacher/Staff dashboard, gated so teachers only see the class/subject pairs assigned to them via `teacher_class_assignments` + `subject_assignments`.

### 2. Fix the ON CONFLICT error (migration)
- Drop the current partial index `gradebook_entries_term_key`.
- Add: `CREATE UNIQUE INDEX gradebook_entries_manual_key ON public.gradebook_entries (school_id, student_id, subject_id, class_id, session_id, term);` (no WHERE clause).
- Backfill: for any legacy row with null `session_id`/`term`, leave as-is — the manual-entry pathway always sends both fields, so it will not collide.

### 3. Results Management — new features
Add a new admin section **Results Management** with these sub-tabs:

a. **Enter Scores** — the existing `ManualScoresEntry` (moved here).
b. **Broadsheet (termly)** — grid of all students in a class × all subjects for a chosen term/session, showing Test1/Test2/Exam/Total/Grade, plus per-student totals/average/position and per-subject class average/high/low. Printable + CSV export. Reads from `v_student_term_scores`.
c. **Automation settings** — new table `result_automation_settings` (per school):
   - `min_promotion_average` (numeric, default 40)
   - `principal_remark_below_average`, `principal_remark_average`, `principal_remark_above_average`, `principal_remark_distinction` (text templates)
   - Thresholds `below_max`, `average_max`, `above_max` (numeric) that decide which template is auto-applied.
   The report-card renderer will auto-fill Principal's remark from these templates based on the student's final average, unless a manual `principal_comment` is set.
d. **End-of-year (Third Term) rollup** — when Third Term is picked, the broadsheet and report card also compute **Session Average = mean of first + second + third term averages**, per subject and overall. Stored on the fly (view or client-side aggregation across the three term rows).
e. **Promotion / Archive** — new "Promotion" screen that, given a class + session:
   - Lists students with their session average vs. `min_promotion_average` → Promote / Repeat suggestion.
   - Bulk-promote to next class via `class_assignments` update; log entries to existing `promotion_history`.
   - For SSS 3 (or any class flagged "terminal") auto-move to archive: add `students.archived_at` + `archived_reason` columns; hide archived students from active lists; new "Past Students" page under Results Management lists them.

### 4. Report Card visual/data fixes
- **School name & logo header** — the header already reads `schoolInfo`; the reason it looks blank is `logo_url` and `address` are null on the current school row. No code change needed there, but add a small "School Branding" empty-state banner on the Report Cards page linking to the School Settings screen when logo/address are missing. Also render the logo `<img>` at 60×60 with graceful fallback to school initials.
- **Student picture** — add `<img src={students.photo_url}>` (avatar circle) in the printable card header next to bio-data. Fallback to initials when null.
- **Parents' signature** — hidden by default via a toggle in `result_automation_settings.show_parent_signature` (default false so it doesn't render). Admin can turn it back on.
- **Staff signature upload** — add columns `staff_details.signature_url` + upload UI in Staff Management (uses existing `admission-documents` bucket or new `staff-signatures` bucket, admin-only). Class Teacher / Head Teacher / Principal signatures render in their respective boxes on the printable card based on assignments.

### 5. Parent portal wiring
- New parent page **Report Cards** listing each child's published term report cards.
- Add `report_card_publications` table: `(school_id, student_id, class_id, session_id, term, published_at, published_by)`; admin gets a "Publish" button on each row in Report Cards page. Parents only see rows that exist here.
- Parent view reuses `generatePrintableHTML` for print/PDF.

### 6. Files & migrations

New/edited files
- `supabase/migrations/*` — drop partial index; add full unique index; add `result_automation_settings`, `report_card_publications`; add `students.archived_at`, `students.archived_reason`, `staff_details.signature_url` columns; grants + RLS.
- `src/components/admin/ReportCardGenerator.tsx` — remove Tabs, add branding banner, student photo, signatures, auto principal remark, session-average when Third Term, Publish button.
- `src/components/admin/ManualScoresEntry.tsx` — no functional change (moves to new page).
- New `src/components/admin/results/ResultsManagement.tsx` (tabs shell), `Broadsheet.tsx`, `AutomationSettings.tsx`, `PromotionPanel.tsx`, `PastStudents.tsx`.
- New `src/components/parent/ParentReportCards.tsx` + route wiring.
- New `src/components/admin/StaffSignatureUpload.tsx` inside Staff Management.
- Sidebar / `AdminDashboard.tsx` / `TeacherDashboard.tsx` / `ParentDashboard.tsx` routing updates.

### Order of implementation
1. Migration fix + new tables (unblocks saves immediately).
2. Move Enter Scores + build Results Management shell.
3. Broadsheet + Automation settings + Promotion/Archive.
4. Report Card visual fixes (logo/photo/signatures/auto remark/session average).
5. Publish flow + Parent Report Cards page.

### Out of scope
- Rewriting the ID card, gradebook per-assessment CBT flow, or CBT scoring logic.
- Bulk import of historical scores (can be added later; manual entry + CSV import can come as a follow-up).
