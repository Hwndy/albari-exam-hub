## Sprint C — Website Polish

Focus: turn the public site into a fully browsable, shareable, and search-indexable experience. Build on the existing `useCms` hook and CMS tables already wired in Admin.

### 1. News & Events detail pages
- New route `/news/:slug` → `src/pages/website/NewsDetailPage.tsx` using existing `useNewsArticle(slug)`.
- Rich article layout: hero image, category chip, published date, author (if present), body (render markdown/HTML safely), share buttons (WhatsApp, X, Facebook, copy link), "Back to news" and "Related posts" (same category, limit 3).
- Update `NewsPage.tsx` list cards + `LatestNews.tsx` homepage section to link to `/news/:slug`.
- Per-route `<Helmet>`: title, description (from excerpt), canonical, `og:title/description/image/url`, `Article` JSON-LD.
- Wire route in `WebsiteRouter.tsx`.

### 2. Public Gallery page
- New route `/gallery` → `src/pages/website/GalleryPage.tsx` using existing `useGallery()`.
- Category filter chips (facilities / events / activities / general), responsive masonry grid, lightbox viewer (keyboard nav + swipe on mobile).
- Featured strip on homepage: add `GalleryHighlights.tsx` section to `HomePage.tsx` pulling `useGallery({ featured: true, limit: 6 })`.
- Add nav link in `WebsiteLayout.tsx` header + footer.
- Per-route Helmet + `ImageGallery` JSON-LD.

### 3. Events listing
- Extend `NewsPage.tsx` with an **Events** tab that filters `category === 'events'` and sorts by upcoming `event_date` first (past events collapsed below).
- Event card shows date badge + "Add to calendar" (.ics download generated client-side).

### 4. Testimonials page
- New route `/testimonials` → `src/pages/website/TestimonialsPage.tsx` using `useTestimonials()` (grid, filter by role).
- Homepage `Testimonials.tsx` links "See all" to this route.

### 5. SEO foundation
- `public/robots.txt`: allow all, add `Sitemap:` line pointing to `/sitemap.xml`.
- New `scripts/generate-sitemap.ts` wired via `predev` + `prebuild` in `package.json`:
  - Static routes: `/`, `/about`, `/admissions`, `/apply`, `/track`, `/facilities`, `/school-life`, `/news`, `/gallery`, `/testimonials`, `/portals`.
  - Dynamic: one entry per published `news_articles.slug` and (optionally) per gallery category page.
  - `BASE_URL = "https://www.albari.com.ng"`.
- Sitewide head in `index.html`: verify title/description/canonical/og set to albari.com.ng; add `Organization` + `WebSite` JSON-LD (already partially present — reconcile with `EducationalOrganization`).
- Per-route `<Helmet>` for each public page (About, Admissions, Apply, Facilities, School Life, News list, Gallery, Testimonials, Portals) with unique title + description + canonical + og.
- Alt text: audit `AboutPage`, `FacilitiesPage`, `Gallery` cards, hero images — fill from CMS `alt_text` where available, sensible defaults elsewhere.

### 6. Navigation & footer polish
- `WebsiteLayout.tsx`: add Gallery + Testimonials + News to primary nav; group secondary (Portals, Track Application) in a right-side cluster; ensure mobile drawer includes them.
- Footer: quick links block (About, Admissions, News, Gallery, Contact), social icons pulled from `school_info` (facebook/twitter/instagram/youtube/tiktok), newsletter signup already present.

### 7. Performance & a11y basics
- Lazy-load below-the-fold sections on `HomePage.tsx` with `React.lazy` + Suspense skeletons for `LatestNews`, `Testimonials`, `GalleryHighlights`.
- `loading="lazy"` + explicit width/height on all CMS images to prevent CLS.
- Ensure single `<h1>` per page; semantic `<section>`/`<article>`/`<nav>`.

### Technical notes
- Body rendering: news `content` may be HTML — sanitize with `dompurify` (add dep) before `dangerouslySetInnerHTML`.
- Lightbox: use `yet-another-react-lightbox` (small, unstyled-friendly) or hand-rolled dialog with existing `Dialog` primitive to avoid new dep.
- Sitemap generator queries Supabase via anon key for published news — keep read-only and cached in `public/sitemap.xml`.
- All new pages use `WebsiteLayout` wrapper for consistent header/footer.
- No new secrets, no schema changes — CMS tables already exist.

### Deliverables checklist
```text
[ ] /news/:slug detail page + Helmet + Article JSON-LD
[ ] /gallery page with filters + lightbox
[ ] Homepage GalleryHighlights section
[ ] Events tab on /news with .ics download
[ ] /testimonials page
[ ] robots.txt Sitemap directive
[ ] scripts/generate-sitemap.ts + predev/prebuild wiring
[ ] Per-route Helmet on all public pages
[ ] Nav + footer updates (Gallery, Testimonials, socials from CMS)
[ ] Image alt-text audit + lazy-loading
[ ] Sanitize news HTML with dompurify
```

Approve to build.
