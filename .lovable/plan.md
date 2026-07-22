## Fix
The `paystack-reconcile` edge function fails to boot with `Unable to load .../@supabase/supabase-js/2.75.0/cors` — the `npm:@supabase/supabase-js@2/cors` subpath isn't a real export in that package version, so the browser gets "Failed to send a request to the Edge Function".

Replace the CORS import in `supabase/functions/paystack-reconcile/index.ts` with an inline constant:

```ts
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

No other changes needed — the function will redeploy automatically.

(Note: `verify-fee-payment` uses the same broken import; I'll patch it the same way in this pass so the parent payment flow doesn't fail the same way.)
