
## Root cause

The Admissions page (and every other data-driven page) fails because **every table in the `public` schema currently has zero grants** for the `anon`, `authenticated`, and `service_role` roles. This was collateral damage from the previous multitenancy purge — dropping `school_id` and rebuilding policies did not re-issue the `GRANT` statements PostgREST requires.

Verified via `information_schema.role_table_grants` — the query returns 0 rows for all 70 public tables. Without grants, RLS policies never even get evaluated; PostgREST returns "permission denied" (which the UI surfaces as "Failed to load applications").

The stale `column school_id does not exist` errors in the DB logs are from the previous turn's timestamps (before the multitenancy rewrite finished) — current source no longer references `school_id`, so this is not the active bug.

## Fix (one migration)

1. Loop over every base table in `public` and grant:
   - `SELECT, INSERT, UPDATE, DELETE` to `authenticated`
   - `ALL` to `service_role`
2. Grant `SELECT` to `anon` on the public-facing tables the website + public admission form need:
   `classes`, `school_info`, `news_articles`, `gallery`, `testimonials`, `website_pages`, `website_sections`, `website_settings`, `academic_calendar`, `admission_sessions`.
3. Grant `INSERT` to `anon` on `admission_applications` and `admission_documents` (public admission submissions).
4. Grant `USAGE` on all sequences in `public` to all three roles.

No RLS policy changes — existing policies are already correct (`is_admin()` / `has_role()` / owner checks). This purely restores the missing table-level privileges.

## Expected outcome

- Admin admissions pages load applications, decisions board, exams, interviews, payments, analytics.
- All other admin/teacher/student/parent screens that were silently returning permission errors start working again.
- Public website and admission form continue to work (anon reads/writes preserved where needed).
