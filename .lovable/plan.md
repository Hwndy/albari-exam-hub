# Fix "Could not load students — CREATE TABLE is not allowed in a non-volatile function"

## What's wrong

The routine that loads a class roster (with filters, search and paging) contains a stray leftover line that tries to create a temporary table. Postgres refuses to create tables inside a read-only routine, so the whole roster query fails before returning anything.

That is why the class cards (SSS 1 = 76 students) show correct counts, but opening a class shows "0 students match the current view" plus the red error. The counts come from a different routine that is fine.

Confirmed by reading the routine definition: `list_students_filtered` is marked read-only yet contains `CREATE TEMP TABLE IF NOT EXISTS _noop(x int);`.

## The fix

One database change: replace `list_students_filtered` with the exact same logic minus the stray temp-table line. No changes to filters, permissions, sorting, paging or any screen code.

## After the fix

Open Students, tap a class (e.g. SSS 1) — the roster should list students, and Filter, Search, Export and Add student should all work on the listed rows. I will re-check a couple of classes and confirm the error toast is gone.

## Technical note

Single migration: `CREATE OR REPLACE FUNCTION public.list_students_filtered(...)` keeping `STABLE SECURITY DEFINER SET search_path = public` and the existing admin/teacher guard, dropping only the `CREATE TEMP TABLE` statement.
