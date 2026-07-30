## Problem

The accept-offer button in offer emails points to `https://irrxmoqbgygyyzozifdl.lovable.app/website/accept-offer/<token>`. That host is the Supabase project ref, not a real app address, so the browser shows "No Lovable project found at this address" (404). The app route itself (`/website/accept-offer/:token`) is correct.

## Fix

1. Store a `FRONTEND_URL` secret set to `https://www.albari.com.ng` so email links use the school's real domain.
2. In `supabase/functions/send-offer-letter/index.ts`, replace the bogus fallback host with `https://www.albari.com.ng` so links never regress if the secret is missing.
3. The letterhead image URL is built from the same constant — point it at a stable asset URL so the PDF/HTML letterhead keeps loading regardless of domain.
4. Add a top-level `/accept-offer/:token` route (aliasing the existing website route) so both old and new link shapes resolve instead of hitting NotFound.
5. Redeploy `send-offer-letter` and verify a freshly generated link opens the offer page.

## Note

The link only works once `www.albari.com.ng` is connected as a custom domain for this project and the project is published; otherwise I can point `FRONTEND_URL` at the published Lovable URL instead.

## Technical detail

- Files: `supabase/functions/send-offer-letter/index.ts`, `src/App.tsx`.
- No database or RLS changes; `accept-offer` edge function and `accept_offer_by_token` RPC stay as-is.
