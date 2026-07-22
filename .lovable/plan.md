## Sprint E — Security, Compliance & Reliability

Sprints A–D shipped features. Sprint E hardens what exists: auth safety, audit trails, RLS/permission consistency, PII protection, and operational reliability. No new user-visible modules — the goal is a system admins can trust in production.

### 1. Auth hardening
- Enforce strong password policy in `RegisterForm.tsx` and `update-user-password` edge function (min 10 chars, mixed case + number, deny common passwords via zxcvbn-style check).
- Add rate limits on `send-otp`, `verify-otp`, `create-parent-account`, and login form (reuse existing `rate_limits` table + `cleanup_old_rate_limits`).
- Session timeout: auto sign-out after 30 min idle in `AuthContext.tsx` (configurable via `website_settings.session_timeout_minutes`).
- Force password change on first login for admin-created accounts (flag `must_change_password` on `profiles`).

### 2. Row-Level Security audit
- Sweep every table returned by `supabase--linter`: confirm each has `USING`/`WITH CHECK` matching role scope; remove any `USING (true)` leftover from multi-tenant purge.
- Tables to re-verify explicitly: `assignments`, `assignment_submissions`, `lesson_notes`, `grading_scales`, `fee_payments`, `student_attendance`, `parent_messages`, `announcements`, `gradebook_entries`, `admission_documents`, `admission_offers`, `admission_payments`, `staff_attendance`, `student_qr_tokens`.
- Confirm every `SECURITY DEFINER` function has `set search_path = public` (spot check flagged `auto_assign_teacher_class`, `update_updated_at_column`).
- Revoke `EXECUTE ... FROM PUBLIC` on any admin-only RPC (`create_user_with_profile`, `delete_user_profile`, `admin_link_parent_to_student`, `admin_unlink_parent`, `transition_admission_status`).

### 3. Audit logging
- Extend existing `EnhancedAuditLogs` coverage: DB trigger `audit_sensitive_writes()` on `user_roles`, `students`, `admission_applications` (status changes), `fee_payments`, `staff_details` writing to a new `audit_logs` table (actor, action, table, row_id, before/after JSONB, ip via `request.headers`).
- Admin UI `AuditLogViewer.tsx` (already exists — extend with filters: actor email, table, date range, action type; CSV export).
- Log every edge-function invocation for privileged ops (`create-student`, `delete-student`, `update-user-password`, `send-bulk-email`, `send-bulk-sms`, `paystack-reconcile`) via a helper `logEdgeAction(supabase, action, meta)`.

### 4. Storage & PII protection
- Move `admission-documents` bucket to private; serve via signed URLs from `AdmissionDocumentViewer.tsx` and edge function `get-admission-document` (auth-gated to admin or the applicant email).
- Enforce max file size (10 MB) and MIME allow-list (pdf/png/jpg) on upload in `AdmissionForm.tsx`, `StudentAssignments.tsx`, `AssignmentsManager.tsx`.
- Add `Content-Disposition: attachment` where user-uploaded files are served.
- Redact PII (email, phone, DOB) from client-side console logs — sweep `console.log` calls in `src/**` and gate behind `import.meta.env.DEV`.

### 5. Input validation everywhere
- Add zod schemas to every edge function that touches user input:
  `submit_admission_application` payload, `create-parent-account`, `create-student`, `link_parent_to_student`, `send-bulk-email/sms`, `initialize-fee-payment`, `record_scan_by_ref`.
- Client forms: replace ad-hoc validation with zod resolvers in `AdmissionForm.tsx`, `AddParentDialog.tsx`, `EditStudentDialog.tsx`, `AssignmentsManager.tsx`, `ManualScoresEntry.tsx` (length caps, email/phone regex, numeric ranges).

### 6. CORS & webhook safety
- Lock down CORS: replace `Access-Control-Allow-Origin: *` in edge functions with an allow-list read from `ALLOWED_ORIGINS` secret (albari.com.ng + preview domain).
- Verify Paystack signature (`x-paystack-signature`) inside `paystack-webhook` using HMAC-SHA512 with `PAYSTACK_SECRET_KEY`; reject invalid signatures with 401.
- Verify Resend + push notification callbacks similarly if applicable.

### 7. Financial integrity
- Idempotency: unique index on `fee_payments.paystack_reference`, `admission_payments.paystack_reference`; wrap verify handlers to no-op on duplicate reference.
- Prevent negative or over-payment: DB trigger `validate_fee_payment()` ensuring `amount_paid > 0` and `paid_amount ≤ installment.amount`.
- Reconciliation report: daily edge function `paystack-daily-reconcile` writing discrepancies to `paystack_webhooks` + admin dashboard alert badge.

### 8. Backups & observability
- Enable Supabase point-in-time recovery reminder in `SettingsHub` (informational card + link).
- Add `/api/health` edge function returning DB + storage + resend status for uptime monitoring.
- Frontend error boundary `src/components/ErrorBoundary.tsx` wrapping route root, reporting to console + optional Sentry hook (leave DSN empty — user can fill later).

### 9. Data retention & cleanup
- Cron edge functions (scheduled via Supabase):
  - `cleanup-expired-otps` — call existing `cleanup_expired_otps()` daily.
  - `cleanup-rate-limits` — call `cleanup_old_rate_limits()` daily.
  - `expire-old-qr-tokens` — revoke `student_qr_tokens` older than 90 days.
- Add `deleted_at` soft-delete columns on `students`, `parents`, `admission_applications`; update RLS to exclude soft-deleted rows from non-admin queries.

### 10. Security scan & memory
- Run `security--run_security_scan`, triage findings, mark false positives via `manage_security_finding`, update `@security-memory`.
- Add pre-publish checklist card to Admin Settings: "Resend verified", "Paystack webhook signature verified", "RLS linter clean", "No public buckets with PII".

### Deliverables checklist
```text
[ ] Password policy + rate limits + idle timeout + must-change-password
[ ] RLS sweep migration + linter clean
[ ] audit_logs table + trigger + viewer extension
[ ] admission-documents → private + signed URLs
[ ] File-upload MIME/size guards across upload points
[ ] zod validation on all mutating edge functions + key forms
[ ] CORS allow-list + Paystack signature verification
[ ] fee_payments idempotency + validation triggers
[ ] Health endpoint + ErrorBoundary
[ ] Cleanup cron functions + soft-delete columns
[ ] Security scan triaged + memory updated
```

### Technical notes
- Migrations run in order per section; each new table gets full GRANT + RLS block.
- No breaking client changes — private admission bucket ships with a compatibility signed-URL helper so existing components keep working.
- Cron uses `pg_cron` extension if already enabled; otherwise document manual scheduling.
- Sentry integration is optional and disabled by default.

Approve to build.