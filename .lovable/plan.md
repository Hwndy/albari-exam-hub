
# Fix student login: temporary password + endless spinner

## What I verified in the code/database

- `verify-acceptance-payment` generates the temp password, creates the auth user, then emails it. On a retry it calls `updateUserById` with a **newly generated** password. The payment callback page (`PaymentCallbackPage.tsx`) calls the verify function from a `useEffect` with no in-flight guard, and the edge function has no lock — so two overlapping verifications can each set a different password and send two emails. Only the last one set actually works, which matches "the temporary password is not working".
- The enrollment email's default portal link is `https://www.albari.com.ng/auth`, but the app's login route is `/login` — that link is dead.
- Auth loading is fragile in `src/contexts/AuthContext.tsx`:
  - `login()` sets `isLoading = true` and, on the success path, never sets it back — it depends entirely on the `onAuthStateChange` listener finishing two database reads. If either read hangs or the listener doesn't re-fire, the app stays on the spinner forever (`ProtectedRoute`, `DashboardRouter`, and `AuthPage` all render a spinner while `isLoading` is true).
  - Both reads use `.single()`, which errors if a profile/role row is missing or duplicated.
  - The forced-password-change check uses `window.location.replace('/reset-password')` and returns while `isLoading` is still true.
- RLS does allow a student to clear their own `must_change_password` flag, so that is not the blocker.

The exact spinner trigger for this specific student is **not yet confirmed** — step 1 below confirms it before the fixes land.

## Plan

### 1. Reproduce and confirm (first step)
- Query the affected student's rows (`auth.users`, `profiles`, `user_roles`, `students`, `class_assignments`) to check for a missing profile, a missing role, or duplicate role rows.
- Drive a real browser login as a student against the preview, capture console output, and record where it hangs (auth resolution vs. a dashboard query).

### 2. Make auth loading impossible to hang
In `AuthContext.tsx`:
- Wrap the post-sign-in profile/role fetch so `isLoading` is always cleared in a `finally`, plus a safety timeout.
- Replace `.single()` with `.maybeSingle()` / a limited query so a missing profile or duplicate role rows degrade gracefully instead of dead-ending.
- Clear `isLoading` on the `login()` success path instead of relying only on the listener.
- Replace the hard `window.location.replace` redirect with a state flag (`mustChangePassword`) exposed by the context; route guards send such users to `/reset-password` and everyone else onwards, so no reload is needed and no loading state is stranded.

### 3. Make the forced password change stick
- In `ResetPasswordPage.tsx`, confirm the `must_change_password` flag update succeeded before signing out; surface an error if it didn't, so a user can never loop back into the reset screen silently.
- After a successful change, sign out and land on `/login` with a clear "sign in with your new password" message.

### 4. Stop the temporary password from being invalidated
- Add an in-flight guard (ref) in `PaymentCallbackPage.tsx` so verification is only invoked once per page load.
- In `verify-acceptance-payment`, make enrollment idempotent: if an auth account for the applicant already exists **and** the application is already enrolled, do not regenerate or reset the password and do not resend the credentials email.
- Keep the generated password simple/unambiguous (no characters that are easy to mistype or that get mangled by email clients) and render it in the email in a copy-friendly block.
- Fix the default portal URL in the enrollment email to the real login route.

### 5. Give admins a recovery path
- Add a "Reset & resend login credentials" action for an enrolled applicant/student in the admin admissions/students screen, backed by the existing `update-user-password` edge function plus a re-send of the credentials email. This fixes any student already stuck with a dead password (including the current one) without touching the Supabase dashboard.

### 6. Verify
- Re-run the browser flow end to end: sign in with a freshly issued temporary password, change it on `/reset-password`, sign back in, and confirm the student dashboard renders (no spinner).
- Re-query the database to confirm `must_change_password` is `false` and the role/profile rows are correct.

## Technical notes
- Files: `src/contexts/AuthContext.tsx`, `src/components/auth/ProtectedRoute.tsx`, `src/App.tsx` (route guard), `src/pages/ResetPasswordPage.tsx`, `src/pages/website/PaymentCallbackPage.tsx`, `supabase/functions/verify-acceptance-payment/index.ts`, `supabase/functions/send-admission-notification/index.ts`, plus one admin component for the resend action.
- No schema changes are expected; RLS on `profiles` already permits the self-update.
