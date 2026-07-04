## Report Card fixes — plan

### What's broken (root causes)

1. **Report card page shows no data.**
   - The page reads from view `v_student_term_scores`, which is fed by `gradebook_entries.test1_score / test2_score / exam_score / term / session_id` or by online CBT exams tagged with `assessment_category` + `session_id` + `term`.
   - The existing `GradebookSystem` (teachers' gradebook) writes only `assessment_name` / `obtained_score` / `max_score`. It never writes `test1_score`, `test2_score`, `exam_score`, `term`, or `session_id`. So the view has nothing to return → 0 subjects, 0 total, F grade for everyone.
   - `gradebook_entries` is currently empty.

2. **School name / logo / address blank on the printable card.**
   - `ReportCardGenerator` selects `name, address, phone, email, motto, logo_url` from `schools`, but the `schools` table has no `phone`, `email`, or `motto` columns (real columns are `contact_phone`, `contact_email`, no motto). The select errors silently → `schoolInfo` stays `null` → header renders empty.
   - The current school row also has null `logo_url` / `address`.

3. **No way for admin/teacher to record the school's written Test 1, Test 2, and written portion of the Exam per term/session/subject.** Only CBT results are captured today.

### Fix 1 — School header (small)

In `ReportCardGenerator.tsx`:
- Change the `schools` select to `name, address, contact_phone, contact_email, logo_url`.
- Drop `motto` from `SchoolInfo` (or fall back to a default string).
- Map `contact_phone`→`phone`, `contact_email`→`email` in state.
- In `generatePrintableHTML`, only render Tel/Email/Address/Motto lines when the value exists (no more "Tel: N/A").
- Add a Settings note in the plan: admin needs to upload the school logo and fill address/contact via the existing School settings screen for them to appear.

### Fix 2 — New "Manual Scores Entry" tab in the Report Card page

Add a new tab inside `ReportCardGenerator` (Tabs: **Report Cards** | **Enter Scores**) so admins/teachers can upload written test and written exam marks that flow into the report card immediately.

**Enter Scores tab** — a spreadsheet-style grid:

- Filters at top: Class, Session, Term, Subject.
- Fetch students in the selected class from `class_assignments` + `profiles` + `students` (same pattern already used on this page).
- For each student render 3 numeric inputs: `TEST 1 (/20)`, `TEST 2 (/20)`, `EXAM (/60)`.
- Preload existing values from `gradebook_entries` matched on `(school_id, student_id, class_id, subject_id, session_id, term)`.
- **Save all** button: for each row upsert into `gradebook_entries` with:
  - `school_id`, `student_id`, `subject_id`, `class_id`, `session_id`, `term` (lowercase `first`/`second`/`third` — matches the view), `academic_year`,
  - `test1_score`, `test2_score`, `exam_score`,
  - Plus the not-null fields the table requires: `assessment_type='terminal'`, `assessment_name` = `${Term} ${Session} - Manual`, `assessment_date=today`, `max_score=100`, `obtained_score=test1+test2+exam`, `grade=<computed A–F>`, `teacher_id=current user`.
  - Use `.upsert(..., { onConflict: 'school_id,student_id,subject_id,class_id,session_id,term' })`.
- Requires a unique index on `gradebook_entries (school_id, student_id, subject_id, class_id, session_id, term)` — add via migration; without it `upsert` can't dedupe. Then bulk-clear obsolete rows for the same key so we don't duplicate.
- After save: toast success and switch back to the Report Cards tab (which will now show real totals via the view).

Once scores exist, the existing view already:
- Combines them with any CBT online exam scores (CBT wins per component only if manual is null; manual takes precedence via `COALESCE(m.*, o.*)`).
- Feeds subject rows, totals, class average/high/low, and positions on the printable card.

### Fix 3 — Report card table + PDF now show data

No extra work: once Fix 2 writes rows, the existing `fetchStudentsAndGrades` + `generateReportCards` + `generatePrintableHTML` pipeline populates:
- Subjects list, TEST 1 / TEST 2 / EXAM / TOTAL / GRADE / position / class avg / high / low / remark
- Overall total, average, position, grade
- Term + Session on the header

### Files to change

- `src/components/admin/ReportCardGenerator.tsx`
  - Fix the `schools` select + `SchoolInfo` mapping and printable header conditional rendering.
  - Wrap current UI in a Tabs container; add a new "Enter Scores" tab component (inline or extracted to `ManualScoresEntry.tsx`).
- New migration under `supabase/migrations/`:
  - `CREATE UNIQUE INDEX IF NOT EXISTS gradebook_entries_manual_key ON public.gradebook_entries (school_id, student_id, subject_id, class_id, session_id, term) WHERE session_id IS NOT NULL AND term IS NOT NULL;`

### Out of scope (won't touch)

- `GradebookSystem.tsx` (teacher dashboard) — keeping its current per-assessment workflow untouched; the new admin "Enter Scores" tab is the intended path for term-level Test 1 / Test 2 / Exam entry.
- `v_student_term_scores` — already correct.
- ID card / student pages.
