
# Plan: Thorough Application Scan → Rewrite BREAKDOWN.md

The previous `BREAKDOWN.md` was written largely from session memory. This time I will actually crawl the codebase and database before writing.

## Scan Steps (read-only)

1. **File inventory** — `ls -R` style walk of:
   - `src/pages/`, `src/components/**`, `src/contexts/`, `src/hooks/`, `src/services/`, `src/lib/`
   - `supabase/functions/`, `supabase/migrations/`
   - Root config (`vite.config.ts`, `package.json`, `index.html`, `public/`)

2. **Per-component inspection** — open each major component to determine if it's wired up, stubbed, or fully working. Focus areas:
   - `AdminDashboard.tsx` — confirm which tabs/components are mounted (Staff, Promotion, Receipts, etc.)
   - `StudentDashboard.tsx`, `TeacherDashboard.tsx`, `ParentDashboard.tsx`, `SuperAdminDashboard.tsx`
   - All SMS components (`StudentManagement`, `FeeManagement`, `StudentPromotion`, `StaffManagement`, `StaffAttendance`, etc.)
   - All CMS components
   - Admissions pipeline (12+ components)
   - Exam engine (15+ components)
   - PWA components and `App.tsx` routing

3. **Database review** — list all 68 tables and their RLS posture; cross-reference which have UI coverage and which are orphaned.

4. **Edge function review** — open each of the 22 edge functions, note purpose, `verify_jwt` status, secret usage.

5. **Build / runtime health** — check `tsconfig`, recent TS errors, console/runtime errors, bundle size warnings, security memory.

6. **Spec gap analysis** — compare against the user's original SMS spec (4.1–4.7) plus implied modules (Transport, Hostel, Inventory, AI, i18n, etc.).

## Output

A single rewritten file: **`BREAKDOWN.md`** (project root, overwrites the existing one), with:

1. Executive summary table (per-module completion %)
2. ✅ **What's Done** — exhaustive, grouped by module, with file references (`src/...`)
3. 🟡 **What's Partial** — feature, gap, file to extend
4. ❌ **What's Missing** — both spec gaps and roadmap items
5. 🐛 **Fixes Required** — concrete bugs / tech debt with file:line where possible
6. 🔐 Security & config checklist
7. 📋 Prioritized next-steps list

Estimated length: 400–600 lines, since the user asked for thorough.

## Constraints

- Read-only scan; only file written is `BREAKDOWN.md`.
- No code changes, no DB changes.
