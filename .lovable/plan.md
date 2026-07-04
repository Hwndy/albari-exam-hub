# Plan: ID Card Redesign + Student Detail Fixes

## 1. Rebuild `StudentIDCard` to match the Canva reference exactly

The uploaded reference (image-94) shows a very specific layout that our current component does not match. Rewrite `src/components/admin/StudentIDCard.tsx` to reproduce it faithfully at a fixed 340×540 canvas so both the on-screen preview and the html2canvas PDF output are pixel-identical.

Layout spec (top → bottom):
- **Top band (~90px)**: 
  - Left: a dark charcoal trapezoid slab overlapping a green trapezoid slab (green sits slightly lower-left, charcoal upper-right, both with angled right edges). A tiny yellow square tab sits under the charcoal slab.
  - Right: a solid yellow horizontal strip at the very top, and beneath it a block of diagonal green-and-white stripes (repeating 45° lines).
  - Card corners rounded ~14px; bands clipped to the rounded card.
- **Logo + school name row** (below top band, left-aligned, ~12px left padding):
  - School crest ~44×44 on the left.
  - Right of logo: single line "SCHOOL NAME" in bold dark green uppercase (~13px, tight tracking). No address line under it (reference shows only name).
- **Watermark**: two very faint diagonal green lines forming an X across the middle of the card (opacity ~0.08).
- **Photo circle** (centered, ~55% down):
  - 190×190 circle, 4px dark-green ring, light gray fill. Initials centered in dark green bold (~44px) when no photo.
- **Name + IDs** (centered, tight spacing under photo):
  - Full name in black, bold uppercase, ~17px, letter-spacing tight.
  - "ID: <admission_number>" in black semibold ~12px, ~4px below name.
  - Class name (e.g. "SSS 2 A") in black semibold ~11px directly under ID (NOT green — reference is black/dark).
- **QR code** centered, ~110×110, ~10px below class.
- **Bottom band (~55px)**:
  - Left: green angled trapezoid (rises from bottom-left, angled top edge going up-right).
  - Right: yellow angled trapezoid overlapping/behind green with a similar angle.
  - Small dark charcoal square at bottom-left corner tab.
- Font family throughout: Inter (already loaded).

Use inline styles + tailwind for exact pixel positions (all `absolute` positioning with numeric px values). Ensure `crossOrigin="anonymous"` stays on `<img>` tags so html2canvas can rasterize.

## 2. Ensure PDF matches preview
- `IDCardGenerator.tsx` already renders `<StudentIDCard>` and captures via html2canvas at scale 3 into a 340×540 PDF cell. No change needed beyond confirming portrait cell dimensions (54×85.6mm) and 2×4 per A4 page remains.
- Confirm the on-page preview uses the same component so desktop/mobile display is identical (component is fixed-width 340px; wrap in `overflow-x-auto` container if not already).

## 3. `StudentDetail.tsx` — Registration # and Age fixes

**Registration #**: The `students` table stores `admission_number` and `registration_number` as separate columns, but per user "admission number is the same as reg number". Change the "Registration #" row to fall back:
```
value={student?.registration_number || student?.admission_number}
```
So when only admission_number is populated, it still shows.

**Age auto-calculation**: Replace the raw `student?.age` display with a computed value derived from `student?.date_of_birth`:
```ts
const computeAge = (dob?: string) => {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
};
```
Render `computeAge(student?.date_of_birth)` in the Age row. Also apply the same in `EditStudentDialog` as a read-only computed display (no DB write needed — age stays derived).

## Files to change
- `src/components/admin/StudentIDCard.tsx` — full rewrite of visual layout.
- `src/components/admin/StudentDetail.tsx` — Age computed from DOB; Registration # falls back to admission_number.

No DB migration, no changes to `IDCardGenerator` logic, no backend changes.
