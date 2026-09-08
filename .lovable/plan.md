# Installable phone app for the portal

Goal: parents, students and staff can install Al-Bari portal on their phone, launch it from an icon with no browser bar, and still open it when the network drops. Also prepare a true native wrapper so the same app can later go to the App Store and Play Store.

## What's wrong today

- The app icon files the phone asks for (`icon-192.png`, `icon-512.png`) and the store-style screenshots are listed in the manifest but do not exist in `public/`. Installing therefore shows a blank or generic icon, and Android may refuse the install prompt.
- Two different offline engines are fighting: a hand-written `public/sw.js` plus the `vite-plugin-pwa` generated worker at the same address. Whichever wins is unpredictable, which is the usual cause of stale screens after an update.
- The worker can register inside the Lovable preview, which serves outdated pages while you are editing.

## Plan

### 1. Real app identity
- Generate app icons (192, 512, plus maskable and Apple touch icon) from the school logo, and two screenshots (phone and wide) so Android shows a proper install card.
- Rewrite `public/manifest.json`: correct icon entries, `display: "standalone"`, portrait, theme/background colours matching the portal, `id` and `scope`, and shortcuts to Bills, Results and Attendance that work for parents and students while the whole portal stays available.
- Align the head tags in `index.html` (manifest, theme colour, apple touch icon, app title).

### 2. One offline engine, safely guarded
- Delete the hand-written `public/sw.js` and let `vite-plugin-pwa` (`generateSW`, `autoUpdate`, `injectRegister: null`) own the worker.
- Add a single registration wrapper module that refuses to register in development, inside an iframe, on Lovable preview hostnames, or when the address ends with `?sw=off` — and unregisters any leftover worker in those cases. `src/main.tsx` calls only this wrapper.
- Caching rules: page loads use network-first (never cache-first) so a published update is picked up on the next open; built images, fonts and scripts cached for speed; `/~oauth` and Supabase auth paths excluded.
- Basic offline behaviour: the app shell opens and the last-seen pages render with a clear "you are offline" bar; anything that needs the server shows a friendly retry message instead of a white screen.

### 3. Install experience
- Keep the existing install banner and `/install` page, but fix them: correct Android prompt handling, accurate iPhone Share → Add to Home Screen steps, and hide once installed.
- Make sure the update notice applies silently instead of asking the user to press a button, matching the automatic-update behaviour you asked for earlier.

### 4. Native wrapper (for the stores, later)
- Add Capacitor (core, cli, ios, android) with app id `app.lovable.def176ba5aaa4bf2a711588b116fc44e`, name `albari-exam-hub`, and hot-reload pointed at the sandbox preview URL.
- Add splash/status-bar config and safe-area padding so the portal does not sit under the phone notch.
- You will need to export the project to GitHub and run the native build steps on your own machine (Xcode for iPhone, Android Studio for Android); I will list those steps.

## Verification
- Typecheck and production build.
- Load the built app in a phone-sized browser session: confirm the manifest and icons resolve, the worker registers only in the published build, the app opens from a cold start with the network cut, and a new build replaces the old one without a manual refresh.

## Technical notes
- Files touched: `public/manifest.json`, `index.html`, `vite.config.ts`, `src/main.tsx`, new `src/lib/register-sw.ts`, `src/components/pwa/*`, `src/pages/InstallPage.tsx`, removal of `public/sw.js`, new `capacitor.config.ts`, new icon/screenshot assets.
- Service worker filename stays `/sw.js` so browsers that already hold the old hand-written worker get replaced at the same path.
- No database, RLS or billing logic changes.
