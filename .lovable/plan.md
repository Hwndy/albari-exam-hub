## Goal
Add native image upload (in addition to the existing URL input) to every CMS editor on the admin Website section so admins can either paste a URL or upload a file directly.

## Affected editors
- `src/components/admin/CMS/NewsEditor.tsx` — Featured Image
- `src/components/admin/CMS/GalleryManager.tsx` — Gallery image
- `src/components/admin/CMS/TestimonialManager.tsx` — Person avatar
- `src/components/admin/CMS/SchoolInfoManager.tsx` and any other website manager exposing an image field (logo, hero, about image) — audit and apply same control

## Approach
1. Create a public Supabase Storage bucket `website-media` (if it does not already exist) with policies:
   - Public read
   - Admin-only insert/update/delete (`public.is_admin()`)
2. Build one reusable component `src/components/admin/CMS/ImageUrlInput.tsx`:
   - Props: `value`, `onChange`, `label`, `folder` (e.g. `news`, `gallery`, `testimonials`, `site`)
   - UI: existing text input for URL + "Upload" button + drag/drop zone + small preview thumbnail + "Remove" button
   - On file pick: validate via existing `file-upload-guards.ts` (image MIME, ≤10 MB), upload to `website-media/<folder>/<uuid>-<name>`, then `getPublicUrl` and call `onChange(url)`
   - Shows upload progress / toast on error
3. Replace the raw `<Input>` image fields in the three editors above with `<ImageUrlInput>`, passing the appropriate `folder`. No schema changes — still stored as the same `image_url` / `featured_image` text column.
4. Repeat for any other CMS manager with an image URL field surfaced by a quick grep (School Info logo, hero background, etc.).

## Out of scope
- No changes to public website rendering (URLs work unchanged).
- No image transformations/resizing.
- No multi-image gallery bulk upload (single image per field).

## Technical notes
- Storage bucket creation via `supabase--storage_create_bucket` (`website-media`, public=true), then a migration for RLS policies on `storage.objects`.
- Uses the same guard helper already used by Assignments (`file-upload-guards.ts`) for consistency.
