# Parent Portal Workflow

## How parents get an account

### Parent self-registration
1. Open `/login`, choose **Create account**, then select **Parent / Guardian**.
2. Enter a full name, email, phone number, and password. No registration token is required; `4250645` belonged to the retired multi-school gate.
3. Confirm the email when confirmation is enabled, then sign in at `/login`.
4. A successful signup automatically creates the account profile, the parent role, and the parent record.

### Admin-created parent
1. Go to **Admin Dashboard → Users → Add User** and choose **Parent / Guardian**.
2. Enter the parent's real name, email, and phone. Optionally choose a student and relationship/access settings.
3. The parent receives a secure invitation and sets their own password. Admins never know or store the password.
4. Creating a parent does not sign the administrator out.

## Linking children

- A parent may link multiple children from **Overview → Link a child**.
- Self-service linking requires the student's exact admission number and date of birth.
- An administrator may link a child while creating the parent account.
- Admission number and date of birth are verification factors; support staff should correct the student record rather than bypassing a mismatch.
- A linked student may display **Not assigned** until an administrator assigns a class. This does not mean the parent link failed.

## Dashboard sections

- **Overview:** all linked children and their class/status.
- **Academics:** subject scores by session and term, when grade access is enabled.
- **Report Cards:** report cards that an administrator or teacher has published.
- **Attendance:** recent attendance and attendance rate, when attendance access is enabled.
- **Fees:** class/general fees, balances, installments, Paystack payment, receipts, and payment history.
- **Messages:** parent/all-audience school announcements. Direct messaging is not currently enabled.
- **Calendar:** published academic events.
- **Settings:** parent details and notification preferences.

## Data protection

Each parent-child relationship has separate `can_view_grades`, `can_view_attendance`, and `can_view_fees` permissions. Database access rules use the signed-in parent identity and the verified relationship. A parent must not be able to read results, attendance, fees, or initiate payment for an unlinked student.

## Fee payment flow

1. The parent selects a fee or installment for a linked child.
2. The server verifies the parent-child relationship and amount before contacting Paystack.
3. Paystack returns the parent to `/fees/payment-callback`.
4. The server verifies the reference and amount directly with Paystack, records completion, and issues a receipt number.

## Common support checks

- **Parent opens the student dashboard:** verify the `parent` row exists in `user_roles`; the app no longer silently defaults a missing role to student.
- **Child cannot be linked:** compare the admission number and date of birth with the student record exactly.
- **Class says Not assigned:** create or correct the student's class assignment.
- **No results/report card:** enter/tag scores for the selected term and publish the report card.
- **No fees:** configure a general fee or a fee structure for the student's class.
- **Payment does not start:** verify Paystack configuration and that the parent has fee access for that child.
- **No invitation email:** confirm the email is correct and review Supabase authentication email delivery.

## Admin onboarding checklist

- Use the parent's real email and phone.
- Select the correct child and relationship.
- Confirm grade, attendance, and fee permissions.
- Ask the parent to use the invitation to set a private password.
- Confirm the child appears in the portal; assign a class separately if it shows **Not assigned**.