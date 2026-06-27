
# Use albari.com.ng with Resend for all emails

## Current state (good news)

The edge functions are already wired to send from `@albari.com.ng`:

- `send-offer-letter` → `admissions@albari.com.ng` (with reply-to)
- `send-admission-notification` → `admissions@albari.com.ng` (with reply-to)
- `send-otp` → `noreply@albari.com.ng` (with reply-to)
- `send-bulk-email` → falls back to `noreply@albari.com.ng`
- All read `SENDER_EMAIL` / `REPLY_TO_EMAIL` from secrets first.

`SENDER_EMAIL` and `RESEND_API_KEY` are already saved.

**So no code change is required to switch the sender.** What is missing is the one thing only the domain owner can do: **verify `albari.com.ng` in Resend via DNS**. Until that's done, Resend will reject every send from `@albari.com.ng` with a 403 and emails will fail.

## What I'll do

1. **Align `SENDER_EMAIL` secret** to the exact address you want as the public "From". Recommended:
   - `Al-Bari Group of Schools <admissions@albari.com.ng>` — best for admissions/offer letters, replies go to a real inbox.
   - Alternative: `noreply@albari.com.ng` if you want a no-reply style.
   Confirm which (or give me a different local-part) and I'll update the secret. No code change needed beyond that.

2. **Audit the two remaining mail-touching functions** and align them to use `SENDER_EMAIL` / `REPLY_TO_EMAIL` the same way as the others:
   - `supabase/functions/send-fee-reminders/index.ts`
   - `supabase/functions/accept-offer/index.ts` (only if it actually sends mail — will check and skip otherwise)

3. **Redeploy** any function I touch so Resend picks up the change.

4. **Test path**: use the existing Admin → Email Logs → Email Testing Panel to fire one email of each type (submitted / accepted / offer / OTP) to your inbox, then check `email_logs.status = 'sent'` and confirm the `From:` header reads `Al-Bari Group of Schools <admissions@albari.com.ng>`.

## What you must do in Resend (cannot be automated)

This is the actual blocker — without it nothing from `@albari.com.ng` will deliver.

1. Go to https://resend.com/domains → **Add Domain**.
2. Enter `albari.com.ng` (or a subdomain like `mail.albari.com.ng` — recommended, keeps transactional mail isolated from your main MX so a misconfig can't break info@ inboxes).
3. Resend shows ~5 DNS records: SPF (TXT), DKIM (3× CNAME), and optionally DMARC (TXT).
4. Add those records at the DNS provider for albari.com.ng (Namecheap, Cloudflare, your registrar, etc.).
5. Click **Verify** in Resend until status = **Verified** (usually 5–30 min).

Once verified, the next test send will succeed and every outgoing mail (offer letters, admission notifications, OTPs, bulk, fee reminders) will go out as `@albari.com.ng` automatically — no further code changes.

## Open questions

1. **Local-part?** `admissions@`, `noreply@`, `info@`, or something else for the main `SENDER_EMAIL`?
2. **Root or subdomain?** `albari.com.ng` or `mail.albari.com.ng` (recommended)?
3. **Reply-to inbox?** Should replies route to `admissions@albari.com.ng` (default) or a different address?

Confirm 1–3 and I'll do the code/secret work in parallel while you add the DNS records.
