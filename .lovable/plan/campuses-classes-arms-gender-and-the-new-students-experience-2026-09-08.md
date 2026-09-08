# Campuses, Classes & Arms, Gender, and the new Students experience

Goal: replace the flat class list (JSS 1 A, JSS1B, SSS 2 B, "JSS 1 IMEKE"...) with a proper structure — Campus → Class → Arm — record gender properly, rebuild the Students section as real pages with filters and export, and let fees target gender, campus, boarding and student type.

## What exists today (checked)

- Classes are flat names only: `classes` has just a name, no campus, no arm, no level. 30 rows, including duplicates written two ways (JSS 1 A and JSS1B) and Annex classes marked with "IMEKE".
- Students: 364 records (313 active). Gender is recorded on only 5 of them. There is no campus field and no enrollment history.
- Fee rules can target class, student type (new/returning) and category, but have no gender, campus or boarding condition.
- Students screen is one long accordion of classes with dropdown arrows.

## 1. School structure

New building blocks:

- **Campuses**: Main Campus and Annex Campus, each with name, code, address, phone, active/inactive. Never deleted, only deactivated.
- **Classes** become academic levels only: Nursery 1, KG 1, Basic 1…Basic 6, JSS 1–3, SSS 1–3, each with a display order.
- **Class offerings**: a level offered at a campus for a session (Annex JSS 1, Main JSS 1) — a class can exist at one campus and not the other.
- **Arms**: A, B, C under an offering. A class with no arms shows "Not applicable".
- **Enrollments**: one active record per student per session holding campus, offering, arm, student type and boarding. Arm changes, campus transfers and status changes create new history rows instead of overwriting.

## 2. Migration of existing classes (with your review)

I generate a proposed mapping from every current class name to campus + level + arm — anything containing "IMEKE" goes to Annex Campus, everything else to Main Campus; trailing A/B/C becomes the arm; "JSS 1 A" and "JSS1B" merge into the single JSS 1 level.

You see this mapping in an admin review screen ("Class structure migration") with every row editable and student counts shown. Nothing moves until you press Apply. The old class records and assignments stay in place as a fallback until you confirm the counts reconcile.

## 3. Gender

Gender becomes a required, controlled field (Male/Female) — never guessed from names. A "Missing gender" review list shows every student without it, with one-tap Male/Female and multi-select bulk set, plus a count badge so you can clear the backlog quickly. New students and enrollment from admissions cannot be saved without gender.

## 4. New Students experience

- **Students landing page**: cards/table of classes with Main / Annex / total counts, plus quick views (All, New, Returning, Male, Female, Boarding, Day). No more dropdown accordions.
- **Class page** (its own page): the roster for that class, with a Filter button, Add Student button and Export button kept visually distinct.
- **Filters**: campus, gender, arm, boarding, student type, status, admission year. They combine, show as removable chips, and have Apply / Reset.
- **Search**: by student ID or any part of the name, case-insensitive, debounced.
- **Export**: CSV and Excel of exactly the current filtered roster — Student ID, name, gender, campus, class, arm, student type, boarding, status, guardian, guardian phone.
- **Add Student**: campus limits the classes offered; class limits the arms; gender required.
- **Student profile**: identity block plus movement history (campus transfers, arm changes, boarding and status changes).

## 5. Fees

Fee rules gain optional conditions: gender, campus, arm, boarding status — alongside the existing class and new/returning targeting. A rule only evaluates the conditions you set on it. This makes "Friday Wear — Female ₦18,000" and "Friday Wear — Male ₦15,000" both compulsory but only billed to the right students, with no "JSS 1 Male" classes. Billing, invoice preview and the billing run all use the new conditions, and existing rules keep working unchanged (no conditions = applies to all).

## 6. Reports

Counts by campus, class, arm, gender, class+gender, campus+gender, day vs boarding, new vs returning, and fee liability broken down the same way — all computed in the database, not by loading every student.

## Technical notes

- New tables: `campuses`, `arms`, `campus_class_offerings`, `student_enrollments`, `student_movement_log`; `classes` gains `level_order` and loses its arm-in-the-name role; `students` gains `campus_id` convenience column kept in sync from the active enrollment; `fee_rules` gains `genders text[]`, `campus_ids uuid[]`, `arm_ids uuid[]`, `boarding text` — all nullable, meaning "no condition".
- Every new public table gets GRANTs, RLS enabled and policies (admin full, staff read scoped, students/parents self only), plus indexes on session, campus, offering, arm, gender and status.
- Server-side RPCs for the landing-page counts, filtered roster paging, export payloads and reports so the browser never fetches all students.
- `preview_student_bill`, `generate_invoices` and `student_billing_profile` extended to pass gender/campus/arm/boarding into rule matching.
- Migration is additive and reversible: legacy `class_assignments` are read as a fallback until the mapping is applied and reconciled.
- Existing student, ID card, report card, attendance, timetable and hostel screens updated to read class through the new structure.

## Order of work

1. Structure tables and RLS
2. Class-mapping review screen + apply
3. Gender field and missing-gender review
4. Students landing page and class pages with filters/search/export
5. Add/edit student and profile history
6. Fee rule conditions and billing integration
7. Reports
8. Reconciliation checks (totals before/after, one active enrollment per student, no duplicate IDs)
