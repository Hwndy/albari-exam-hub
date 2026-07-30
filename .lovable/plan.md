## Goal

Give admissions staff a way to record each applicant's entrance exam outcome (score, percentage, comment) and email it to the applicant — plus a one-click "Resit entrance exam" email.

## What gets built

### 1. Store results on the exam assignment

Extend `admission_exam_assignments` with result fields:
- `score`, `max_score`, `percentage` (numeric)
- `result_status` — pass / fail / resit / pending
- `comment` (admin remark shown to applicant)
- `source` — `online` or `manual`
- `result_sent_at`, `resit_sent_at`, `recorded_by`, `updated_at`

Access rules unchanged in spirit: admins and teachers can read/write; applicants never read this table directly.

### 2. New "Results" area in Admissions → Entrance Exams

Under each entrance exam card, a "Results" view listing every assigned applicant with:
- Auto-pulled score if the applicant sat the exam online (from their exam session), shown read-only with an "override" toggle
- Manual score entry (score / max / auto-computed percentage) when the exam was written physically
- Pass/Fail/Resit selector and a free-text comment box
- Save button; results persist per applicant

Bulk helpers: "Pull online scores" to refresh all auto scores, and a summary row (average, pass rate).

### 3. Two new emails

Add templates to the existing `send-admission-notification` edge function:
- `exam_result` — greets the applicant, states score / total / percentage, outcome, and the admin's comment
- `exam_resit` — informs the applicant they must resit, includes resit date/venue text and the comment (email only, no auto reassignment)

Each row gets a **Send Result** and a **Send Resit Email** button; both log to `email_logs` and stamp `result_sent_at` / `resit_sent_at` so staff can see what has already gone out. A "Send to all recorded" bulk action is included.

## Technical notes

- Migration adds columns + grants/policy updates only; no new tables.
- Online score lookup joins `exam_sessions` for the entrance exam via the enrolled applicant's user, falling back to manual when no session exists.
- Email sending reuses `supabase.functions.invoke('send-admission-notification', { application_id, notification_type, additional_data })`, passing score/percentage/comment through `additional_data`.
- New component `src/components/admin/admissions/EntranceExamResults.tsx`, wired into `AdmissionExamScheduler.tsx`.
