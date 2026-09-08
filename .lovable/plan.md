# NIN on the application, compulsory documents, working document review

## 1. NIN on the admission form

- Add a required **NIN (National Identification Number)** field to the personal information step of the online application, next to date of birth/gender.
- Validate it as exactly 11 digits; the applicant cannot move past that step without a valid entry.
- Store the NIN on the application record and show it on the review step and on the admin application details screen.

## 2. NIN slip as an uploaded document

- Add **NIN slip** to the documents step, alongside birth certificate, previous school report, passport photograph and medical report.

## 3. All documents compulsory

- The documents step can no longer be skipped: every document (birth certificate, previous school report, passport photograph, medical report, NIN slip) must be attached before the applicant can continue.
- Each file is checked for type (PDF or image) and size (max 10MB) before upload.
- If any upload fails, the applicant sees a clear error and the submission stops instead of silently going through with missing files — today a failed upload is skipped quietly, which is why some applications show no documents.

## 4. Fixing accept/reject when reviewing documents

What is happening now: a document only has a yes/no "verified" flag. Rejecting a document writes "not verified", which looks exactly the same as "not yet reviewed", so the reviewer sees nothing change and assumes it failed. Failures also produce no on-screen message.

Changes:
- Give each document three states: **Pending**, **Verified**, **Rejected**, plus an optional rejection reason.
- Accept and Reject buttons write the new state through a single admin-only database routine that returns the updated row, so the screen updates immediately and any real permission problem shows as a visible error message.
- The reviewer panel shows the state as a coloured badge, lets a rejected document be re-verified, and shows who reviewed it and when.
- The applicant tracker shows rejected documents with the reason so parents know what to re-send.

## Technical notes

- Migration: `admission_applications.nin text` (nullable at DB level, required in the form and for new submissions); `admission_documents.verification_status text not null default 'pending'` with a check constraint of `pending | verified | rejected`, `rejection_reason text`; backfill `verification_status` from the existing `verified` flag and keep `verified` in sync via trigger for existing readers.
- New `public.set_document_verification(p_document_id uuid, p_status text, p_reason text)` — SECURITY DEFINER, admin-only, returns the updated `admission_documents` row.
- Frontend: `src/components/website/AdmissionForm.tsx` (NIN field + validation, `nin_slip` document, step-4 validation requiring all five files, abort submission on upload error), `src/components/admin/AdmissionDocumentViewer.tsx` (three-state badges, RPC calls, error toasts, rejection reason dialog), and the admin application details/tracker views to display NIN and rejection reasons.
