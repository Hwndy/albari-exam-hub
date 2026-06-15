# Fix empty "Select Exam" dropdown + safe security review

## Why the dropdown is empty
I checked the database: **no exam has `exam_category = 'entrance'`** — all existing exams are tagged `regular`. The Assign dialog correctly filters by `exam_category = 'entrance'`, so it has nothing to show. The dialog also gives no hint about this, so it looks broken.

The "Create Entrance Exam" button now opens the creator with `defaultCategory="entrance"`, but until an entrance exam is actually saved the dropdown will stay empty. On top of that, two small issues make this worse:
1. `fetchEntranceExams` only runs once on mount, so an exam created while the page is open won't appear until refresh (the creator's `onExamCreated` callback fires, but if the user opens the Assign dialog before creating one, they see nothing and no guidance).
2. There is no empty-state inside the Assign dialog itself — only on the card grid behind it.

## Fix (UI only, no schema changes)

### `src/components/admin/AdmissionExamScheduler.tsx`
- Re-fetch entrance exams every time the Assign dialog opens (`onOpenChange` → call `fetchEntranceExams()`), so newly created exams appear immediately.
- Inside the Assign dialog, when `exams.length === 0`, replace the empty `<select>` with a clear inline message + a `ConsolidatedExamCreator` trigger button so the admin can create one without closing the dialog:
  > "No entrance exams found. Create one first to assign applicants." [Create Entrance Exam]
- Add a one-time backfill helper (optional, behind a small "Convert existing exam to entrance" link in the empty-state) — *skipped by default* to avoid touching existing `regular` exams. We'll just guide the admin to create a fresh entrance exam.
- Keep all existing behaviour (assign flow, applicant list, status update) untouched.

No changes to `ConsolidatedExamCreator.tsx`, RLS, or any edge function.

## Security review (non-breaking)
You also asked about security. I will:
1. Run the Supabase linter and the security scanner in read-only mode.
2. Report findings grouped as:
   - **Safe to fix now** — missing GRANTs, RLS gaps on tables that are clearly meant to be auth-only, function `search_path` warnings. These are additive and won't break working features.
   - **Needs your confirmation** — anything that would tighten access on a table currently used publicly (e.g. `website_*`, `news_articles`, `gallery`). I will not change these without approval.
3. Only after you approve, apply fixes in a single migration that:
   - Adds missing `GRANT`s to `authenticated` / `service_role`.
   - Pins `search_path = public` on any `SECURITY DEFINER` function missing it.
   - Adds RLS policies on auth-only tables that lack them, scoped via `has_role` / `get_user_school_id`.

Nothing in this review step modifies UI, edge functions, or any policy that current features depend on.

## Validation
- Open Admissions → Entrance Exams → **Assign Applicants** with zero entrance exams: confirm the new empty-state + inline Create button.
- Click the inline Create button, save an entrance exam, confirm it appears in the dropdown without closing the dialog.
- Assign `APP2026-000006` to it, confirm `admission_exam_assignments` row inserts and status moves to `interview_scheduled`.
- Verify all existing `regular` exam flows (teacher dashboards, student exam list) are unchanged.
