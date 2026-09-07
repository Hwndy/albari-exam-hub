# Live updates everywhere — no manual refresh

## Goal

Any change made anywhere in the platform (by you, by staff, by a parent, or by the system) shows up on every open screen by itself. No page reload, no "Refresh" button, no "Update available" click.

## Today

Only a handful of screens refresh themselves: payroll, student lists, past students, hostel allocations, student balances, payments and the teacher student list. Everything else loads once when opened. Only 7 tables are switched on for live updates in the database (students, class assignments, fee payments, hostel allocations, payroll months, payroll lines, parent messages). New app versions also wait behind an "Update available" prompt you have to click.

## What will change

1. **Live updates switched on for the whole database** — admissions, applications, interviews, offers, documents, classes, subjects, timetables, attendance, gradebook and results, exams and exam sessions, fee structures and installments, expenses, revenue, staff and HR, hostel rooms/passes/roll call, library, transport, announcements, notifications, CMS/website content, users and profiles.

2. **Every screen listens by itself.** One shared connection at the top of the app watches for changes and tells the screens that care. Each list, dashboard, table and detail page re-reads its data automatically a fraction of a second after a change lands — including the public website pages that read CMS content.

3. **Safety nets for when the live connection drops** (weak network, phone asleep, tab in the background):
   - refresh when you come back to the tab or the app regains focus
   - refresh when the connection is restored
   - a slow background re-check as a fallback so nothing can get stuck stale

4. **App updates apply themselves.** When a new version is published, it installs and reloads quietly instead of showing an "Update available" button — with a short toast so you know it happened.

5. **No flicker.** Refreshes happen in the background and only redraw when the data actually differs, so tables don't blink or lose your place, and typing in an open form is never interrupted.

## Technical notes

- DB migration: `REPLICA IDENTITY FULL` + `ALTER PUBLICATION supabase_realtime ADD TABLE` for every remaining public table, generated defensively (skip if already present, skip views).
- New `src/contexts/RealtimeProvider.tsx`: a small number of pooled `supabase.channel()` subscriptions covering all tables, with an event bus keyed by table name; avoids hitting the per-client channel limit that one-channel-per-component would cause.
- Rework `src/hooks/useRealtimeRefresh.ts` to subscribe to that bus instead of opening its own channel (same call signature, so existing call sites keep working), and add visibilitychange/online/focus listeners plus a configurable polling interval fallback and 300ms debounce.
- Add `useRealtimeRefresh` (or React Query `invalidateQueries` where the screen already uses React Query) to every data-loading screen: admin hubs (admissions, exams, results, fees, finance, HR/payroll, hostel, library, transport, parents, settings, CMS), teacher screens (gradebook, attendance, assignments, results, timetable, lesson notes), student screens (exams, results, report cards, assignments, timetable, library), parent portal screens, and website CMS-driven pages.
- Set `refetchOnWindowFocus: true` and sensible `staleTime` on the shared `QueryClient` in `src/App.tsx`.
- Service worker: switch `src/components/pwa/UpdateAvailable.tsx` to auto `skipWaiting` + `clients.claim` and reload, keeping a passive toast.
- Realtime respects RLS, so no policy changes are required and no user sees data they couldn't already query.
