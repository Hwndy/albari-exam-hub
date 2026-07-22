
# Outstanding Work — Full Application Audit

Based on a scan of `src/pages`, `src/components`, `supabase/functions`, and recent chat history (post multi-tenancy removal, fees overhaul, scanning system, parent portal, CMS wiring). Items marked ⚠️ are gaps that break user-visible workflows; ✨ are enhancements; 🔒 are security/ops hardening.

---

## 1. Public Website (`/`)

⚠️ **Broken / missing**
- **News detail page** — `/news/:slug` reuses `NewsPage` instead of a dedicated article view (no article body, no share, no related posts).
- **Gallery page** — no public route; `gallery` table + admin `GalleryManager` exist but nothing renders them.
- **Contact page** — no route, no contact form; only WhatsApp float button.
- **Search** — no site search across news/pages.
- **404 branded page** for website routes (currently generic `NotFound`).

✨ **Enhancements**
- Blog/News categories & pagination.
- Events calendar surfaced from `academic_calendar`.
- Newsletter subscription is UI-only — no backing table or edge function.
- SEO: per-page meta/OG tags (only home has JSON-LD); sitemap.xml + robots refinements.
- Alumni page, careers/vacancies page, downloads (prospectus PDF).
- Cookie/consent banner.

---

## 2. Admin Dashboard

⚠️ **Broken / missing wiring**
- **Bulk student import** (CSV/Excel) — single-create only; `export-users` edge function not surfaced in UI.
- **Bulk report cards** — `ReportCardGenerator` is single-student; no class-wide batch generation or email-to-parent.
- **Staff documents upload** — `staff_details.documents` JSONB has no upload UI.
- **Library fines** — dates tracked, no fine calculation/collection screen.
- **Notification preferences enforcement** — bulk senders ignore per-user opt-outs stored in `push_subscriptions` / settings.
- **Audit logs** — basic `AuditLogs.tsx` orphaned; only Enhanced used in SuperAdmin (which no longer exists post-multitenancy removal → likely dead code to clean up).
- **Settings page** — no `/admin/settings` for school profile, email domain, Paystack keys UI, branding.
- **Announcements composer** — `announcements` table exists, no admin CRUD screen (only `ParentAnnouncements` subset).
- **Academic sessions/terms manager** — `is_current` toggling only via SQL; no UI.
- **Grading scale editor** — table exists, no editor.
- **Timetable auto-generator** — manual only.

✨ **Enhancements**
- Financial reports dashboard (daily/monthly/yearly charts, by-class breakdown).
- Admissions analytics widget improvements (funnel drop-off).
- Live exam monitor performance (real-time subs).
- Dark mode toggle.

---

## 3. Teacher Dashboard

⚠️ **Broken / missing**
- **Lesson notes / scheme of work** module — none.
- **Homework/assignments** submission workflow — none (only exams + gradebook).
- **Comments on student report cards** — `report_card_comments` table exists, no per-teacher comment entry UI.
- **Class register printing** — no PDF export from attendance.
- **Timetable printing/export** — view exists, no PDF/CSV.
- **Bulk grade import** for offline CA scores — `ManualScoresEntry` is one-at-a-time.

✨ **Enhancements**
- Question bank sharing between teachers with tags.
- Essay auto-grading assist (LLM).
- Attendance heatmap per class.

---

## 4. Parent Dashboard

⚠️ **Broken / missing**
- **Report card download** — parents can view results but no PDF of official report card.
- **Fee receipts** — receipt PDF exists; verify it's wired for every completed payment (older payments may lack it).
- **Installment plan opt-in** — admin creates plans; parents have no self-service enrollment UI.
- **In-app notifications inbox** — announcements shown but no read/unread state, no push wiring for parents.
- **Multi-child fee summary** — currently per-child; no consolidated "all children" total owed view.
- **Communication with teachers** — `CommunicationHub` is announcement-only; no threaded messaging.
- **Child profile edit request** — parents cannot request corrections (address, phone) with admin approval.

✨ **Enhancements**
- Calendar sync (iCal export) of academic calendar + exam dates.
- Attendance push alerts on absent/late scans.

---

## 5. Student Dashboard

⚠️ **Broken / missing**
- **Assignments/homework** hand-in (mirrors teacher gap).
- **My results history** across terms — single-exam view only; no term summary page for students.
- **Report card download** — students cannot self-serve.
- **Library**: catalog browse exists; **reservation/hold** flow missing; personal loan history minimal.
- **Timetable print/export**.
- **Profile & password change** — no `/settings` for students to update photo, contact, password.

✨ **Enhancements**
- Study progress / achievements gamification.
- Push notifications for new results / announcements.

---

## 6. Attendance / Scanning

⚠️ **Broken / missing**
- **Visitor logging UI** — `visitor_logs` table exists; scanner has no visitor mode form.
- **Staff ID cards** — student ID cards done; staff ID card generator missing.
- **Attendance reports** — no admin screen aggregating `attendance_summary` (daily/weekly/monthly export).
- **Absentee auto-notification** — no cron to notify parents of absence.

---

## 7. Admissions

⚠️ Verify since recent fixes
- **Interview email deliverability** — Resend domain `albari.com.ng` verification status.
- **Offer acceptance PDF** — letterhead integrated; confirm signed offer/acceptance return upload.
- **Post-enrollment auto-provisioning** — when application → `enrolled`, no automatic `students` + `profiles` + auth user creation.

---

## 8. Edge Functions / Backend Ops

🔒
- **Cron schedules** missing for: `send-fee-reminders`, `cleanup_expired_otps`, `cleanup_old_rate_limits`.
- **Absentee notifier** cron.
- **Paystack webhook** — verify signature check present; reconcile function exists but webhook flow not audited.
- **Leaked-password protection** + **MFA** in Supabase Auth: disabled.
- **Storage policies** — `admission-documents` bucket is public; move to signed URLs for PII.
- **Error monitoring** (Sentry) not wired.
- **Backup/restore** tooling absent.

---

## 9. Code Quality / Performance

- Route-level `React.lazy` splitting on `App.tsx` (bundle >5MB, PWA cache raised to 6MB as workaround).
- Pagination on `LibraryManager`, `StudentsByClass`, `AuditLogs`, `PaymentsList` (Supabase 1000-row cap).
- Remove `(supabase as any)` casts left in `BulkNotificationSender` / `LibraryManager`.
- Dead code cleanup post multi-tenancy removal: any lingering `school_id` references, orphaned super-admin screens, unused `useSchoolQuery` hooks.
- `AdminDashboard.tsx` still ~500+ lines — split by route.

---

## 10. Cross-cutting Features Not Started

- **Transport** (routes, drivers, buses, student assignments).
- **Hostel/Boarding** management.
- **Inventory / assets**.
- **Cafeteria / meals**.
- **Health/medical records** (beyond `medical_info` text).
- **Disciplinary records**.
- **HR/Payroll** (payslips, leave).
- **Alumni portal**.
- **Real-time chat** (Supabase Realtime).
- **Video conferencing** integration.
- **i18n** (English only).
- **Native mobile shell** (Capacitor).

---

## Recommended sequencing

If you want, I can turn any group below into its own concrete build plan:

1. **Sprint A — Close user-visible gaps** (1–2 days): admin Settings page, admin Announcements composer, sessions/terms manager, parent/student report-card PDF download, staff ID card generator, visitor scan mode.
2. **Sprint B — Comms & reports** (2–3 days): bulk report cards + email-to-parent, financial reports dashboard, attendance reports + absentee cron, parent messaging inbox.
3. **Sprint C — Website polish** (2 days): dedicated news article page, public gallery, contact page + form, sitemap/SEO per page, newsletter backend.
4. **Sprint D — Academics depth** (3–5 days): homework/assignments module, lesson notes, teacher report-card comments UI, grading-scale editor, bulk student import.
5. **Sprint E — Hardening** (1–2 days): cron schedules, MFA + leaked-password, private `admission-documents` storage, code-splitting, Sentry.
6. **Sprint F — New modules** (per business priority): Transport / Hostel / HR / Chat / i18n.

**Which sprint (or specific items) should I build next?**
