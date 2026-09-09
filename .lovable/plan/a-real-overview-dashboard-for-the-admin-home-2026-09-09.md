# A real overview dashboard for the admin home

Today the home screen only shows a thin strip of exam counters and a long "Recent Exams" list. It says nothing about money, attendance, admissions or how the school is actually doing. This replaces it with a proper at-a-glance dashboard.

## What the new home screen shows

**1. Header strip**
Current session and term, today's date, and a refresh control. Everything below is scoped to the current session/term.

**2. Key numbers (top cards)**
- Active students, with male / female split
- Attendance today: present rate as a percentage, plus absent count
- Fees this term: collected out of billed, with the percentage collected
- Outstanding balance across all students
- Admissions this session: total applications and how many are awaiting a decision
- Live exam sessions right now

Each card is clickable and jumps straight to the matching section (Students, Attendance, Finance, Admissions, Exams).

**3. Charts**
- Fee collection trend: collected per month over the last 6 months (bar)
- Attendance trend: daily present rate over the last 14 school days (line)
- Students by class level, split male / female (stacked bar)
- Admission funnel by status: submitted → under review → interview → accepted → enrolled (horizontal bar)

**4. Needs attention**
A short list of things an admin should act on now: unplaced students, students missing gender, applications waiting on review, documents pending verification, invoices overdue, payroll awaiting approval. Each row shows a count and links to the right screen. Rows with a zero count are hidden.

**5. Recent activity feed**
Latest 8 events across the school — new applications, payments received, students enrolled, exams published — each with a time stamp and a link.

**6. Quick actions**
Record cash payment, add student, create exam, send announcement, generate invoices.

## Layout and behaviour

Cards then charts then two columns (needs attention + activity) on desktop; single column stacked on phones. Skeleton placeholders while loading, friendly empty states when there's no data yet, and a visible error message if a section fails instead of a blank box. Existing colours and card styles are kept — no new palette.

## Technical notes

- New `src/components/admin/overview/` with `AdminOverview.tsx` plus small widget files (`KpiCards`, `TrendCharts`, `NeedsAttention`, `ActivityFeed`, `QuickActions`).
- `AdminDashboard.tsx` renders `AdminOverview` for `tab=overview` and drops the old inline KPI strip and Recent Exams block; the existing `fetchDashboardData` stat code is removed.
- Data comes from existing RPCs where possible: `get_students_overview`, `get_finance_summary(start,end)`, `get_fees_dashboard()`, `get_attendance_summary(start,end)`, `get_current_session`, plus light direct queries for admission status counts, recent activity and pending-document counts. All fired in parallel via `Promise.allSettled` so one failure doesn't blank the page.
- If any needed aggregate isn't cheaply available from the existing RPCs (monthly collection series, admission funnel), add one read-only `get_dashboard_overview()` security-definer RPC restricted to admins that returns a single JSON payload, so the page makes one round trip.
- Charts use the already-installed `recharts`, styled with existing design tokens.
- Live refresh via the existing `useRealtimeRefresh` hook on `fee_payments`, `student_attendance`, `admission_applications`, `exam_sessions`.
