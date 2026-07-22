## Goal

Make everything the admin edits under **Admin → Website CMS** actually drive what visitors see on `/website/*`. Today only the homepage's *Latest News* strip and *Testimonials* strip read from the database — News, Gallery, School Info (contact / socials / stats), Site Settings (branding, hero copy, principal welcome, links, colors), and the standalone `NewsPage` / `FacilitiesPage` / `AboutPage` / `PortalsPage` are all hardcoded or empty. This plan connects them.

## Current state (verified)

- CMS admin modules present: `NewsManager`, `GalleryManager`, `TestimonialManager`, `SchoolInfoEditor`, `SiteSettingsEditor` (all writing to `news_articles`, `gallery`, `testimonials`, `school_info`, `website_settings`).
- Website consumers today: only `LatestNews.tsx` (news) and `Testimonials.tsx` (testimonials) fetch from Supabase. `HomePage`, `AboutPage`, `SchoolLifePage`, `AdmissionsPage`, `FacilitiesPage`, `NewsPage`, `PortalsPage`, `WebsiteLayout` (nav/footer), and every home section (`HowToApply`, `PrincipalWelcome`, `Accreditations`, `Newsletter`, `WhatsAppFloat`) are hardcoded.
- `src/lib/school-info.ts` exports a static `SCHOOL_INFO` with empty fields — nothing hydrates it from `school_info`.

## Implementation

### 1. Shared public CMS data layer (`src/lib/cms.ts` + hooks)

- Add typed React Query hooks in `src/hooks/useCms.ts`:
  - `useSchoolInfo()` → key/value map from `school_info` where `is_active`.
  - `useWebsiteSettings()` → key/value map from `website_settings`.
  - `useNews({ category?, limit? })`, `useNewsArticle(slug)` — published only, ordered by `published_at`.
  - `useGallery({ category?, featured? })` — active items, ordered by `display_order`.
  - `useTestimonials({ featured? })` — published only.
- All hooks are anon‑safe (no auth needed); confirm `GRANT SELECT ... TO anon` exists on the six CMS tables and add any missing grants + `is_published`/`is_active` read policies in one migration.
- Retire `src/lib/school-info.ts` in favor of `useSchoolInfo()`; provide a `<SchoolInfoProvider>` in `WebsiteLayout` so nav/footer/WhatsApp can read synchronously.

### 2. Website layout, nav, footer

- `WebsiteLayout.tsx`: pull `name`, `logo_url`, `motto`, `contact_phone`, `contact_email`, `address`, and social handles (`facebook_url`, `instagram_url`, `twitter_url`, `youtube_url`, `tiktok_url`, `whatsapp_number`) from `school_info` for header logo, footer contact block, and social icons.
- `WhatsAppFloat.tsx`: use `whatsapp_number` from `school_info` (fallback to current hardcoded number).
- `Newsletter.tsx`: if a `newsletter_enabled` site setting is false, hide the block.

### 3. HomePage

- Hero copy (`hero_title`, `hero_subtitle`, `hero_badge`, `hero_cta_primary_label`) and the hero image list (`hero_images` JSON) come from `website_settings`, with the current strings as fallback so the page never blanks.
- Stats strip (Students / Teachers / Years / Success) reads the `statistics` category of `school_info` (`stat_students`, `stat_teachers`, `stat_years`, `stat_success_rate`).
- `PrincipalWelcome.tsx`: title, body, photo, and signature name from `website_settings` (`principal_name`, `principal_message`, `principal_photo_url`).
- `Accreditations.tsx`: list of accreditations from a `website_settings.accreditations` JSON array.
- `HowToApply.tsx`: steps sourced from `website_settings.how_to_apply_steps` JSON, with current steps as fallback.
- Existing `LatestNews` and `Testimonials` already wired — no change beyond moving them onto the shared hook.

### 4. NewsPage (list + detail)

- List mode (`/website/news`): render published `news_articles` with category filter chips (`news`, `events`, `announcements`), search box, and pagination.
- Detail mode (`/website/news/:slug`): fetch by slug, render title, hero image, category badge, published date, body (HTML), and a "Related" strip. 404 fallback when slug not found or unpublished.

### 5. FacilitiesPage / SchoolLifePage / AboutPage / PortalsPage

- `FacilitiesPage`: replace static blocks with `useGallery({ category: 'facilities' })` grid + `website_settings.facilities_intro` copy.
- `SchoolLifePage`: pull activity intro + featured photos from `useGallery({ category: 'activities' })` and `website_settings.school_life_sections` JSON.
- `AboutPage`: hydrate mission/vision/history from `website_settings` (`about_mission`, `about_vision`, `about_history`) with current copy as fallback; leadership grid from a `leadership_team` JSON.
- `PortalsPage`: pull portal cards (label + description + icon key) from `website_settings.portals` JSON so admin can toggle Parent/Student/Staff portals visibility.

### 6. Admin CMS UX

- Ensure `SiteSettingsEditor` exposes all new keys used above (`hero_*`, `principal_*`, `accreditations`, `how_to_apply_steps`, `portals`, `about_*`, `hero_images`, `newsletter_enabled`, `facilities_intro`, `school_life_sections`, `leadership_team`) with typed editors (text / textarea / JSON / image upload).
- `SchoolInfoEditor`: add missing standard keys (`whatsapp_number`, socials, stat_* fields) as suggested defaults so an admin can fill them without knowing the schema.
- Add a "Preview on site" link on each CMS manager pointing to the corresponding public route.
- After any CMS mutation, invalidate the matching React Query key so the live site reflects changes immediately after an admin publishes.

### 7. Seed + safety

- One migration seeds sensible defaults for every new `website_settings` / `school_info` key so the public site renders correctly on first load (before any admin edits) and keeps working if a key is deleted.
- Every website consumer uses graceful fallbacks (skeletons while loading, hardcoded copy if the row is missing) so the site never shows blank sections.

## Out of scope

- No changes to admissions, exams, results, attendance, parent portal, or auth flows.
- No redesign of the site — this is a data‑wiring pass, keeping current visuals.
- Multi‑tenant / school switching stays removed.

## Verification

- Edit each field in every CMS module → refresh matching public page → confirm change appears.
- Hit `/website`, `/website/about`, `/website/school-life`, `/website/facilities`, `/website/admissions`, `/website/portals`, `/website/news`, `/website/news/:slug` as an anonymous user and confirm no console/network errors and no blank sections.
- Toggle `is_published` / `is_active` off and confirm items disappear from the public site.
