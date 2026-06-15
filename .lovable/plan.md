
# Academic Flow Overhaul

Goal: make Exams → Questions → Results → Report Cards feel like one connected system, all scoped by **School → Session/Term → Class → Subject**.

We will reuse `admission_sessions` as the single source of truth for sessions/terms (renamed in UI as "Academic Sessions"), and add a lightweight `term` field where needed so the same session can hold First/Second/Third term records.

---

## 1. Session & Term as the spine

**DB (one migration):**
- Add `current` boolean on `admission_sessions` (only one current per school, enforced by partial unique index).
- Add `term text` (`first` | `second` | `third`) and `session_id uuid → admission_sessions(id)` on:
  - `exams`
  - `gradebook_entries` (already has `term` + `academic_year` text — backfill `session_id` from `academic_year`)
- Add `assessment_category text` on `exams` (`test1` | `test2` | `exam` | `ca` | `mock` | `other`) so an exam can feed the report card's TEST1 (20) / TEST2 (20) / EXAM (60) split automatically.
- Helper SQL function `get_current_session(school uuid)` for defaults.

**UI:**
- New `AcademicSessionManager` (admin) — list sessions, mark current, manage terms. Reuses existing `AdmissionSessionManager` UI but exposes it under Academics too.
- A global `SessionTermPicker` chip in the admin/teacher header that defaults to current session + current term. All academic screens read from it via a new `useAcademicContext()` hook.

---

## 2. Exams — grouped by Subject / Class / Term

**`ExamManagement.tsx` rework:**
- Replace flat list with grouped accordion:
  ```text
  Session 2025/2026 → First Term
    └─ JSS1
        └─ Mathematics
            ├─ CA Test 1   (test1, 20 marks)   [edit] [results]
            ├─ CA Test 2   (test2, 20 marks)
            └─ Term Exam   (exam,  60 marks)
        └─ English …
  ```
- Filters: Session, Term, Class, Subject, Category, Status.
- "Create Exam" prefills session/term from context and forces `assessment_category` choice so report-card mapping is unambiguous.
- Keep existing entrance-exam flow untouched (already uses `exam_category='entrance'`).

---

## 3. Question Bank — proper organization

**`AdminQuestionBank.tsx` / `teacher/QuestionBank.tsx`:**
- Group by **Subject → Class → Topic/Tag** with collapsible tree.
- Add `topic text` and `tags text[]` columns on `questions` (migration).
- Filters: subject, class, difficulty, topic, tag, question type.
- "Use in exam" action: multi-select questions → add to any existing exam in same subject/class.
- Bulk import already exists — extend CSV template to include topic/tags.
- De-duplicate: warn on near-identical question text within a question bank.

---

## 4. Results — one unified hub

New `ResultsHub` component with three views, all session/term/class/subject scoped:

1. **By Exam** — pick exam → student list with score, %, pass/fail, time, attempt status. (Replaces scattered `AdminStudentResults`, `EnhancedExamResults`.)
2. **By Student** — pick student → all assessments this term, grouped by subject, with running average.
3. **By Class** — class broadsheet: rows=students, cols=subjects, cells=term total (TEST1+TEST2+EXAM out of 100), with class average and position.

Data sources unified:
- Online exams → `exam_sessions` (auto-graded).
- Offline assessments → `gradebook_entries` (teacher-entered TEST1/TEST2/EXAM).
- A SQL view `v_student_term_scores(student_id, session_id, term, subject_id, test1, test2, exam, total, grade, position)` powers all three views and the report card.

Export: CSV + PDF per view.

---

## 5. Report Card — fix end-to-end

Diagnosis from the codebase: `ReportCardGenerator.tsx` (984 lines) pulls from `gradebook_entries` directly but doesn't reliably aggregate online exam results, has no canonical term/session filter, and the grading scale isn't pulled from `grading_scales` per school.

Fixes:
- **Data**: read from the new `v_student_term_scores` view so both online exams (mapped by `assessment_category`) and manual gradebook entries flow in together.
- **Calculations**: TEST1 (20) + TEST2 (20) + EXAM (60) = 100; grade letter from `grading_scales` for the school (fall back to seeded A–F if none).
- **Position**: computed in the view via `RANK() OVER (PARTITION BY class, subject ORDER BY total DESC)`; class position from sum of totals.
- **Stats block**: average, position, class average, highest/lowest, attendance % (from `student_attendance` for the term), biometrics + comments (from `report_card_comments`, already exists).
- **PDF**: single React-PDF template, one student per call, "Generate for whole class" loops with progress.
- **Header controls**: Session, Term, Class, Student(s). No more silent empty PDFs — show inline validation if data is missing for a student/subject.

---

## 6. Permissions & multi-tenancy

- Every new query goes through `useSchoolQuery` and includes `school_id` + `session_id`.
- RLS on new columns/view follows existing pattern: `(school_id = get_user_school_id() AND …) OR is_super_admin()`.
- Teachers: only see exams/results for classes they're assigned to (existing `teacher_class_assignments`).
- Students/Parents: results restricted to own/child records (existing policies extended to the view).

---

## Delivery order (single pass, multiple commits)

1. Migration: sessions/terms columns, `assessment_category`, `topic/tags`, view, grants, RLS.
2. `useAcademicContext` + `SessionTermPicker`.
3. Exam list regroup + creator updates.
4. Question bank tree + filters.
5. ResultsHub (replaces old results screens, keeps deep-links working via redirects).
6. ReportCardGenerator rewrite on top of the view.

## Out of scope

- Changing the admissions/entrance-exam flow.
- New auth flows, new roles.
- Mobile-specific redesign (existing responsive styles kept).

## Validation checklist

- Create a session, mark current, create TEST1 + TEST2 + EXAM for JSS1 Math, students take/teacher enters scores → report card shows 20/20/60 split, correct grade, correct class position.
- Filter Exam list by session/term/class/subject → only matching exams.
- Question bank: filter by topic, add 5 questions to an exam in two clicks.
- Results: same numbers in "By Exam", "By Student", "By Class", and Report Card.
- Multi-tenant: a teacher from School B sees nothing from School A.
