## Sprint F — New Modules: HR, Transport, Inventory & Analytics

Sprints A–E shipped and hardened the core academic + admissions + fees + comms platform. Sprint F adds the remaining school-operations modules a real school needs day-to-day, plus a proper analytics layer over everything already captured.

### 1. HR & Payroll (extends existing Staff)
Already have: `staff_details`, `staff_attendance`, staff ID cards.
Add:
- `leave_requests` table (staff_id, type, start/end, reason, status, approver, decided_at) with RLS: staff manage own, admin approves.
- `payroll_periods` + `payroll_items` (staff_id, gross, allowances JSONB, deductions JSONB, net, status). Admin-only.
- Admin UI in `SettingsHub → Staff HR`: Leave approval board, Payroll run (generate month → edit lines → mark paid → export CSV), Payslip PDF via `jsPDF`.
- Staff-facing panel on `TeacherDashboard`: request leave, view leave history, download payslips.

### 2. Transport
- `transport_routes` (name, driver_name, driver_phone, vehicle_reg, capacity, monthly_fee).
- `transport_stops` (route_id, name, pickup_time, order).
- `student_transport` (student_id, route_id, stop_id, active, started_on, ended_on).
- Admin UI `TransportHub.tsx`: routes CRUD, assign students, roster print per route.
- Parent view: current route + stop + driver contact on `ParentDashboard`.
- Fees integration: optional auto-add transport monthly line to `fee_installments` per assigned student.

### 3. Inventory / Assets
- `asset_categories`, `assets` (tag, name, category_id, location, condition, purchased_on, cost, assigned_to_staff, status).
- `asset_movements` (asset_id, from, to, moved_by, moved_at, note).
- Admin UI `AssetsManager.tsx`: register asset (auto-generate QR tag reusing scan-url helper), check-in/out, condition log, CSV export.
- Reuse existing `/scan/<token>` station: scanning an asset tag opens asset card + movement form.

### 4. Cafeteria / Meals (lightweight)
- `meal_plans` (name, price, days JSONB), `meal_subscriptions` (student_id, plan_id, start, end, status).
- Optional; ships behind a toggle in Settings so schools without a cafeteria can hide it.

### 5. Analytics dashboard
New Admin tab `Analytics`:
- KPI cards: total students, staff, active parents, term revenue, outstanding fees, attendance %, admissions funnel conversion.
- Charts (recharts, already in deps): enrolment by class, fee collections over time, attendance trend (30d), admissions by stage, assignment submission rate.
- Materialise via SQL views: `v_enrolment_by_class`, `v_fee_collections_daily`, `v_attendance_trend`, `v_admission_funnel`, `v_assignment_completion`.
- CSV export per widget; date-range filter.

### 6. Global search & notifications inbox
- Admin command palette (⌘K) searching students, staff, parents, applications, invoices via a single RPC `global_search(q text)` returning typed results.
- User notification centre bell in `DashboardLayout`: reads from existing `notification_queue` filtered to current user, marks read, links to source.

### 7. Public site additions
- `/careers` page backed by new `job_openings` table (title, dept, type, description, closes_on, apply_email). Admin editor in Settings.
- `/events` public list sourced from `academic_calendar` public entries.

### 8. Housekeeping
- Wire `pg_cron` schedules for `expire_old_qr_tokens`, `cleanup_expired_otps`, `cleanup_old_rate_limits` (from Sprint E follow-up).
- Sweep remaining Supabase linter warnings: tighten public-read policies where safe, add `search_path = public` to legacy SECURITY DEFINER helpers, replace the SECURITY DEFINER view `v_student_term_scores` with a `security invoker` view + `has_role` guards.

### Deliverables
```text
[ ] Leave + Payroll tables, admin board, staff panel, payslip PDF
[ ] Transport routes/stops/assignments + parent view + optional fee link
[ ] Assets + movements + QR-scan integration
[ ] Meals module (feature-flagged)
[ ] Analytics tab with 5+ views and charts
[ ] Global ⌘K search + notification bell
[ ] Careers page + Events page
[ ] pg_cron schedules + linter sweep
```

### Notes
- All new `public` tables ship with GRANTs + RLS + updated_at trigger in the same migration.
- Payroll numbers are stored as `numeric(12,2)`; no floats.
- Transport driver phones are treated as PII and never exposed to unauthenticated routes.
- Analytics uses views (not materialised) for now; can promote to matviews later if load grows.

Approve to build.
