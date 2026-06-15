## Root causes

**1. Application number is blank** — every new applicant gets `application_number = ''`, so tracking fails.

- The trigger `set_application_number` only fires `WHEN (new.application_number IS NULL)`.
- The `submit_admission_application` RPC inserts `''` (empty string) for `application_number`, so the trigger never runs and the row is saved with no number.
- Confirmed in DB: most recent row has `application_number = ''`.

**2. Admin admissions pages all show "permission denied for table users"** (Applications, Pipeline, Entrance Exams, Interviews, Payments).

- Several RLS policies subquery `auth.users` directly, e.g.:
  ```
  email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())
  ```
  on `admission_applications`, `admission_interviews`, `admission_payments`, `admission_exam_assignments`.
- PostgREST runs queries as the `authenticated` role, which has **no SELECT on `auth.users`** — so every query that touches these tables is rejected before the admin branch of the policy is even evaluated. That's the exact error the admin sees.

## Fix (single migration + tiny RPC tweak)

### A. Replace `auth.users` references in RLS with a SECURITY DEFINER helper

Add:
```sql
CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$ SELECT email::text FROM auth.users WHERE id = auth.uid() $$;
```

Then DROP + recreate the four offending policies to use `get_user_email()` instead of the inline subquery:
- `admission_applications` → "Users can view own applications"
- `admission_interviews` → "Applicants can view their interviews"
- `admission_payments` → "Applicants can view their payments"
- `admission_exam_assignments` → "Applicants can view their exam assignments"

This unblocks all five admin tabs immediately (admin branch of each policy already works once the `auth.users` lookup stops failing).

### B. Fix application-number generation

Two complementary changes so it can never break again:

1. **Update `submit_admission_application` RPC** to insert `NULL` (not `''`) for `application_number`, letting the existing `set_application_number` trigger fire.
2. **Harden the trigger** so it also fires when the value is an empty string:
   ```sql
   DROP TRIGGER set_application_number ON public.admission_applications;
   CREATE TRIGGER set_application_number BEFORE INSERT ON public.admission_applications
     FOR EACH ROW
     WHEN (NEW.application_number IS NULL OR NEW.application_number = '')
     EXECUTE FUNCTION generate_application_number();
   ```
3. **Backfill** the one existing row that has `application_number = ''` so that applicant can finally track:
   ```sql
   UPDATE admission_applications
   SET application_number = NULL
   WHERE application_number = '';
   -- then re-run the generator via a no-op UPDATE that triggers BEFORE INSERT? No —
   -- instead call generate directly:
   UPDATE admission_applications
   SET application_number = 'APP' || to_char(now(),'YYYY') || '-' ||
       lpad(nextval('admission_app_seq')::text, 6, '0')
   WHERE application_number IS NULL OR application_number = '';
   ```

### C. No frontend changes required
The admin components (`AdmissionManagement`, `AdmissionDecisionBoard`, `AdmissionExamScheduler`, `InterviewsTab`, `AdmissionPaymentVerification`) already query the right tables — they just need the RLS fix to start returning data. The `AdmissionForm` already reads `application_number` from the RPC response, so once the RPC returns a real number the tracking flow works end-to-end.

## Out of scope
- Visual redesign of the admin pages.
- Reworking the offer/acceptance flow (still functional, not in the error set).
