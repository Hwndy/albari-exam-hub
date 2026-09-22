# Close the remaining end-to-end verification gaps

## What remains

The core workflows and recent fixes are implemented, but two important checks are still not fully closed:

1. **Authenticated admin verification**
   - Sign in as the administrator and exercise the redesigned dashboard on desktop and phone-sized layouts.
   - Verify dashboard cards, charts, activity, refresh, and shortcut navigation into finance, admissions, students, attendance, exams, payroll, report cards, hostel, and System.
   - Open the searchable Audit Log and verify admin-only access, filters, pagination, CSV export, detail view, and redacted sensitive fields.

2. **End-to-end regression pass**
   - Run the critical journeys across public admissions, application tracking, documents, exams, interviews, decisions, offers, payment/enrolment, student placement, finance billing/payments/receipts, staff onboarding, parent-child access, teacher results, attendance scanning, timetables, hostel allocation, payroll, report cards, ID cards, and PWA update behavior.
   - Confirm empty, loading, error, print, download, and mobile states.
   - Recheck the two Project monitoring findings against the current preview and resolve them as fixed or stale. The current source already shows the staff add-mode fields and restores archived students to `active`, so these should not be treated as active defects without preview evidence.

3. **Public website readiness review**
   - Smoke-test every public page and navigation link, including Apply, Track Application, Accept Offer, payment callbacks, portal entry, news, gallery, careers, facilities, and not-found handling.
   - Record any remaining content or delivery dependency separately from code defects.

## Verification approach

```text
Public pages → application/payment callbacks → authenticated portals
                                      ↓
                admin workflows → staff/teacher/parent/student workflows
                                      ↓
             print/download/mobile/PWA/error-state checks → final checklist
```

## Technical details

- Use the existing `?tab=&subtab=` navigation contract and current Supabase/RLS protections.
- Do not change the dashboard RPC or remove the single-school architecture.
- Do not send real bulk messages or create real charges during testing.
- If authenticated preview access is unavailable, leave only those checks explicitly blocked and report the exact user action needed.
- Fix only regressions reproduced during this pass, then re-run the affected journey and update the roadmap checklist.
