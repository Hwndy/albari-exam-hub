# Route Applicant Replies to Your Gmail

## Goal
Any applicant who clicks "Reply" on an admission email should land in `suleayo04@gmail.com` — no mailbox hosting, no MX changes. The `From` address stays `admissions@albari.com.ng` (once Resend DNS is verified) so branding is preserved.

## How it works
Every email sending helper in the project already reads two secrets:
- `SENDER_EMAIL` → shown as the "From" address
- `REPLY_TO_EMAIL` → the address Gmail/Outlook use when the recipient hits Reply

We just point `REPLY_TO_EMAIL` at your personal Gmail. Zero code changes required for the reply-routing itself — only a secret update.

## Steps

1. **Update the `REPLY_TO_EMAIL` secret** to `suleayo04@gmail.com`. A secure form opens for you to paste it in.
2. **Verify each mail edge function actually reads `REPLY_TO_EMAIL`** and passes it as `reply_to` to Resend. Files to audit:
   - `supabase/functions/send-offer-letter/index.ts`
   - `supabase/functions/send-admission-notification/index.ts`
   - `supabase/functions/send-otp/index.ts`
   - `supabase/functions/send-bulk-email/index.ts`
   - `supabase/functions/send-interview-notification/index.ts` (if present)
   Any function currently hard-coding a reply-to (or omitting it) gets patched to use the secret.
3. **Redeploy** any functions changed in step 2. Functions that already read the secret pick up the new value automatically — no redeploy needed for those.
4. **Smoke test**: submit a test application, trigger an offer letter to a throwaway address, hit Reply from that inbox, confirm it arrives in `suleayo04@gmail.com`.

## Notes
- This is independent of Resend DNS verification. Even before `albari.com.ng` is verified, if we temporarily switch `SENDER_EMAIL` to `onboarding@resend.dev` for testing, replies still route to your Gmail because `reply_to` is a separate header.
- Once Resend verifies `albari.com.ng`, sends go out from `admissions@albari.com.ng` with `Reply-To: suleayo04@gmail.com` — recipients see the school domain, replies land in your Gmail.
- No inbox exists at `admissions@albari.com.ng` itself. If anyone sends a fresh email TO that address (not a reply), it will bounce until you add MX records with a mailbox or forwarding provider. Tell me later if you want to add Cloudflare Email Routing (free) for that case.
