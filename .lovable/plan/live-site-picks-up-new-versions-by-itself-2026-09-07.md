# Live site picks up new versions by itself

## First, one thing I can't change

Sending your code changes to the live web address is a Lovable hosting step: you press Publish → Update once, and the new version goes out. There is no way for me to remove that button — it is how the hosting decides when a new version becomes public.

## What I can fix — and this is very likely what you're seeing

Once you publish, people already using the site (especially anyone who installed it on their phone) keep running the old version until they click an "Update available" button or close and reopen the app. That is caused by the offline cache built into the app. So a change looks like it "didn't go live" even though it did.

## What will change

1. **New versions install themselves.** As soon as a new version is published, an open tab or installed app picks it up and refreshes onto it automatically — no "Update available" click, no hard refresh.
2. **Version check on the spot.** The app checks for a newer version when it starts, when you switch back to the tab or reopen the app, and every few minutes while it's open — instead of once an hour.
3. **A brief, non-blocking note** ("Updated to the latest version") so you know why the page just refreshed. Nothing to click.
4. **Never lose typed work.** If you are in the middle of filling a form, the refresh waits until that screen is idle.
5. **Pages are always fetched fresh.** The cache will only ever serve the page shell offline; when you're online, the newest version is always what loads.

## After this

Your workflow becomes: make a change → press Publish → everyone on the live link is on the new version within seconds, without touching anything.

## Technical notes

- `public/sw.js`: switch app-shell/HTML handling to network-first, keep offline fallback only for genuine offline; bump cache versioning and delete stale caches only for this registration's own buckets on `activate`; call `self.skipWaiting()` on install and `clients.claim()` on activate.
- `src/main.tsx`: call `registration.update()` on load, on `visibilitychange`, on `online`, and on a short interval (~60s) instead of hourly; listen for `updatefound`/`controllerchange` and reload once the new worker takes control (guard against reload loops with a session flag).
- `src/components/pwa/UpdateAvailable.tsx`: change from a manual "Update" button to a passive toast; auto-apply, deferring the reload while a form input has focus or the page has unsaved state.
- No database or backend changes.
