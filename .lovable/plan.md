
## Part 1 — What's left (audit of the app)

After scanning the codebase, here's the honest gap list against a "state-of-the-art" school management system. Grouped by area, with priority.

### Attendance (biggest gap)
- `student_attendance` table exists but there is **no scanning workflow** — teachers mark manually only.
- No staff clock-in/out from ID scan (`staff_attendance` table is unused end-to-end).
- No visitor log at all (no table, no page).
- No parent-visible daily attendance push/SMS on absence.

### Identity / ID cards
- `StudentIDCard.tsx` QR payload is ad-hoc JSON, not a signed/canonical token → cannot be trusted by a scanner.
- No staff ID card generator, no visitor badge.
- No bulk print (whole class → single PDF sheet, cut-ready).
- Photo upload works per-student but no batch photo import.

### Academics / results
- Report card: publishing workflow exists but no **parent-visible "Published" gate** — parents currently see draft-quality data.
- No cumulative (year) report card, only per-term.
- No subject teacher comment vs class teacher comment split on the printed card.
- Broadsheet has no export-to-Excel.

### Fees
- Installment plans exist, reminders exist, but **no receipt PDF** after payment (parents get only a toast).
- No outstanding-balance dashboard widget on parent home.
- No fee waiver / scholarship flag on student.

### Communication
- Bulk email/SMS exist; **in-app messaging (parent ↔ teacher, teacher ↔ admin) missing**.
- No announcement targeting by class (only by role).
- Push notifications wired but not fired on: new grade published, fee due, attendance absence.

### Timetable
- Admin can build; **students/teachers view exists** but no "today" widget on dashboards, no ICS export.

### Library
- `library_books` + `book_issues` exist; **no due-date reminders, no fines calculation, no student self-service reservation**.

### Admissions
- Solid. Missing: applicant portal login (currently email+app# tracking only), and offer-letter e-signature.

### Website / CMS
- Homepage rich. Missing: **events calendar page**, staff/faculty page (data model exists via `staff_details`), and downloads/resources page.

### Ops / admin
- No **audit log viewer** surfaced (table exists via `EnhancedAuditLogs` but not linked everywhere).
- No **backup/export** button for full school data.
- No system health page (email delivery %, failed webhooks).

### Security / compliance
- No 2FA for admin/teacher.
- Session monitor exists client-side only; no server-side revoke.

---

## Part 2 — This turn's build (what you explicitly asked for)

### A. Rework Student ID Card design
Restart from a cleaner, more premium art direction — less "template", more school-brand:
- Portrait 54×86mm, dual-side (front + back), true bleed-safe margins.
- **Front**: full-bleed brand-green header with letterhead crest, large circular photo with lemon-green ring, name in display serif, class + reg # in mono, subtle guilloché watermark of school monogram.
- **Back**: emergency contact, blood group, session validity, QR (large, high-EC), signature line for Principal, small anti-copy microtext strip.
- Clean semantic tokens only (no hard-coded hex except brand green/lemon already in theme).
- Print CSS updated to double-sided; PNG export renders both sides stacked.

### B. Canonical, verifiable QR for every student
- New table `student_qr_tokens(student_id, token uuid unique, issued_at, revoked_at)` — one active token per student, rotated on demand.
- New RPC `issue_student_qr(student_id)` and `resolve_scan_token(token)` — SECURITY DEFINER, returns minimal card (student id, name, adm#, class, photo, status).
- QR payload becomes a short URL: `https://<host>/scan/<token>` (also embeddable as raw token for offline verify).
- Backfill: on migration, auto-issue tokens for **all existing students**.
- ID card generator reads token from the table (no more inline JSON).

### C. ID-card scanning attendance (students, staff, visitors)
- New page `/attendance/scan` (role: admin, teacher, security).
- Component `ScanStation.tsx`:
  - Uses `@zxing/browser` (add dep) for camera-based QR reading; falls back to USB HID scanner (keyboard-wedge input listener) and manual entry.
  - Modes: **Student check-in / check-out**, **Staff clock-in / clock-out**, **Visitor sign-in / sign-out**.
  - On scan: calls `resolve_scan_token`, shows big confirm card (photo, name, class), plays sound, writes to correct table.
- Tables:
  - Extend `student_attendance` with `scanned_at`, `scan_direction` (in/out), `scanned_by`.
  - Reuse `staff_attendance` with same shape.
  - New `visitor_logs(id, full_name, phone, purpose, host_staff_id, badge_no, signed_in_at, signed_out_at, signed_in_by)` + printable visitor badge (reuses ID card layout in "visitor" variant).
- Live "Present today" counter on admin dashboard.
- RLS: admin+teacher write; parent read own child rows only.

### D. Small dashboard adds tied to scanning
- Admin: "Today's attendance" card (students present / staff present / open visitors).
- Parent: shows today's check-in time if scanned.
- Teacher: class roster shows a green dot for scanned-in students.

---

## Out of scope this turn
Everything in Part 1 that isn't A/B/C/D — I've listed it so we can sequence next rounds. Say the word and I'll pick the next batch (my suggestion: in-app messaging + report card publish gate + fee receipts).

## Technical notes
- New deps: `@zxing/browser`, `@zxing/library`.
- New route in `App.tsx`: `/attendance/scan`.
- New edge function not needed — RPCs cover it.
- Migration order: create `student_qr_tokens` + `visitor_logs` (with GRANTs + RLS), extend attendance tables, backfill tokens, then ship code.
