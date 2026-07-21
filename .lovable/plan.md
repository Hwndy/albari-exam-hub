## Goal
Give teachers access to Results Management from their dashboard, mirroring the admin experience but scoped to what teachers should do (enter scores, view broadsheet).

## Changes

### 1. New component: `src/components/teacher/TeacherResultsManagement.tsx`
A teacher-facing wrapper that reuses the existing shared components used by admin, minus admin-only tools:
- **Enter Scores** — reuses `ManualScoresEntry` (already RLS-guarded for teachers of their assigned classes/subjects).
- **Broadsheet** — reuses `Broadsheet`.

Excludes Promotion, Past Students, and Automation Settings (admin-only).

### 2. `src/pages/TeacherDashboard.tsx`
- Import `TeacherResultsManagement`.
- Add a new `TabsTrigger value="results-mgmt"` labeled "Results Management" (with a `Calculator`/`FileText` icon) next to Gradebook.
- Add matching `TabsContent` rendering `<TeacherResultsManagement />`.

No database, RLS, or backend changes — existing policies already allow teachers to enter/read scores for their assigned scope.

## Out of scope
- Automation settings, promotions, and past-student archival remain admin-only.
