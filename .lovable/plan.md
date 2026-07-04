## Issues found

**1. "No class assigned" (—) in the ID Card Generator table**
`src/components/admin/IDCardGenerator.tsx` fetches students and profiles but never fetches `class_assignments` → `classes`. Every row's `student.class?.name` is `undefined`, so the Class column and class filter always show `-`.

**2. ID Card Preview does not match the school design**
The generator renders its own inline green gradient template (lines ~468–500 of `IDCardGenerator.tsx`) instead of the already-built `src/components/admin/StudentIDCard.tsx` component (green/yellow banded portrait card with logo, photo, name, admission #, class, QR). The Canva-referenced design maps closely to what `StudentIDCard` already produces, so the fix is to use that component.

**3. Where to update a student's profile**
Today `src/components/admin/StudentDetail.tsx` is read-only. Editing happens indirectly via `UserManagement → UserEditModal` (which only edits `profiles.full_name` / role) — there is no single place to edit a student's academic fields (DOB, gender, address, class, admission #, photo).

---

## Plan

### A. Fix Class column in ID Card Generator
In `IDCardGenerator.fetchData`:
- After loading `students`, also query `class_assignments` for those `student_id`s (note: `class_assignments.student_id` = `students.user_id`) and join to `classes` for names.
- Attach `class: { name }` to each `Student` so the table's Class column, the class filter, and the ID card preview all show the real class.

### B. Use the existing school-branded ID card in preview & downloads
In `IDCardGenerator.tsx`:
- Import `StudentIDCard` from `@/components/admin/StudentIDCard`.
- Replace the inline gradient card (the `<div ref={cardRef} className="w-[340px] h-[214px] bg-gradient-to-br ...">` block) with `<div ref={cardRef}><StudentIDCard student={...} school={...} /></div>`.
- Map data: `student.user_id`, `full_name`, `admission_number`, `photo_url` (from profile avatar), `class_name` (from step A); `school.name`, `address`, `logo_url`, `motto`.
- Update the batch PDF layout: `StudentIDCard` is portrait 340×540 px. Change `cardWidth/cardHeight` in `generateBatchCards` to portrait ID proportions (~54 × 85.6 mm) and 2 cards per row × 4 rows per A4 page so the PDF matches the new aspect ratio and doesn't stretch.
- Keep `html2canvas` at `scale: 3` for print quality.

### C. Make student profiles editable from Student Detail
In `src/components/admin/StudentDetail.tsx`:
- Add an "Edit Student" button in the header that opens a new `EditStudentDialog`.
- Create `src/components/admin/EditStudentDialog.tsx` with fields:
  - Profile: `full_name`, `avatar_url` (photo — used on the ID card)
  - Student: `admission_number`, `date_of_birth`, `gender`, `blood_group`, `address`, `status`
  - Class assignment: dropdown of school classes (upserts into `class_assignments`)
- On save: update `profiles`, update `students`, and upsert `class_assignments` (delete existing row for `student_id` then insert new) — all scoped to `schoolId` via `useSchoolQuery`.
- After save, reload the detail view.
- Also expose an "Edit" action on the ID Card Generator row (opens the same dialog) so admins can fix a missing photo/class right before printing.

### D. Copy tweaks
- ID Card Generator Class column empty state: keep `-` but the value will populate after A.
- Preview card header: show `school.motto` under the school name when present (already supported by `StudentIDCard`).

---

## Technical notes

- No DB migration required — all fields already exist on `profiles`, `students`, `class_assignments`, `classes`, `schools`.
- Multi-tenant: every new query/mutation goes through `useSchoolQuery` / explicit `school_id` filters per project rules.
- `class_assignments.student_id` stores the **auth user_id**, not `students.id` — the join uses `user_id`.
- No changes to the Canva design pipeline; we reuse `StudentIDCard` which already implements the green/yellow banded school card.

## Files touched
- `src/components/admin/IDCardGenerator.tsx` (fetch classes, swap preview to `StudentIDCard`, adjust PDF layout, add Edit action)
- `src/components/admin/StudentDetail.tsx` (add Edit button + reload)
- `src/components/admin/EditStudentDialog.tsx` (new)
