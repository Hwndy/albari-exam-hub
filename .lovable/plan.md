
## Goal
Make the Parent Portal fully functional for Al-Bari: parents can link to multiple children (across different classes), view each child's results/attendance/report cards, pay school fees online via Paystack, and interact with school communications.

## Current state (verified)
- `parents`, `student_parent_relationships` tables exist with permission flags (`can_view_grades/attendance/fees`).
- `ParentDashboard` + tabs (Overview, Academics, Report Cards, Attendance, Fees, Messages, Calendar) already scaffolded but broken/partial.
- No parent registration path (`RegisterForm` only exposes student/teacher). No way for a parent to link to their children.
- `FeeManagementEnhanced` reads structures/payments but has no payment initiation. Paystack is already wired for admissions (`initialize-admission-payment`, `paystack-webhook`).
- Report card / results components exist for admin & student; parents lack a per-child selector-driven view.

## Build plan

### 1. Parent onboarding & child linking
- Add **Parent** option to `RegisterForm` (role select + phone field). On signup: create `auth.users` (role=parent) → trigger already creates profile + role → new post-signup step inserts a `parents` row.
- Update `handle_new_user` trigger to auto-insert into `parents` when role='parent'.
- New **"Link a Child"** flow on first login / from Overview: parent enters child's **Admission Number + Date of Birth**; server RPC `link_parent_to_student(admission_no, dob, relationship_type)` verifies match, inserts `student_parent_relationships` row (idempotent), and returns child summary. Admin approval optional flag `verified` (default true for MVP; add `verified boolean` column).
- Admin side: small panel in `StudentDetail` → "Linked Parents" list + manual link/unlink.

### 2. Multi-child selector (global to portal)
- Add `ChildSelectorContext` (or top-level dropdown in `ParentDashboard` header) listing all linked children with avatar/class. Selecting one scopes every tab (Academics, Report Cards, Attendance, Fees) to that child. "All children" option for Overview & Fees summary only.
- Refactor existing tabs to consume selected `studentId` via prop/context instead of internal fetching duplication.

### 3. Results & report cards
- **Academics tab**: rebuild `AcademicProgress` to use the `v_student_term_scores` view (same source as admin report card) grouped by Session → Term → Subject with average, position (if available), grade badge.
- **Report Cards tab**: `ParentReportCards` gets Session/Term selector; renders same PDF-ready component as admin (read-only), download button gated on `report_card_publications.is_published = true` for that term/session. If unpublished, show "Not yet released".
- Enforce `can_view_grades` flag from relationship row.

### 4. Fees & online payment (Paystack)
- **Fees tab** rebuild:
  - Header cards per selected child: Total billed, Paid, Outstanding, Next due date.
  - **Fee breakdown table**: joins `fee_structures` (filtered by child's `class_id` + current `academic_year`) with `fee_payments` to compute balance per fee line.
  - **Installment plans**: if `fee_installment_plans` exists for that child, show schedule with per-installment Pay button.
  - **Payment history**: list `fee_payments` with receipt download (reuses `FeeReceiptGenerator`).
- **New edge function `initialize-fee-payment`**: input `{student_id, fee_structure_id | installment_id, amount}`; verifies parent-child relationship + `can_view_fees`; calls Paystack init with metadata `{type:'school_fee', student_id, fee_structure_id, installment_id, parent_user_id}`; returns `authorization_url`.
- **New edge function `verify-fee-payment`** (or extend `paystack-webhook`): on `charge.success`, insert `fee_payments` row (`status=completed`, receipt number auto-generated), update matching `fee_installments.paid_amount/status` if installment_id present, send email receipt via existing mail helper.
- **Callback page `/fees/payment-callback`**: reads `reference`, calls verify, shows success + receipt link.
- Client uses `supabase.functions.invoke('initialize-fee-payment')` → redirect to `authorization_url`.

### 5. Attendance monitor
- Rewrite `AttendanceMonitor` to use selected child: monthly calendar heatmap + Present/Absent/Late counters from `student_attendance`, plus trend for the term.

### 6. Communication hub
- Parent inbox listing `announcements` targeted to `parent` audience or the child's class, plus `notification_queue` entries addressed to the parent (SMS/Email logs). Read receipt via local flag (`localStorage` for MVP) or new `announcement_reads` table (optional).
- "Message a teacher" v1: pre-filled `mailto:` link to child's class teacher email; full in-app messaging deferred.

### 7. Calendar & other additions
- `AcademicCalendar` already exists — feed from `academic_calendar` filtered to child's class or school-wide; show upcoming events + downloadable ICS.
- New small widgets on **Overview**:
  - Upcoming fee due (with Pay Now button).
  - Latest published report card link.
  - Recent attendance flag (any absence in last 7 days).
  - Latest 3 announcements.
  - Child birthday reminder.
- **Profile & notification settings**: parent can edit `parents` row (phone, address, occupation) and toggle `notification_preferences` (email/SMS opt-in for fees, attendance, results, announcements).

### 8. Security / RLS
- Policies on `fee_structures`, `fee_payments`, `fee_installments`, `student_attendance`, `gradebook_entries`, `report_card_publications`, `announcements`: allow SELECT to parents where `EXISTS (student_parent_relationships spr JOIN parents p ON p.id = spr.parent_id WHERE spr.student_id = <row.student_id> AND p.user_id = auth.uid())`. Use existing `is_parent_of_student(_student_id)` helper (already in DB).
- `fee_payments` INSERT restricted to service_role (only edge function writes).
- RPC `link_parent_to_student` SECURITY DEFINER with rate-limit via existing `rate_limits` table (max 5 attempts / 15min).

### 9. Cleanup
- Delete duplicate `FeeManagement.tsx` (keep the enhanced one, renamed to `FeeManagement.tsx`).
- Deduplicate parent-data fetching into a shared hook `useLinkedChildren()`.

## Out of scope
- In-app real-time chat with teachers.
- Bulk pay across multiple children in one Paystack transaction (v2).
- Mobile push for parents (already have PWA — will just work).

## Deliverables order
1. Migration: parent auto-provisioning trigger, `verified` column, RLS additions, RPC.
2. Registration + child linking UI.
3. Child selector context + refactor tabs.
4. Fees rebuild + Paystack edge functions + callback page.
5. Results/Report Card tab wiring.
6. Attendance, Communication, Calendar, Overview widgets.
7. Settings + notification prefs.

## Confirm before I build
- OK to enable **parent self-registration** (with admission# + DOB verification) rather than admin-created parent accounts?
- Paystack for fee payments: reuse the existing `PAYSTACK_SECRET_KEY` (same account as admissions)?
- Should partial/installment payment be allowed on any fee line, or only where an installment plan is set up by admin?
