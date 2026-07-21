
## Root cause

The QR on the ID card encodes `${window.location.origin}/scan/<token>`. Two problems fall out of that:

1. **Origin is baked into the QR.** Cards printed from the Lovable preview embed `https://…lovableproject.com/scan/<token>`. Once you move to production, existing cards still point at the preview host. You asked for the live URL — QR must always embed `https://albari.com.ng/scan/<token>` regardless of where the card is generated.
2. **"Invalid token" on scan.** The RPC `record_student_scan` raises `Invalid token` when the UUID from the QR isn't in `student_qr_tokens` (or is revoked). Every current student has an active token, so this happens when the scanned card was printed against an **older token that was later rotated** by `issue_student_qr` (it revokes the previous one), or when the scanner picked up an old-format QR whose UUID is the student's `user_id` fallback — not a real token. Either way the station has no fallback path and no useful error.

## Fix

### 1. Live-URL QR payload
- Add `src/lib/scan-url.ts` exporting `SCAN_BASE_URL = 'https://albari.com.ng'` and `buildScanUrl(token)`.
- `StudentIDCard.tsx`: replace `window.location.origin` with `SCAN_BASE_URL`. Drop the `user_id` fallback (only real tokens are ever encoded; if `qr_token` is missing, encode admission number as plain text so scanners can still read it and manual-lookup works).
- `IDCardGenerator.tsx`: same base URL for any QR it draws directly.

### 2. Robust scan resolution
- New RPC `record_scan_by_ref(p_ref text, p_direction text)` (SECURITY DEFINER, `is_teacher()` gate):
  - Extract a UUID from `p_ref`; if found, look up in `student_qr_tokens` (active only).
  - If no UUID or no active token, treat `p_ref` (trimmed) as an **admission number** and resolve via `students.admission_number`.
  - On resolve, insert into `student_attendance` (same shape as today) and return the same JSON payload as `resolve_scan_token`.
  - Raises distinct messages: `unknown_reference`, `token_revoked`, `student_not_found` — surfaced verbatim in the toast.
- Keep `record_student_scan` for backwards compat.

### 3. Scan Station changes (`ScanStation.tsx`)
- Call `record_scan_by_ref` for all student scans (camera, USB wedge, manual entry). This makes admission numbers and rotated-token cards work.
- Show the RPC's error message in the toast instead of the generic "Invalid token".
- Small UX: after a successful scan, clear the manual field and briefly disable the camera decode to avoid double-fire (already partly there via `busyRef`).

### 4. Re-print guidance
- No auto-regeneration of already-printed cards. New QRs from now on carry the live-URL payload. Old cards still work as long as their token hasn't been rotated; if it has, admins can fall back to typing the admission number in the manual box.

## Out of scope
- DNS/hosting for `albari.com.ng/scan/*` — that route already exists in `App.tsx`; it will resolve as soon as the domain points at this app. No code change needed there.
- Staff and visitor flows (unchanged).

## Technical notes
- Files touched: `src/lib/scan-url.ts` (new), `src/components/admin/StudentIDCard.tsx`, `src/components/admin/IDCardGenerator.tsx`, `src/components/attendance/ScanStation.tsx`.
- One migration: `record_scan_by_ref` RPC + `GRANT EXECUTE … TO authenticated`.
