## Sprint B — Comms & Reports

Focus: bulk operations, financial insight, and attendance intelligence across Admin, Teacher, and Parent surfaces.

### 1. Bulk Report Cards & Delivery
- New `src/components/admin/results/BulkReportCards.tsx` under Results Management:
  - Filter by Session / Term / Class; select all or subset of students.
  - Generate all reports server-side via the shared `report-card-html.ts` engine.
  - Actions: **Download ZIP** (client-side JSZip of per-student PDFs via `jspdf` + `html2canvas`) and **Email to parents**.
- New edge function `supabase/functions/send-report-cards/index.ts`:
  - Accepts `{ student_ids, session_id, term }`, rebuilds HTML per student, renders PDF (using `pdf-lib` or HTML attachment), emails linked parents via Resend using `getReplyToEmail` helper.
  - Logs to `email_logs`.
- Publish state: reuse existing `report_card_publications` so only published terms can be bulk-sent.

### 2. Financial Dashboard
- Replace stub `FeeOverview.tsx` with a real dashboard:
  - KPIs: Total Billed (term), Collected, Outstanding, Collection Rate, Overdue Count.
  - Charts (`recharts`): Collections over time (line), Collection by Class (bar), Payment method split (pie).
  - Top 10 debtors table with quick "Send reminder" action reusing `send-fee-reminders`.
  - Filters: Session, Term, Class.
- Data source: aggregate from `fee_structures`, `fee_payments`, `fee_installments`, `class_assignments`. Add a read-only RPC `get_fees_dashboard(session, term)` for efficiency.

### 3. Attendance Reports & Absentee Automation
- New `src/components/admin/attendance/AttendanceReports.tsx` (surfaced under Settings hub → Attendance, or a new top-level "Attendance" tab):
  - Daily register view (date + class → present/absent/late roster with export CSV).
  - Monthly summary per class + per student % attendance.
  - Staff attendance summary reusing `staff_attendance`.
- Absentee cron:
  - New edge function `supabase/functions/notify-absentees/index.ts` — for today's `student_attendance` rows marked absent, email/SMS the linked parents with child name + date.
  - Schedule via `pg_cron` + `pg_net` at 10:00 daily (SQL run via `supabase--insert`, not migration, per rules).
- Parent side: add `ParentAttendance` monthly summary chart (extend existing component).

### 4. Parent ↔ School Messaging (lightweight)
- New table `parent_messages` (thread_id, parent_user_id, student_id, sender_role, body, read_at).
- Admin composer inside `ParentsHub` → "Messages" tab: list threads, reply.
- Parent side: new `CommunicationHub` inbox (component exists as stub) wired to `parent_messages` with Realtime subscription.
- RLS: parent sees own threads; admin/teacher sees all; standard grants block.

### 5. Wiring & Nav
- `AdminSidebar`: add **Attendance Reports** (under Settings or new group), **Bulk Reports** (under Academic → Report Cards), **Messages** (under Parents).
- `AdminDashboard.tsx`: route the new subtabs.
- `ParentDashboard.tsx`: ensure Messages + Attendance tabs exist and wired.

### Technical notes
- PDF generation stays client-side for ZIP (avoids heavy edge runtime); email path renders single-page HTML attachment to keep functions light.
- All new SQL uses migration tool for schema (parent_messages, RPC); cron scheduling uses `supabase--insert` because it embeds project URL + anon key.
- Reuse existing helpers: `getReplyToEmail`, `sendEmailWithRetry`, `report-card-html.ts`, `useSchoolQuery` is retired (post-multitenancy) — use plain supabase client.
- No new secrets required (Resend + Paystack already configured).

### Deliverables checklist
```text
[ ] BulkReportCards UI + ZIP export
[ ] send-report-cards edge function
[ ] FeeOverview financial dashboard + get_fees_dashboard RPC
[ ] AttendanceReports admin UI
[ ] notify-absentees edge function + pg_cron schedule
[ ] parent_messages table + RLS + grants
[ ] Admin Messages tab + Parent inbox with Realtime
[ ] Sidebar + dashboard routing updates
```

Approve to build. I'll ship in one large batch, then hand back for QA.