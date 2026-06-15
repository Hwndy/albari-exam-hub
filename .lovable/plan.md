# Fix Entrance Exam Management on Admin Side

## Problems
1. The **"Create Entrance Exam"** button in `AdmissionExamScheduler.tsx` is a dead-end — it only fires a `toast.info("Please use the Create Exam button…")`. No dialog opens, so admins literally cannot create an entrance exam from this page.
2. Because no exam can be created here (and existing exams aren't tagged `exam_category = 'entrance'`), the **"Assign Applicants" → Select Exam** dropdown is empty.
3. The applicants list is filtered by `status = 'under_review'` only, so applicants in other valid pre-exam stages (`submitted`, `documents_verified`, etc.) never appear — explaining the "0 selected" empty list in the screenshot.
4. After creating an exam through the generic creator, `exam_category` defaults aren't forced to `entrance` for this admissions flow.

## Fix

### 1. `src/components/admin/AdmissionExamScheduler.tsx`
- Import `ConsolidatedExamCreator` and render it as the trigger for the **Create Entrance Exam** button (replace the toast).
- Pass `onExamCreated={fetchEntranceExams}` so the new exam appears immediately in the list and in the assignment dropdown.
- Pre-seed/force `examCategory = 'entrance'` for exams created from this page (open the creator with an `editingExam`-style preset, or add a small `presetCategory` prop to the creator — minimal change: pass a wrapper that pre-sets category through a new optional `defaultCategory` prop).
- Broaden `fetchEligibleApplicants` to include statuses `['submitted', 'under_review', 'documents_verified']` using `.in('status', [...])`, so admins can actually pick applicants.
- Show an empty-state hint when no entrance exams exist yet ("Create your first entrance exam to begin assigning applicants").
- Show an empty-state hint when no eligible applicants exist.

### 2. `src/components/shared/ConsolidatedExamCreator.tsx` (small additive change)
- Add an optional prop `defaultCategory?: 'regular' | 'entrance'`.
- When provided and not editing, initialize `metadata.examCategory` to that value and lock the category field (read-only) so the entrance flow can't be saved as `regular`.

### 3. Validation
- Open Admissions → Entrance Exams, click **Create Entrance Exam**, fill in the dialog, save. Verify a new card appears.
- Click **Assign Applicants**, confirm the new exam is in the dropdown and at least one applicant (e.g. `APP2026-000005`) is listed and assignable.
- Confirm `admission_exam_assignments` row is inserted and applicant status moves to `interview_scheduled`.

No DB migration is required — `exams.exam_category` and `admission_exam_assignments` already exist.
