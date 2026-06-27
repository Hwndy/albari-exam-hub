
# Mobile responsiveness fixes (website + admission flow)

Targeted, presentation-only changes. No business logic, no DB, no edge functions.

## Problems found

**WebsiteLayout (header/footer)**
- Top contact bar uses `flex justify-between` with phone + email + social icons all on one row — on small screens email/phone overflow and push the social icons off-screen.
- Brand block always shows the logo at `lg`, but the school name/tagline is hidden under `md`, leaving a lopsided header.
- Mobile menu has no max-height/scroll and uses default text sizing — taps land too small.

**ApplyPage (`/website/admissions/apply`)**
- Page wraps the form in a `Card` *and* the form mounts its own outer `Card` with `max-w-4xl mx-auto p-6` — produces double padding and a card-in-card on mobile that wastes ~32px on each side.
- H1 jumps `text-4xl → text-5xl` with no mobile-down step, so it crowds the badge above 360–375px widths.

**AdmissionForm (`AdmissionForm.tsx`)**
- Step indicator: 6 circles in `flex justify-between` with `w-10 h-10` and labels hidden under `sm` — circles touch and the row overflows on iPhone SE-class widths.
- Parent/Guardian step: `TabsList grid-cols-3` with long labels ("Father's Details", "Mother's Details", "Guardian's Details") truncates/wraps awkwardly under 400px.
- Card padding `p-6` on `CardContent` plus an outer `p-6` wrapper compounds with the ApplyPage card → form fields get only ~280px on a 375px screen.
- Footer nav row uses `flex justify-between` — Previous/Next buttons cramp on small screens; should be full-width-stacked on mobile.
- Document upload tiles fixed at narrow widths cause the "Choose File" button to wrap below filename in an ugly way.
- Stray `/` text node on `AdmissionsPage.tsx:247` renders a visible slash.

**AdmissionsPage (`/website/admissions`)**
- Hero `py-20` is too tall on mobile (eats first fold). Steps grid is `md:grid-cols-2 lg:grid-cols-4` — fine, but the arrow between steps relies on `lg:`, leaving a dead block on tablet.

**ApplicationTracker**
- Quick sanity pass for the lookup form to ensure inputs and the result card don't overflow on 360px.

## Changes

### 1. `src/components/website/WebsiteLayout.tsx`
- Top contact bar: hide phone + email below `sm`, keep only one item + socials. On `sm+` show phone, on `md+` show email, on `lg+` show location.
- Use `flex-wrap gap-y-2 gap-x-4` instead of fixed `space-x-6` so nothing escapes the viewport.
- Brand block: show a compact stacked name under `md` (smaller text), not hidden.
- Mobile nav: `max-h-[70vh] overflow-y-auto`, increase tap targets to `py-3 text-base`.

### 2. `src/pages/website/ApplyPage.tsx`
- Remove the outer wrapping `Card` (the form already provides one) OR remove the form's outer card. Keep a single card.
- Heading: `text-3xl sm:text-4xl lg:text-5xl`.
- Tighten vertical padding on mobile: `py-8 sm:py-12`.

### 3. `src/components/website/AdmissionForm.tsx`
- Outer wrapper: `max-w-4xl mx-auto p-3 sm:p-6` (or drop the outer Card if ApplyPage keeps one — pick one consistent shell).
- `CardContent` padding: `p-3 sm:p-6`.
- Step indicator row:
  - Use `flex items-center gap-1 sm:gap-2 overflow-x-auto -mx-3 px-3` so it never overflows.
  - Shrink circles to `w-8 h-8 sm:w-10 sm:h-10`, icons `h-4 w-4 sm:h-5 sm:w-5`.
  - Show a small numeric pill under each circle on mobile (`1/6`) since labels are hidden.
- Parent/Guardian `TabsList`: shorten mobile labels to "Father", "Mother", "Guardian" (full label on `sm+` via a hidden span), and add `text-xs sm:text-sm`.
- Document upload tiles: switch to a single column under `sm`, ensure `truncate` + `min-w-0` on the filename row so the "Choose File" button stays aligned.
- Review step `grid-cols-1 md:grid-cols-2` already mobile-safe — only tighten inner card padding and add `break-words` to displayed text values.
- Nav buttons (Previous/Next/Submit):
  - On mobile, make the row `flex-col-reverse sm:flex-row gap-3` and buttons `w-full sm:w-auto`.
  - Keep current desktop behavior unchanged.

### 4. `src/pages/website/AdmissionsPage.tsx`
- Remove the stray `/` text node (line 247).
- Hero `py-20` → `py-12 sm:py-16 lg:py-20`.
- Hide the inter-step arrow on `md` (tablet) where the 2-col grid would put it in the wrong place; keep `hidden lg:block` as today but use `xl:block` only if needed.
- Stacked CTA buttons: already `flex-col sm:flex-row` — keep, just ensure `w-full sm:w-auto` on each Button.
- Fee/contact section grids: verify `gap-4` on mobile so cards don't touch edges.

### 5. `src/components/website/ApplicationTracker.tsx`
- Confirm the lookup form uses `grid-cols-1 sm:grid-cols-2` and the result card uses `break-words` on long application numbers / emails. Tweak only if overflowing.

## Verification

- Drive Playwright at 360×780 (iPhone SE), 390×844 (iPhone 14), and 768×1024 (iPad) against:
  - `/website` (header/footer)
  - `/website/admissions`
  - `/website/admissions/apply` — step through all 6 steps
  - `/website/track-application`
- Screenshot each viewport; confirm no horizontal scroll, all inputs full-width, all buttons reachable, step indicator visible.

## Out of scope

- No copy changes beyond shortening the 3 tab labels.
- No color/theme changes.
- No backend, RLS, RPC, or edge function changes.
- Admin-side responsive work (separate request).
