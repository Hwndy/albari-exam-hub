
## What's actually wrong

The red toast says it all:

> Resend error: The gmail.com domain is not verified. Please add and verify your domain on https://resend.com/domains

Your `SENDER_EMAIL` secret is currently a `@gmail.com` address (likely set during testing). Resend **only** allows sending from a domain you own and have verified via DNS. Free inbox providers (gmail.com, yahoo.com, outlook.com) can never be used as the From address — this is a hard Resend policy, not a bug in the app.

The offer-letter code itself is fine. Every mail edge function already reads `SENDER_EMAIL` / `REPLY_TO_EMAIL` from secrets and falls back to `@albari.com.ng`. The fallback is being overridden by the gmail value in the secret.

## Fix — two parts, both required

### Part 1 — Verify `albari.com.ng` in Resend (you must do this)
1. https://resend.com/domains → **Add Domain** → `albari.com.ng` (or a subdomain like `mail.albari.com.ng`, which is what Resend recommends).
2. At your DNS provider for `albari.com.ng`, add the records Resend shows you:
   - 1× SPF (TXT)
   - 3× DKIM (CNAME)
   - 1× DMARC (TXT, recommended)
3. Back in Resend, click **Verify**. Status must read **Verified** (usually 5–30 min, can take up to a few hours).

Until this is Verified, **no** outgoing email from the app will work, no matter what we change in code.

### Part 2 — Replace the bad `SENDER_EMAIL` secret
Once the domain shows **Verified** in Resend, I'll open the secret update form so you can change:

- `SENDER_EMAIL` → `admissions@albari.com.ng`
- `REPLY_TO_EMAIL` → `admissions@albari.com.ng` (already set, will confirm)

No code changes are needed — `send-offer-letter`, `send-admission-notification`, `send-otp`, and `send-bulk-email` all already read these secrets.

### Part 3 — Verify
After both above are done, I'll:
1. Send a test offer letter from the admin UI to your own inbox.
2. Tail `send-offer-letter` edge function logs to confirm Resend returns `200 OK` with a message id (no "domain not verified" error).
3. Check it lands in inbox (not spam) — if SPF/DKIM/DMARC are all green this will be clean.

## What I will NOT do
- I won't try to "fix" this by editing edge function code — the code is correct; the secret + DNS are the problem.
- I won't change the From address to `onboarding@resend.dev` as a workaround, because real applicants would receive offer letters from a generic Resend test address, which looks like spam.

## Your next step
Tell me when the domain shows **Verified** in https://resend.com/domains, and I'll open the secret update form for `SENDER_EMAIL` and re-test the offer letter flow.
