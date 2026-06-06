
# Plan: Generate BREAKDOWN.md — Full Application Audit

## Goal
Scan the entire codebase (frontend components, pages, contexts, services, Supabase migrations, edge functions, config) and produce a single `BREAKDOWN.md` file at the project root that summarizes the current state of the School Management System.

## Approach

### Step 1: Codebase Inventory
- List and categorize every file in:
  - `src/pages/` (all dashboards, exam flow, website)
  - `src/components/admin/`, `src/components/admin/SMS/`, `src/components/admin/CMS/`
  - `src/components/teacher/`, `src/components/student/`, `src/components/parent/`
  - `src/components/pwa/`, `src/components/settings/`
  - `supabase/functions/` (all 22 edge functions)
  - `supabase/migrations/` (count + recent changes)
- Cross-reference the 68 database tables already inventoried.

### Step 2: Feature Status Matrix
For each module from the SMS spec (4.1 → 4.7 + Admissions, Exams, Library, PWA, Website CMS, Notifications, Multi-tenancy), mark each sub-feature as:
- ✅ Complete
- 🟡 Partial (with what's missing)
- ❌ Not started

### Step 3: Identify Outstanding Work
Compare spec vs. implementation to list:
- Missing core SMS features (e.g. bulk Excel import/export, biometric/QR attendance, payment gateway tie-in beyond Paystack, full financial reports UI, transport, hostel, inventory, timetable auto-generation, etc.)
- Phase 5+ items mentioned earlier (AI Analytics, Multi-Currency, Language/i18n, Video Conferencing)
- Integration gaps between new components and `AdminDashboard.tsx` tabs

### Step 4: Fixes & Tech Debt
Catalogue known issues:
- PWA build size warning history
- "Leaked Password Protection" Supabase Auth setting
- `any` casts added in `BulkNotificationSender.tsx` / `LibraryManager.tsx`
- Hard-coded school mapping in `src/lib/school-utils.ts`
- Edge functions needing `verify_jwt` review
- Any RLS / GRANT gaps surfaced by linter
- TypeScript/console errors visible in preview

### Step 5: Write `BREAKDOWN.md`
Structure:
1. Executive Summary (% complete per module)
2. ✅ Completed Features (grouped by module)
3. 🟡 Partial / In-Progress
4. ❌ Not Yet Built
5. 🐛 Known Issues & Required Fixes
6. 🔐 Security & Config Items
7. 📋 Recommended Next Phase priorities

File location: `/BREAKDOWN.md` (project root, so it's easy to find).

## Deliverable
A single new file: `BREAKDOWN.md`. No code changes, no DB changes, no edge function changes.
