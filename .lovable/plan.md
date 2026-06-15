
# Report Card empty — root cause + fix

## Diagnosis

The Report Card screen is rendering correctly. There's just nothing to show:

- `gradebook_entries`: **0 rows total**. No teacher has entered any TEST1/TEST2/EXAM scores.
- `exam_sessions`: **2,650 completed** sessions, but **0** of them have their parent exam tagged with `session_id` + `term` + `assessment_category` — so the unified view filters them all out.
- `admission_sessions`: 1 row ("1 st term", 2025/2026), `is_current = false`.

The Report Card itself can't manufacture data. We need to wire upstream so scores actually flow in.

## Fix plan (4 small changes)

### 1. Tag exams from the UI

In `src/components/admin/ExamManagement.tsx` (and `ConsolidatedExamCreator.tsx`), add three required fields when creating/editing a regular exam:

- **Session** (dropdown of `admission_sessions` for the school, defaults to current).
- **Term** (first / second / third, defaults to current term from a new picker — see #4).
- **Assessment category** (test1 / test2 / exam / ca / mock / other).

Show a small inline notice on existing untagged exams: *"Tag this exam with a session and term so its results appear on report cards."*

### 2. Bulk-tag existing exams

Add an admin-only "Tag exams" dialog on the Exam list with:
- Multi-select exams from the list.
- Pick session + term + category, apply to all selected.

This lets the admin retroactively classify the 2,650 historical sessions so they start showing on report cards immediately, without re-running anything.

### 3. Gradebook writes session_id

In `src/components/teacher/GradebookSystem.tsx`, replace the free-text `academic_year` input with the same Session dropdown and write `session_id` on every insert/update. Backfill `academic_year` text from the chosen session for compatibility with existing `report_card_comments` / `attendance_summary` joins.

### 4. Empty-state guidance on the Report Card

When `reportCards.length === 0`, replace the generic message with a real diagnostic:
- "No exams found for this session+term. **Create a TEST1 / TEST2 / EXAM** in Exam Management, or enter scores in the Gradebook."
- If the school has untagged exams (we can detect with a count query), show: *"You have N completed exams not tagged with a session/term — click here to tag them."* → opens the bulk-tag dialog.

### 5. Mark a session current (one-time, optional)

The single existing session "1 st term" has `is_current = false`. Either:
- Add an `AcademicSessionManager` toggle (planned for step 1 of the larger plan), or
- For now, the Report Card already lets the admin pick the session from the dropdown — so this is not blocking, but the empty-state hint will mention it.

## Files touched

- `src/components/shared/ConsolidatedExamCreator.tsx` — add session/term/category fields, default to current.
- `src/components/admin/ExamManagement.tsx` — bulk-tag dialog + untagged badge.
- `src/components/teacher/GradebookSystem.tsx` — Session dropdown writes `session_id`.
- `src/components/admin/ReportCardGenerator.tsx` — smarter empty state + "tag exams" CTA.

## Out of scope (for this pass)

- Full SessionTermPicker in the header (planned later).
- Question bank tree, ResultsHub, Exam list regroup — these come after data starts flowing.

## Validation

1. Open Exam Management → bulk-tag 5 historical exams as `term=third`, `session=1 st term`, `category=exam`.
2. Open Report Cards → pick SSS 2 B, Third Term, "1 st term" → student scores from those tagged exams now show, with grades + positions.
3. Open Gradebook → enter TEST1 for a student under the same session/term → it appears on the report card alongside the exam score (20+20+60 split).
