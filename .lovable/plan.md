# Fix "Apply failed: column is_active does not exist"

## What's wrong

The "Apply structure" button runs a database routine that looks up the current school session using a field called `is_active`. That field doesn't exist on the sessions table — sessions are marked with `is_current` (currently 2026/2027 is the current one). So the whole apply step stops before anything is saved, and all 30 mapping rows stay Pending.

Confirmed by reading the routine and the sessions table; this is the only place with that mistake.

## The fix

Update the apply routine to:

- Pick the current session using `is_current` first, falling back to the most recent session if none is marked current, so it never fails on an empty result.
- Use that session's academic year when creating student enrolment records, with a safe fallback year if there is somehow no session at all.

Nothing else in the mapping logic changes. After the fix, pressing "Apply structure" will create the campuses/classes/arms and place students, and the rows will flip from Pending to applied.

## After applying

Re-check on the Campuses & classes screen that all 30 rows show as applied, and that the Students tab shows the students placed under their classes with the Main/Annex split, with "Not placed in a class" dropping to zero (or only students who genuinely have no class assignment).

## Technical note

Single database migration replacing `public.apply_class_structure_map()`; the session lookup becomes `ORDER BY is_current DESC, created_at DESC LIMIT 1` and `academic_year` gets a `COALESCE` fallback. No table or policy changes.
