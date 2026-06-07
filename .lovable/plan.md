# Admissions Workflow — Fix & Refactor

## Root causes found during the scan

1. **Orphaned applications (the biggest bug).** `admission_applications.school_id` is nullable and `AdmissionForm.tsx` never sets it. Admin queries filter by `school_id = get_user_school_id()`, so submissions are invisible to admins — the whole pipeline appears dead.
2. **RLS multi-tenancy leak.** Policies on `admission_documents`, `admission_payments`, `admission_offers`, `admission_interviews` only check `has_role(auth.uid(),'admin')` with **no `school_id` clause**, violating the Core multi-tenant rule. Any admin can see any school's data.
3. **Duplicate RLS policies** on `admission_documents` (two "Admins can manage…", two "Public can upload…").
4. **Public tracker mismatch.** `track-application` edge function exists for unauthenticated lookup, but `ApplicationTracker.tsx` and the offer/accept page rely on SELECT policies that require `auth.users.email = application.email` — applicants who aren't logged in can't see anything.
5. **God components.**
   - `AdmissionForm.tsx` is 1,257 lines (validation, upload, payment init, email all inline).
   - `AdmissionManagement.tsx` (529) overlaps with `AdmissionDecisionBoard`, `AdmissionPaymentVerification`, `AdmissionDocumentViewer`, `RejectionNotifier` — same data, different screens, no shared state.
6. **No `school_id` is plumbed** through `admission_documents` / `admission_payments` / `admission_offers` / `admission_interviews` rows, so even after fixing RLS, joins won't filter cleanly.
7. **State machine is implicit.** Status transitions (`submitted → under_review → interview_scheduled → accepted → payment_pending → enrolled`) are scattered across components with no guard rails.

---

## Plan

### Phase 1 — Database migration (one migration)

- Make `admission_applications.school_id NOT NULL` and add `admission_sessions.school_id`-based default via trigger when a public submission supplies a session/class.
- Add `school_id uuid NOT NULL` to `admission_documents`, `admission_payments`, `admission_offers`, `admission_interviews`, `admission_workflow_logs` (backfill from parent `admission_applications.school_id`, then enforce NOT NULL).
- Add BEFORE INSERT triggers `auto_populate_school_id_admission_*` on the four child tables (pattern already used elsewhere in the project).
- **Drop the leaky policies** on the four child tables and **recreate** them with the standard pattern:
  ```
  ((school_id = get_user_school_id()) AND is_admin()) OR is_super_admin()
  ```
- Drop duplicate policies on `admission_documents`.
- Add a SECURITY DEFINER RPC `submit_admission_application(payload jsonb)` that:
  - Resolves `school_id` from the active `admission_sessions` row or from `applying_for_class_id → classes.school_id`.
  - Inserts the application with the resolved `school_id`.
  - Returns `{ id, application_number }`.
  This lets the public form work without `anon` write access to a NOT NULL column it can't compute.
- Add helper `get_application_by_tracking(p_app_no text, p_email text)` (SECURITY DEFINER) used by the public tracker edge function so unauthenticated tracking works without loosening RLS.

### Phase 2 — Public flow (applicant side)

Refactor `src/components/website/AdmissionForm.tsx` (1,257 → ~250 lines + 6 small files):

```
src/components/website/admission/
  AdmissionForm.tsx              // orchestrator + stepper
  steps/PersonalInfoStep.tsx
  steps/AcademicStep.tsx
  steps/GuardianStep.tsx
  steps/DocumentsStep.tsx
  steps/ReviewStep.tsx
  hooks/useAdmissionSubmit.ts    // calls submit_admission_application RPC
  hooks/useAdmissionUpload.ts    // storage upload + admission_documents insert
  schema.ts                      // single zod schema, one source of truth
```

- Replace the direct `.insert()` with the new RPC so `school_id` is always set.
- Uploads write `application_id/<type>.<ext>` (already correct) and rely on the new trigger for `school_id`.
- After submit, redirect to `/payment/init?app=<application_number>` which calls `initialize-admission-payment`.
- `ApplicationTracker.tsx` and `AcceptOfferPage.tsx` switch to the `track-application` edge function (no auth required); accept/decline uses `accept-offer` exclusively.

### Phase 3 — Admin hub (consolidation)

Collapse seven screens into one route `/admin/admissions` with tabs, sharing a single React Query cache and selected-application context:

```
src/components/admin/admissions/
  AdmissionsHub.tsx              // tab shell + filters + KPIs
  ApplicationsTable.tsx          // replaces AdmissionDecisionBoard + list in AdmissionManagement
  ApplicationDrawer.tsx          // side panel: details, documents, payments, interviews, offer
  tabs/PipelineTab.tsx           // kanban by status (drag = status change via RPC)
  tabs/SessionsTab.tsx           // wraps AdmissionSessionManager
  tabs/ExamsTab.tsx              // wraps AdmissionExamScheduler
  tabs/InterviewsTab.tsx         // merges InterviewScheduler + InterviewPanelManager + InterviewFeedbackForm
  tabs/AnalyticsTab.tsx          // wraps AdmissionAnalytics
  hooks/useApplications.ts       // single source of truth, useSchoolQuery
  hooks/useStatusTransition.ts   // enforces allowed transitions
```

Existing files kept but re-exported from `tabs/*` so we don't lose work; `AdmissionManagement.tsx`, `AdmissionDecisionBoard.tsx`, `RejectionNotifier.tsx`, `AdmissionDocumentViewer.tsx`, `AdmissionPaymentVerification.tsx` shrink to thin wrappers used inside the drawer.

Sidebar entry `Admissions` points to the new hub; old menu items removed.

### Phase 4 — Status state machine

`src/lib/admissions/stateMachine.ts` defines allowed transitions:

```text
submitted        → under_review | rejected
under_review     → interview_scheduled | accepted | rejected
interview_scheduled → accepted | rejected
accepted         → payment_pending
payment_pending  → enrolled
* → withdrawn
```

`useStatusTransition` validates before updating; backend RPC `transition_admission_status(app_id, new_status, notes)` re-validates server-side and writes to `admission_workflow_logs`.

### Phase 5 — QA

- Reproduce in preview: submit public application → verify it appears in admin hub for the correct school only.
- Verify offer letter → accept-offer → status flips to `enrolled` and a `students` row is created.
- Run `supabase--linter` after migration; fix any new findings.

---

## Files touched (summary)

- **New migration** (1 file): schema + RLS + RPCs + triggers.
- **Refactored**: `AdmissionForm.tsx` split into 8 files under `components/website/admission/`.
- **Refactored**: `AdmissionManagement.tsx` replaced by `components/admin/admissions/AdmissionsHub.tsx` + 10 files.
- **Updated**: `ApplicationTracker.tsx`, `AcceptOfferPage.tsx`, `PaymentCallbackPage.tsx`, `AdminSidebar.tsx`, `AdminDashboard.tsx` routing.
- **Edge functions**: minor — `track-application` and `accept-offer` updated to use new RPCs; `initialize-admission-payment` unchanged.

Estimated ~25 files changed/created, ~3,500 lines net reduction.

## Out of scope
- Redesigning the public Apply landing copy/visuals.
- Adding new fields to the application (will keep current schema).
- SMS notifications (email-only stays as today via `send-admission-notification`).
