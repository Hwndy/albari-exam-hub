## 1. Portal buttons go strictly to `/login`

`src/pages/website/PortalsPage.tsx` currently rewrites every card link to `/login?portal=true&role=<role>`, and the parent card adds a second `/login?portal=true&role=parent&mode=register` link.

- Drop the `roleFor` / `loginLink` query-string builders — every "Enter Portal" button links to `/login`, no query params, regardless of what the CMS stores.
- Replace the parent-only "Create parent account" link with a single line under the grid: "New parent? Create an account" pointing to `/login` as well (the login screen already has a Create-account toggle), so no card carries params.
- Check other places that emit portal URLs with params (home page portal/CTA cards, footer, `HomePage`/`WebsiteLayout`) and normalize those to `/login` too.
- `AuthPage.tsx` keeps working without params: it defaults to login mode. Leave its `?role=`/`?portal=` handling in place as harmless fallback for old emailed links.

## 2. Admin dashboard de-clutter

The sidebar currently renders 19 flat top-level entries (Dashboard, Students, Analytics, Admissions, Academic, Results Management, Attendance Reports, Fee Management, Library, Notifications, Announcements, ID Cards, Scan Attendance, Users, Parents, Website, Settings, HR, Transport, Assets, System) with four groups expanded by default — that is the main source of the clutter.

**Sidebar (`src/components/ui/admin-sidebar.tsx`)**
- Regroup into 6 labelled sections using `SidebarGroup` headers instead of one long list:
  - **Overview** — Dashboard, Analytics
  - **Admissions** — Admissions hub (its 7 tabs already live inside `AdmissionsHub`, so collapse the sub-menu to a single entry)
  - **Academics** — Students, Classes & Subjects, Exams, Questions, Timetable, Results & Report Cards (Results Management folded in as sub-items of one "Results" entry)
  - **People** — Users, Parents, HR, Attendance (Reports + Scan Station as sub-items), ID Cards
  - **Operations** — Fees, Library, Transport, Assets, Notifications & Announcements (merged into one "Communications" entry with sub-items)
  - **Configuration** — Website CMS, Settings, System
- Collapse all groups by default except the one matching the active tab; auto-open the active group on navigation.
- Tighten spacing/typography: smaller group labels, consistent icon size, active state uses a left accent bar rather than a full `bg-accent` block.

**Shell (`src/pages/AdminDashboard.tsx`)**
- Single sticky header row: sidebar trigger, logo, page title + breadcrumb (Section › Page), global search, user menu — instead of the current stacked header + duplicated titles.
- Remove the duplicated page heading where a hub already renders its own `h2` (Admissions, Settings, Fees, Parents, Results) so each screen has exactly one title.
- Replace the `getPageTitle` string ladder with one route map (`tab/subtab -> { section, title }`) used by both the breadcrumb and the sidebar's active state.
- Overview tab: add a compact KPI row (students, teachers, classes, active exams, pending applications, outstanding fees) above Recent Exams, plus quick-action buttons; wire it to the existing `fetchDashboardData`, which is currently never called (the `useEffect` on line 96 has an empty body, so stats stay at zero).
- Consistent page padding/max-width container across all tabs.

## Technical notes
- Files: `src/pages/website/PortalsPage.tsx`, `src/pages/website/HomePage.tsx` (portal CTAs), `src/components/website/WebsiteLayout.tsx` (footer links), `src/components/ui/admin-sidebar.tsx`, `src/pages/AdminDashboard.tsx`.
- All existing `?tab=&subtab=` URLs keep working; only grouping and labels change, no component is deleted.
- No database or edge-function changes.
