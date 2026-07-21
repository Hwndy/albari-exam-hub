## Confirmed root cause

The scan RPC creates an `attendance_sessions` row with status `scan`, but the live database constraint only permits `scheduled`, `in_progress`, `completed`, or `cancelled`. This causes the exact error shown.

The related audit also confirmed:
- Attendance RLS policies exist but RLS is disabled on `attendance_sessions`, `student_attendance`, `staff_attendance`, `visitor_logs`, and `student_qr_tokens`.
- `anon` currently has full table privileges on those tables and can execute the scan/QR RPCs.
- Concurrent first scans could create duplicate daily scan sessions because there is no unique daily scan-session index.
- Staff scanning currently ignores the scanned card value and records attendance against the signed-in operator instead.
- All 362 students currently have an active QR token, so no token backfill is required.

## Implementation

1. **Repair daily student scan sessions**
   - Update the attendance-session status constraint to permit the intentional `scan` status.
   - Add a unique partial index guaranteeing one global scan session per date.
   - Rewrite `get_or_create_scan_session` to be concurrency-safe and usable only by authenticated teachers/admins through the recording RPC.
   - Keep class attendance sessions and existing status behavior unchanged.

2. **Harden student scan recording**
   - Keep support for full live URLs, raw UUID tokens, and admission/registration numbers.
   - Make repeated check-in/check-out scans update the same daily attendance row instead of creating duplicates.
   - Add a unique index for one student record per attendance session and make the RPC concurrency-safe.
   - Return clear application error codes for invalid, revoked, unauthorized, and unmatched cards.

3. **Fix related database security**
   - Enable RLS on all five attendance/scan tables that already have policies.
   - Remove broad anonymous write/read privileges from private attendance and QR data.
   - Restrict scan and QR-management function execution to `authenticated` and `service_role`; revoke execution from `PUBLIC` and `anon`.
   - Preserve teacher/admin management and parent access to linked children’s attendance.

4. **Correct staff scanning behavior**
   - Add a protected staff-scan RPC that resolves the scanned employee ID/card reference rather than using the operator’s account.
   - Record check-in and check-out times on the staff member’s single daily row, honoring the existing unique `(staff_id, date)` rule.
   - Update the scan station to pass the scanned value and show the resolved staff member/result.
   - Since no staff profiles currently exist, keep this ready for newly created staff without fabricating records.

5. **Validate related flows**
   - Test student scans using a full `https://albari.com.ng/scan/...` URL, raw token, and admission number.
   - Test first scan, repeat scan, check-in then check-out, revoked/invalid token, and unauthorized access.
   - Verify visitor sign-in/sign-out still works under enabled RLS.
   - Run the Supabase security linter and verify the attendance-specific findings are resolved without changing unrelated modules.