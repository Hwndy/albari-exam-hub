
# Use albari.com.ng with Resend for All Emails

## Goal
Switch every outgoing email (offer letters, admission notifications, OTPs, bulk emails, fee reminders, etc.) from the default `onboarding@resend.dev` sender to a branded `albari.com.ng` address, using the existing Resend integration.

## Prerequisites (User Actions in Resend)
The domain must be verified in Resend before branded emails will deliver. The user needs to:

1. Go to https://resend.com/domains and click **Add Domain**.
2. Enter `albari.com.ng` (or a subdomain like `mail.albari.com.ng` — recommended to isolate from main MX).
3. Resend will display DNS records (SPF/TXT, DKIM/CNAME x3, and optional DMARC).
4. Add those DNS records in the domain registrar / DNS provider for albari.com.ng.
5. Click **Verify** in Resend until status = Verified (usually 5–30 min).

Until verification is complete, sending from `@albari.com.ng` will fail with a 403 from Resend. The code will still work — only the sender domain needs to be flipped once verified.

## Implementation Plan

### 1. Add a single sender constant via Supabase secret
Use the existing `SENDER_EMAIL` secret (already in the project) as the canonical "From" address. Set its value to:

```
Al-Bari College <admissions@albari.com.ng>
```

(Or whatever address the user prefers, e.g. `noreply@albari.com.ng`.)

### 2. Update edge functions to read `SENDER_EMAIL`
Currently several functions hard-code `onboarding@resend.dev`. Update these to use `Deno.env.get("SENDER_EMAIL")` with a safe fallback:

- `supabase/functions/send-offer-letter/index.ts`
- `supabase/functions/send-admission-notification/index.ts`
- `supabase/functions/send-otp/index.ts`
- `supabase/functions/send-bulk-email/index.ts` (already reads SENDER_EMAIL — verify default)
- `supabase/functions/send-fee-reminders/index.ts` (audit and align)
- `supabase/functions/accept-offer/index.ts` (if it sends mail)

Pattern:
```ts
const FROM = Deno.env.get("SENDER_EMAIL") || "Al-Bari College <admissions@albari.com.ng>";
```

### 3. Add Reply-To
Set `reply_to: "admissions@albari.com.ng"` on all admission/offer/notification emails so replies route to a real inbox.

### 4. Redeploy edge functions
Deploy all affected functions after the edit so Resend picks up the new sender.

### 5. Verification step
- Use the existing **Email Testing Panel** (Admin → Email Logs tab) to send a test of each notification type to a real inbox.
- Check `email_logs` table for `status = sent`.
- Confirm the recipient sees `From: Al-Bari College <admissions@albari.com.ng>` and that replies go to the right place.

## What I will NOT change
- Templates, copy, or branding inside the email bodies (already in place).
- Resend SDK or API key handling (`RESEND_API_KEY` is already configured).
- Retry/logging logic.

## Open questions
1. Which exact local-part do you want? Options: `admissions@`, `noreply@`, `info@`, or something else.
2. Do you want to use the root `albari.com.ng` or a subdomain like `mail.albari.com.ng` (recommended — safer for deliverability and won't interfere with the website's main mail).
3. Confirm you can add DNS records at albari.com.ng's registrar — without this, branded sending won't work.

Once you confirm 1–3, I'll make the code changes and deploy. The DNS/Resend verification you can do in parallel.
