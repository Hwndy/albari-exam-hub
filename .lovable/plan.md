## Goal

Support entrance exams written physically at the school: no CBT questions, per-subject marks entered by hand, totals and percentage computed, then result/resit emails sent to applicants.

## What exists today (verified)

- `admission_exam_assignments` already has `score`, `max_score`, `percentage`, `result_status`, `comment`, `source`, `result_sent_at`, `resit_sent_at`.
- `exams` has `exam_category = 'entrance'` but is built for CBT (`total_questions`, `duration_minutes`, questions required).
- `EntranceExamResults.tsx` shows one score box per applicant and sends result/resit emails.

## Plan

### 1. Database

- Add `exam_mode text not null default 'cbt'` to `exams` (values `cbt` | `paper`). Paper exams skip question setup.
- Add `subject_scores jsonb default '[]'` to `admission_exam_assignments` — array of `{ subject, score, max }`.
- Update `save_entrance_exam_result` to accept `p_subject_scores jsonb`, and compute `score`/`max_score`/`percentage` from the breakdown when it is supplied (manual total still allowed if no breakdown).
- Extend `get_entrance_exam_results` to return `subject_scores`.
- Add `get_application_exam_result(p_application_id uuid)` so the application review modal can read/write the same record; if no assignment exists for a paper sitting, allow creating one.

### 2. Create a paper exam sitting

New "Record Paper Exam" action in Admissions → Entrance Exams: title, exam date, subject list (e.g. English, Mathematics, General Paper) with a max mark each. Creates an `exams` row with `exam_mode='paper'`, `exam_category='entrance'`, `total_questions=0`, no question builder. Paper exams show a "Paper" badge on the card and hide CBT-only fields.

### 3. Score sheet (batch entry)

Rework `EntranceExamResults.tsx` into a table for paper mode:

```text
Applicant        | English/40 | Maths/40 | General/20 | Total | %   | Outcome | Comment | Actions
Ada Obi (APP-01) |     32     |    28    |     15     |  75   | 75% | Pass    | ...     | Save · Result · Resit
```

- Subject columns come from the exam's subject list; total and percentage update live.
- Keyboard-friendly entry (tab across the row), "Save all" for the whole sheet plus per-row save.
- Existing CSV export includes the per-subject columns. Existing "Pull online scores" stays, but only for CBT exams.

### 4. Quick entry on the application

In the application review modal (Admissions → Applications), add an "Entrance exam result" section: pick the paper sitting, enter subject marks, outcome and comment, save, and send the result or resit email — same RPC and same email path as the score sheet.

### 5. Emails

Update the `exam_result` template in `send-admission-notification` to render a subject breakdown table when `subject_scores` is present, falling back to the single total otherwise. `exam_resit` is unchanged. for the resit email, i should be able to input the date and time for the resit

## Technical notes

- Files: migration; `src/components/admin/admissions/EntranceExamResults.tsx` (rewrite to table + subjects), new `PaperExamCreator.tsx`, `AdmissionExamScheduler.tsx`, `AdmissionManagement.tsx`, `supabase/functions/send-admission-notification/index.ts`.
- Existing CBT entrance exams and already-saved single-score results keep working — `subject_scores` empty means the old single-total UI.