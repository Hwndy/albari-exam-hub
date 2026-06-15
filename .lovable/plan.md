## Problem

Submitting the application fails with **"Invalid Class Selection — The selected class is not available."**

Root cause: `src/components/website/AdmissionForm.tsx` renders a **hardcoded** class dropdown:

```
const classes = ['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'];
```

But the actual rows in `public.classes` are named `JSS 1 A`, `JSS 1 B`, `JSS1B`, `SSS 1 A`, `BASIC 4`, etc. There is **no row literally named "JSS 1"**, so on submit this lookup returns `null`:

```ts
supabase.from('classes').select('id, name').eq('name', formData.applying_for_class)
```

…and the form aborts with the toast you saw. The RPC was never called.

## Fix

1. **Load classes from the database** on mount (anon read is already allowed by the `Public can view classes for registration` policy).
2. **Store `class_id` in form state**, not the class name. The Select shows `name`, value is `id`.
3. **Remove the name → id lookup** in `handleSubmit` and pass `applying_for_class_id` straight to the `submit_admission_application` RPC.
4. **Review step** — display the chosen class by looking up its name from the loaded list.
5. Show a friendly empty state if no classes are configured yet (so admins know to seed them) instead of failing silently at submit time.

No DB changes, no RPC changes, no other components touched. Single-file edit to `src/components/website/AdmissionForm.tsx`.

## Out of scope

- Filtering classes by active admission session (can be added later if needed; the RPC already resolves `school_id` from the class).
- Visual redesign of the Apply page.
