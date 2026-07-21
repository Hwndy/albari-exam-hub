
## Goal
Incorporate the Al-Bari College letterhead (green/yellow geometric header with crest, school name, address, phone lines, motto, and language tagline) into every PDF and email we send in the admission workflow — starting with the offer letter, then extending to any other generated documents.

## Approach

Rather than embedding the raw uploaded image (heavy, low-res, hard to reuse), I'll recreate the letterhead programmatically inside the PDF using jsPDF drawing primitives + the existing crest logo asset. This gives us:
- Crisp vector output at any zoom
- Reusable helper across all edge functions
- Small file size (no base64 image bloat in the header itself, aside from the crest)

### 1. Upload the crest as a Lovable Asset
Extract just the shield/crest from the uploaded letterhead (or use the existing logo if we already have it). Store as `src/assets/albari-crest.png.asset.json` so both the frontend (report cards, ID cards, receipts) and edge functions can fetch it by URL.

### 2. Create a shared letterhead renderer
New file: `supabase/functions/_shared/letterhead.ts`

Exports `drawLetterhead(doc: jsPDF)` which draws:
- Top green band with yellow triangular accents (left and right corners) — matches the geometric frame in the reference
- Crest fetched from CDN and placed top-left
- "AL-BARI COLLEGE" heavyweight green wordmark
- Address lines (Badagry Market Road + Annex on Olatunde Bakare Street)
- "ANNEX:" label in red, address in black
- TEL: line with the three phone numbers
- "Motto: Education is Future" in red
- "ENGLISH, ARABIC AND FRENCH SPEAKING" in blue
- Returns the Y-coordinate where body content should start (~55mm down)

Also exports `drawLetterheadFooter(doc)` for the bottom green/yellow band mirroring the top.

### 3. Wire it into the offer letter
Update `supabase/functions/send-offer-letter/index.ts`:
- Replace the current blue rectangle header (lines 87-97) with `await drawLetterhead(doc)`
- Adjust `yPos` to start below the new letterhead
- Replace the plain footer (lines 218-226) with `drawLetterheadFooter(doc)`
- Keep all body content (admission details box, next steps, important notice) unchanged

### 4. Also apply to the HTML email body
Update the email template in the same function so the email itself uses a letterhead-styled header:
- Green background with yellow angular accents (CSS clip-path or SVG)
- Crest image from CDN
- "AL-BARI COLLEGE" wordmark + address block
Keeps the existing admission details cards below.

### 5. Extend to other admission PDFs (in-scope for this pass)
Apply the same helper to any other PDF the admission workflow generates. Based on the codebase, the candidates are:
- `ReportCardGenerator.tsx` (client-side jsPDF) — port a frontend equivalent to `src/lib/letterhead.ts`
- `FeeReceiptGenerator.tsx`
- `send-admission-notification` (rejection/status emails) — HTML header only

If you'd rather I limit this pass to just the offer letter first and roll out the rest afterwards, say so.

## Open question
The uploaded image is a scan with slight artifacts. Do you want me to:
- **A)** Recreate it as vector shapes + text in jsPDF (crisp, editable, matches closely but not pixel-identical), or
- **B)** Use the uploaded PNG directly as the header image (pixel-identical to what you sent, larger file size, may look soft on high-DPI print)?

Default if you don't specify: **A**.
