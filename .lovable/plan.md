## Plan

1. **Restore uploaded documents in admin review**
   - Fix the application form so uploaded document metadata is saved with the correct field used by the database.
   - Stop silently ignoring document-save failures after storage upload.
   - Backfill existing uploaded files already in storage for affected applications so the admin review modal shows them.
   - Update the admin document viewer download path handling so it works whether the database stores a storage path or a public URL.

2. **Fix admission tracking and offer workflow**
   - Keep the secure tracking function as the public lookup source, but expand the tracker UI to show real interview, payment, exam, and offer details returned by the function.
   - Add an “Accept Offer” action in the tracker when an active offer exists.
   - Fix the public offer acceptance page so it can load offer details by token without relying on applicant login/RLS.
   - Align offer statuses so a newly sent offer is actually accept-able instead of being treated as already processed.

3. **Fix interview notification emails**
   - Update the notification function to correctly detect provider send failures instead of logging them as successful.
   - Surface clear admin feedback if email delivery fails.
   - Include scheduled date, time, type, and location consistently in both the tracking page and email template.

4. **Fix offer-letter sending**
   - Correct the `pdfFileName is not defined` crash in the offer-letter function.
   - Ensure the generated PDF is stored, linked to the offer, and attached/sent correctly.
   - Update the function to create/update offers with an accept-able status and a valid acceptance token/link.
   - Improve frontend error messages so admins see the real reason when sending fails.

5. **Database/security adjustments**
   - Add or repair the public-token offer lookup/decision backend path so applicants can accept/decline from email without signing in.
   - Remove remaining direct `auth.users` lookups in admission offer/document applicant policies where they can break access.
   - Preserve admin school isolation for all admission tables.

6. **Validation**
   - Test the current sample application (`APP2026-000005`) through: document display, tracker lookup, schedule interview email path, send offer letter, open acceptance link, accept/decline flow.
   - Check Edge Function logs after fixes for clean delivery errors/success states.