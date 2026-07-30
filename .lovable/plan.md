## Root cause (confirmed)

In `src/components/admin/StudentsByClass.tsx` the component's mount effect is empty:

```text
useEffect(() => {
  // eslint-disable-next-line
}, []);
```

`fetchAll()` and `fetchSchoolBranding()` are defined but never called, so `loading` stays `true` forever and the page shows a spinner. The data itself is fine — the database has 363 student records and 362 class assignments, admin read policies on `classes`, `class_assignments`, `students` and `profiles` all allow access, and there are no database errors in the logs.

## The fix

1. Restore the mount effect so it calls `fetchAll()` and `fetchSchoolBranding()` on load (and re-runs when the signed-in user changes).
2. Guard against a stuck spinner in the future: if the class fetch throws, the error toast already fires and `loading` is cleared — keep that, and also show an explicit "No students found" empty state instead of a blank panel once loading finishes.
3. Verify after the change that classes expand and list their students, and that search, CSV export and the row actions still work.

## Technical notes

- Single file touched: `src/components/admin/StudentsByClass.tsx`. No database or edge-function changes needed.
- Other screens that call `fetchAll()`-style refreshes after add/delete already exist in this file and will keep working once the initial call is restored.
