## Confirmed diagnosis

- The newest offer exists, has a non-empty 36-character acceptance token, and the database lookup successfully returns its applicant details.
- Anonymous users are permitted to call `get_offer_by_token`, so RLS is no longer blocking this lookup.
- The newest offer is saved with status `sent`, while the acceptance page only treats status `pending` as actionable. The current state model is inconsistent.
- The newest deadline is stored as a date-only value for today; the page parses it at midnight, which can incorrectly mark it expired during the same day.

## Implementation plan

1. **Unify offer state handling**
   - Treat both `sent` and legacy `pending` offers as active and actionable.
   - Reserve “already processed” for `accepted` and `declined` only.
   - Make newly created and re-sent offers consistently use the canonical active state without invalidating their token.

2. **Harden public token lookup**
   - Decode and trim the route token before lookup to prevent URL encoding or copied whitespace from causing false failures.
   - Keep token validation server-side and return distinct states for invalid token, expired offer, and processed offer instead of collapsing all failures into “invalid or expired.”

3. **Correct deadline behavior**
   - Interpret a date-only acceptance deadline as valid through the end of that calendar day.
   - Keep an actually expired offer visible with a clear expiry message rather than presenting it as an invalid link.

4. **Verify the complete flow**
   - Test the latest stored token against the public RPC anonymously.
   - Open the generated public URL and confirm the applicant, class, and deadline render.
   - Exercise the accept/decline endpoint with controlled validation so a caller cannot alter another offer.
   - Re-send an existing offer and confirm its emailed link still resolves after the update.