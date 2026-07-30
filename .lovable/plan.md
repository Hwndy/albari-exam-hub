## 1. Fix the two broken screens (layout overlap)

Both screenshots show text stacking on top of other text:

- **Dashboard header**: the sidebar's "AL-BARI / GROUP OF SCHOOLS" logo block renders over the sticky top bar and the KPI row. Fix by giving the sidebar brand block its own fixed-height row inside the sidebar container (so it can't paint over the main column), and giving the sticky header a solid background + correct z-index above page content.
- **Admissions hub**: three problems at once —
  - the same sidebar brand bleeding over the "Manage applications, sessions…" line,
  - the 7 tab triggers wrapping into a second row that the `Card` wrapper doesn't grow for,
  - a duplicate page title: the hub already renders a breadcrumb header, and `AdmissionManagement` renders its own `Admission Management` H2 + description underneath the tabs.

  Fixes: convert the tab strip to a single horizontally-scrollable row on small screens (no wrapping/overlap), remove the redundant H2/description from `AdmissionManagement`, and move the "Fix student logins & parent links" button into the applications toolbar instead of floating next to the heading.

Verified across the other hubs (Settings, Academics, People) for the same duplicate-heading pattern and fixed where present.

## 2. Offer letter: letter printed *inside* the letterhead

Today `send-offer-letter` draws the letterhead PNG as a 65mm band at the top and starts the letter text below it — that's why it reads as "letterhead on top, letter underneath".

Change to a true letterhead page:
- Draw the letterhead image **full page** (0,0 → full width × full height) as the page background, once per page.
- Define a content safe-area inside it (top margin below the crest/banner, bottom margin above the footer strip, left/right margins inside the side rule) and lay out all letter text within that box.
- Add automatic page-break handling: when content passes the safe-area bottom, add a new page and re-draw the same letterhead background before continuing.
- Keep the existing no-letterhead fallback (plain green header) for when the asset fetch fails.
- Same treatment for the HTML email version: letterhead as a background image on the letter container rather than a stacked banner image.

## 3. Remove the "AI-written" tone from the emails

Rewrite copy in `send-offer-letter` and `send-admission-notification` (submitted, under review, interview, accepted, rejected, enrolled, exam result, resit) to read like school correspondence:

- Drop emoji subjects (`🎉`, `🎓`) and exclamation-heavy openers ("Congratulations!", "We are delighted…").
- Replace generic filler ("We received an overwhelming number of applications…", "We look forward to seeing you on campus!") with concrete, specific sentences.
- Use plain formal structure: reference line, short body paragraph, a details block, clear next step with a deadline, signed off by the Admissions Office with the school address and phone.
- Consistent British-Nigerian spelling, no bullet-list padding where a sentence works, no "Best regards,<br>…Team" on every single template.

No behavioural/logic change — only the subject/HTML/PDF strings.

## 4. Icon cleanup across the app

Audit `lucide-react` usage and reduce decorative icon noise:

- Remove icons from places where they add nothing: tab triggers that already have labels, card titles, section headings, table headers, inline status text.
- Keep icons only where they carry meaning: buttons/actions (add, delete, export, print), status indicators, empty states, and sidebar navigation.
- Standardise the survivors: single stroke width, one size scale (`h-4 w-4` inline, `h-5 w-5` for nav/action), `text-muted-foreground` unless conveying state, and consistent semantic choices (one icon per concept across the whole app — no three different "student" icons).
- Public website: same pass on hero/feature/section icons, replacing scattered emoji-ish choices with a consistent, restrained set.

## Technical notes

- Files: `supabase/functions/send-offer-letter/index.ts`, `supabase/functions/send-admission-notification/index.ts`, `src/components/admin/admissions/AdmissionsHub.tsx`, `src/components/admin/AdmissionManagement.tsx`, `src/pages/AdminDashboard.tsx`, `src/components/ui/admin-sidebar.tsx`, plus icon edits across admin/website components.
- Both edge functions get redeployed after the copy/PDF change.
- I'll render a sample offer-letter PDF after the change to confirm the text sits inside the letterhead frame and doesn't collide with the footer.
