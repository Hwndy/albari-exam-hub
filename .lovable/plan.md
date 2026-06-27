## Current finding

The screenshot proves Resend is still receiving `from` as a Gmail address. The code fallbacks are already `@albari.com.ng`, so the most likely cause is the existing `SENDER_EMAIL` secret still contains the old Gmail value, or the edge functions have not picked up the updated secret after deployment.

I cannot confirm Resend domain verification from here because email-domain setup/status requires workspace admin/owner permission. Please have a workspace admin check the Resend/Lovable email domain status for `albari.com.ng` and confirm it is `Verified`.

## Plan

1. **Force the sender secret value**
   - Update the existing `SENDER_EMAIL` runtime secret to exactly `admissions@albari.com.ng`.
   - Keep `REPLY_TO_EMAIL` as `admissions@albari.com.ng`.

2. **Redeploy affected mail edge functions**
   - Redeploy `send-offer-letter`.
   - Redeploy `send-admission-notification`.
   - Redeploy `send-bulk-email`.
   - Redeploy `send-otp`.
   - This ensures the functions stop using any stale Gmail sender value.

3. **Add a safe sender guard**
   - Add a small helper in each mail function that blocks non-`albari.com.ng` sender values before calling Resend.
   - If the secret is accidentally changed back to Gmail, the app will show a clear configuration error instead of sending a bad Resend request.

4. **Normalize all defaults**
   - Set every mail function default sender to `admissions@albari.com.ng`, including OTP and bulk sends, so all mail types align with the verified school domain.

5. **Verify with logs after retry**
   - Check edge function logs after sending an offer letter.
   - Confirm the new error no longer mentions `gmail.com`; if the domain is not verified, the remaining Resend error should mention `albari.com.ng` instead.

## Technical detail

Code already uses:

```text
Deno.env.get("SENDER_EMAIL") || "admissions@albari.com.ng"
```

So the persistent Gmail error is not coming from the fallback. It is coming from the deployed environment value of `SENDER_EMAIL` or stale edge function runtime state.