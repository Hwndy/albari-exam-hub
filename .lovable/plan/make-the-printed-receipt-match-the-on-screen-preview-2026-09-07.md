# Make the printed receipt match the on-screen preview

## What happens today

The Receipt Preview you see on screen (logo, school name, address, "FEE RECEIPT" band, the grey details block, the green Amount Paid bar, signature and stamp lines) is one design. Print and Download PDF use a completely different, plainer layout drawn separately — so what prints does not look like what you previewed.

## What I will do

1. Turn the preview you like into one reusable receipt design, used everywhere.
2. Print will print exactly that design — same logo, spacing, green amount bar, signature and stamp lines — on A4.
3. Download PDF will produce the same design as an A4 PDF, so the file, the print and the preview all match.
4. Apply it to every place a fee receipt is produced, so they are all identical:
   - Finance → Fees & Income → Receipts (search, preview, print, download)
   - The "Record cash payment" dialog's receipt
   - The parent portal's payment receipts
   - The receipt shown after an online payment succeeds

The receipt keeps pulling the school name, logo, address, phone, email and motto from your school settings, so changing them there updates every receipt.

## Technical notes

- New `src/components/fees/FeeReceiptView.tsx`: presentational component holding the current preview markup, taking `{ title, receiptNumber, date, fields, amount, footerNote }` plus `SchoolBranding`.
- New helpers in `src/lib/receipt-pdf.ts` (keeping the existing export for compatibility):
  - `printReceiptView(props)` — mounts `FeeReceiptView` into an offscreen container via `createRoot`, waits for the logo image, calls the existing `printNode` with `pageSize: 'A4'`, then unmounts.
  - `downloadReceiptView(props, filename)` — same offscreen render, `html2canvas` (scale 2, `backgroundColor: '#fff'`) into a jsPDF A4 page.
- Replace `buildBrandedReceipt` call sites in `FeeReceiptGenerator.tsx`, `RecordCashPaymentDialog.tsx`, `ParentFees.tsx`, `FeePaymentCallback.tsx`, `website/PaymentCallbackPage.tsx` with the two new helpers; `FeeReceiptGenerator` renders `FeeReceiptView` inside the dialog instead of its inline markup.
- Print styles: force the branded colours with `print-color-adjust: exact` (already set in `print-node.ts`) and avoid `text-muted-foreground` washing out on paper by using explicit receipt tokens.
- No database or schema change.
