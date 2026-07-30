## 1. Student login IDs become firstname.lastname

Today enrollment mints `alb-2026-0364@students.albari.com.ng` from the admission number.

Change to `firstname.lastname@students.albari.com.ng`:
- Slugify first + last name (lowercase, strip accents/non a-z0-9, join with `.`).
- On collision (same name already taken by a different applicant), append the numeric tail of the admission number, then `-2`, `-3` as final fallbacks — so siblings and namesakes never clash.
- Applies in `verify-acceptance-payment` (new enrollments) and in `backfill-student-logins` (the "Fix student logins & parent links" admin button), so existing enrolled students can be migrated to the new format; their `login_email` on the application and the auth account email are both updated, and any regenerated temporary password is reported back to the admin.
- Admin StudentDetail / payment receipt / welcome email already display "Student Login ID", so they pick up the new format automatically.

Post-login access is already wired: student role + profile + class assignment are created at enrollment, `must_change_password` forces a password reset on first sign-in, then the student lands on their portal. I'll re-verify that path end to end after the change (sign in with a freshly minted ID, reset password, load dashboard/timetable).

## 2. Parent account creation

Parents can already self-register (Login → Create account → Parent / Guardian), but nothing points them there.
- On `/login`, when `?role=parent` is present, show a parent-specific hint and a "Create a parent account" button that opens the register form with Parent pre-selected.
- Same for `?role=student|teacher`: the register form opens with that role preselected where self-registration is allowed.
- Add a short "New parent? Create an account" line under the sign-in form.
- Parent Portal card on the website gets a secondary "Create parent account" link (`/login?portal=true&role=parent&mode=register`).

Admin-created parents (Admin → Parents) and the automatic parent account created at enrollment stay unchanged.

## 3. Portals page links

The portals cards read from CMS `website_settings.portals`, which can hold stale links from an older scheme; only the hardcoded defaults use `/login?portal=true&role=...`.
- Normalize each portal link at render: if the stored link isn't already a `/login?...` URL, map its role to `/login?portal=true&role=<role>`.
- Ensure the resulting links work both as in-app routes and as absolute URLs (`https://www.albari.com.ng/login?portal=true&role=parent`).

## Technical notes

- Files: `supabase/functions/verify-acceptance-payment/index.ts`, `supabase/functions/backfill-student-logins/index.ts`, `src/pages/AuthPage.tsx`, `src/components/auth/LoginForm.tsx`, `src/components/auth/RegisterForm.tsx`, `src/pages/website/PortalsPage.tsx`.
- No database migration required — `login_email` and `student_login_domain` already exist.
