## Fix: website pages open scrolled to bottom

**Cause:** No scroll-reset on route change. When navigating between pages, the browser preserves the previous scroll position, so long pages (like Home) appear to open at the bottom.

**Change:**
1. Add `src/components/website/ScrollToTop.tsx` — a small component that calls `window.scrollTo(0, 0)` inside a `useEffect` keyed on `useLocation().pathname` (skips when a hash anchor is present so `#section` links keep working).
2. Mount it inside `WebsiteLayout` (or at the top of `WebsiteRouter`) so every website route resets scroll on navigation.

No other files or business logic touched.