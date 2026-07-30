## Goal

Bring back the "Create parent account" entry points, and fix every non-functional button/link found in a sweep of the public website, admin, teacher, student and parent surfaces.

## 1. Restore parent account creation

**Parent Portal card (`/website/portals`)**
- Keep every "Enter Portal" button pointing at plain `/login` (as requested earlier).
- On the Parent Portal card only, add a secondary link underneath: "New parent? Create an account" → `/login?mode=register&role=parent`.
- Replace the current generic footer note with the same link so it actually lands on the registration form.

**Sign-in page (`/login`)**
- `AuthPage` already reads `?mode=register` and `?role=parent`; today nothing links to it, so the CTA never appears.
- Show a permanent block under the sign-in form: "Are you a parent? Create a parent account" which switches the form to register mode with the Parent/Guardian role preselected — no longer gated behind `role=parent` in the URL.
- Keep the existing generic "Don't have an account? Create one" link.

**Admin side** — the "Add Parent" button in Admin › People › Parents already exists and works (invites via the `create-parent-account` function). No change needed; I'll verify it in the browser during QA.

## 2. Fixes from the site-wide audit

Findings from a full read of the website pages, `AdminDashboard`, teacher/student/parent dashboards, the sidebar navigation map and all router targets:

| Issue | Location | Fix |
|---|---|---|
| "Try Again" after a failed payment navigates to `/apply`, which is not a route → 404 | payment callback page | point it at the real application route `/website/admissions/apply` |
| "Download Brochure" button does nothing (no handler, no link) | Admissions page | wire it to the prospectus file if one is configured in site settings; otherwise hide the button rather than shipping a dead control |
| "Investigate" button in the live exam monitor activity feed does nothing | admin live monitor | open the existing student/session detail view for the flagged row |
| "Retake Exam (Coming Soon)" permanently disabled | student exam results | remove the stub button (an unusable control is worse than none); retakes stay an admin-scheduled action |

Verified as already working (no changes): all admin sidebar tabs resolve to real screens, every dashboard tab renders a real component, all website nav links resolve to registered routes, and every database table/view/function referenced by the frontend exists.

## 3. QA pass

Drive the running app in a headless browser and click through:
- `/website/portals` → parent card link → registration form opens with Parent role preselected.
- `/login` → parent CTA → register mode.
- Admissions page brochure button, payment-callback failure retry.
- Admin › People › Parents → Add Parent dialog opens and submits.
- A tab-by-tab pass over admin, teacher, student and parent dashboards, capturing screenshots of any screen that renders empty or errors, and fixing what surfaces.

## Technical notes

- Files touched: `src/pages/website/PortalsPage.tsx`, `src/pages/AuthPage.tsx`, `src/components/auth/LoginForm.tsx` (CTA slot), `src/pages/website/PaymentCallbackPage.tsx`, `src/pages/website/AdmissionsPage.tsx`, `src/components/admin/EnhancedLiveMonitor.tsx`, `src/components/exam/ExamResults.tsx`.
- No database migrations or edge function changes.
- Parent self-registration continues to use the existing `RegisterForm` path (email + phone, role `parent`); admin-created parents continue to use the invite function.
