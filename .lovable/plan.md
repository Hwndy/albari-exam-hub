# Fix the dashboard and verify the recent platform work end to end

## Confirmed issue

The screenshot’s `Cannot read properties of undefined (reading 'rest')` error comes from the redesigned dashboard detaching `supabase.rpc` from its Supabase client before calling `get_dashboard_overview`. The database function exists; the browser call loses the client context.

## Implementation

### 1. Repair and harden the admin overview
- Call `get_dashboard_overview` through the Supabase client normally, preserving its internal connection.
- Validate the returned payload before rendering so missing or older fields show safe empty states instead of crashing.
- Keep retry and live refresh working without clearing already-loaded dashboard data during a quiet refresh.
- Correct overview shortcuts so each card and quick action opens the intended finance, admissions, student, attendance, exam, payroll, and report-card screen.

### 2. Verify the recent fixes as connected workflows
Use the September 7–17 change record as the regression scope and test the actual user journeys, not isolated screens:

- **Dashboard:** cards, charts, attention counts, activity, refresh, navigation, desktop and phone layouts.
- **Students and structure:** active/archive filtering, Main/Annex campus, levels and arms, class rosters, add/filter/export, placement synchronization, gender review.
- **Finance:** fee rules, bill generation, student balances, optional/compulsory/boarding charges, cash payment, receipt preview/print, retirement protection, reconciliation, payroll approval and live refresh.
- **Admissions:** public application, NIN and required documents, tracking, document review, exams, interviews, decisions, offers, online/offline acceptance payment, enrolment and class placement.
- **Accounts and portals:** staff creation/editing, temporary-password change, parent-child linking, sibling handling, parent fee/results/attendance views.
- **Academic operations:** timetable assignments, attendance scanning, gradebook/results saving, report cards, ID cards, promotion, and archived-student exclusion.
- **Platform delivery:** route integrity, mobile navigation, stale-version/PWA update behavior, and browser console/network failures.

### 3. Fix regressions found during verification
- Trace failures to the responsible screen, database function/policy, or edge function and fix the shared cause rather than adding screen-specific workarounds.
- Preserve the single-school architecture and current public/admin URLs.
- Keep all protected data restricted by existing role checks and RLS; no privileged key enters browser code.
- Add focused regression tests where practical for payload normalization, navigation mapping, and other deterministic failures found in the audit.

### 4. Final validation and handoff
- Run lint and the project’s available automated checks.
- Exercise the critical public, admin, staff, parent, and student paths with authenticated browser sessions where available.
- Verify desktop and mobile layouts, printing paths, downloads, and empty/error states.
- Provide a concise pass/fail checklist showing what was fixed, what was verified, and any item blocked by external credentials or delivery services.

## Technical notes

- The first code correction is in `AdminOverview`: do not store/call an unbound reference to `supabase.rpc`.
- Database changes will only be made if a failing journey proves they are required; any change will retain existing records and permissions.
- Email/SMS/Paystack delivery will be tested through safe non-destructive paths and logs; no real charge or bulk message will be sent without explicit authorization.
