# Story 15.4: Export/Restore UX Enhancements

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an administrator,
I want visibility into backup size and progress,
so that long exports/restores are understandable.

## Acceptance Criteria

1. **Size estimate**
   - Given I select a trip to export
   - Then I see an estimated export size before starting

2. **Progress feedback**
   - Given an export or restore is running
   - Then I see a progress indicator

## Tasks / Subtasks

- [x] Add export size estimate data (AC: 1)
  - [x] Provide a server-side estimate for total media bytes + JSON payload overhead
  - [x] Expose estimate in admin export UI per trip
- [x] Add export progress feedback (AC: 2)
  - [x] Replace raw download link with a controlled export action that can surface progress
  - [x] Show progress state (preparing, in-progress, complete/failed)
- [x] Add restore progress feedback (AC: 2)
  - [x] Show upload/validation/restoration progress while restore runs
  - [x] Surface final completion state and errors
- [x] Add translations (AC: 1-2)
  - [x] Add English + German strings for size estimate and progress states
- [x] Tests (AC: 1-2)
  - [x] Export UI shows size estimate and progress states
  - [x] Restore UI shows progress states and still handles errors

## Dev Notes

### Developer Context

- Export UI lives in `travelblogs/src/components/admin/trips-export-dashboard.tsx` and is currently a direct link to `/api/trips/:id/export`.
- Restore UI lives in `travelblogs/src/components/admin/trips-restore-dashboard.tsx` and uses `fetch` to POST the ZIP to `/api/trips/restore`.
- Export ZIP creation is streamed in `travelblogs/src/app/api/trips/[id]/export/route.ts` using `zip-stream` and media files from `resolveUploadRoot()`.
- Restore ZIP handling is in `travelblogs/src/app/api/trips/restore/route.ts` using `node-stream-zip` and validation in `travelblogs/src/utils/trip-restore.ts`.
- API responses must be `{ data, error }` with `{ error: { code, message } }`. [Source: _bmad-output/project-context.md]
- All user-facing strings must be available in English and German using `useTranslation` / `i18n.ts`. [Source: _bmad-output/project-context.md]

### Technical Requirements

- **Size estimate strategy:**
  - Compute total media size for the selected trip by summing file sizes under `resolveUploadRoot()`.
  - Add JSON payload overhead (meta + trip + entries) to provide a reasonable estimate.
  - If any media file is missing, keep behavior aligned with export API (surface error gracefully).
  - Return estimate from a dedicated API endpoint (or extend export API with an estimate mode) using `{ data, error }`.
- **Export progress:**
  - Provide a UI-driven export action that can report progress (e.g., fetch + stream reader or staged export with progress events).
  - Progress should include a clear state for “preparing”, “downloading”, and “completed/failed”.
- **Restore progress:**
  - Show progress for at least: upload in-flight, validation (dry run), restoring, and completion.
  - Ensure error handling preserves existing error messages and restore summary.
- Preserve security and access rules for export/restore (admin-only for restore, admin-or-owner for export).
- Keep `zip-stream` sequential entry behavior in mind: it does not queue entries internally, so progress should follow entry completion order. citeturn1search1

### Architecture Compliance

- App Router only; API routes under `travelblogs/src/app/api`. [Source: _bmad-output/project-context.md]
- Keep Node.js runtime for export/restore route handlers (default `runtime = 'nodejs'`). citeturn0search0
- Use `utils/` for shared helpers; do not add `lib/`. [Source: _bmad-output/project-context.md]

### Library / Framework Requirements

- `zip-stream` latest stable is `7.0.2` and is used for streaming exports. citeturn1search1
- `node-stream-zip` latest stable is `1.15.0` and is used for restore reads. citeturn1search0

### File Structure Requirements

- Export UI: `travelblogs/src/components/admin/trips-export-dashboard.tsx`
- Restore UI: `travelblogs/src/components/admin/trips-restore-dashboard.tsx`
- Export API: `travelblogs/src/app/api/trips/[id]/export/route.ts`
- Restore API: `travelblogs/src/app/api/trips/restore/route.ts`
- Export utilities: `travelblogs/src/utils/trip-export.ts`
- Restore utilities: `travelblogs/src/utils/trip-restore.ts`
- Translations: `travelblogs/src/utils/i18n.ts`

### Testing Requirements

- Export UI tests: `travelblogs/tests/components/admin/trips-export.test.tsx`
- Restore UI tests: `travelblogs/tests/components/admin/trips-restore.test.tsx`
- Export API tests (if estimate endpoint added): `travelblogs/tests/api/trips/export-trip.test.ts`
- Restore API tests: `travelblogs/tests/api/trips/restore-trip.test.ts`

### Previous Story Intelligence

- Story 15.3 established export metadata validation and explicit compatibility checks; keep compatibility behavior intact while adding UX enhancements. [Source: _bmad-output/implementation-artifacts/15-3-export-compatibility-metadata.md]
- Export/restore format is established; do not change ZIP layout or required files (`meta.json`, `trip.json`, `entries.json`, `media/`). [Source: _bmad-output/implementation-artifacts/15-3-export-compatibility-metadata.md]

### Git Intelligence Summary

- Recent work focused on admin export UI and export APIs (Story 15.1), plus media upload handling and world map tweaks. Keep export/restore changes localized to admin export/restore UI and APIs. [Source: git log -5]

### Latest Tech Information

- `zip-stream` does not manage entry queueing internally; export should add entries sequentially and progress should align with entry completion. citeturn1search1
- `node-stream-zip` remains the current restore reader library and supports streaming ZIP reads. citeturn1search0
- Route Handlers default to the Node.js runtime (`runtime = 'nodejs'`) which supports streaming. citeturn0search0turn0search1

### Project Context Reference

- `_bmad-output/project-context.md`

### Story Completion Status

- Status set to **done**.
- Completion note: "Export/restore size estimate + progress requirements implemented with UX and test coverage."

### Project Structure Notes

- Follow naming conventions: `camelCase` variables, `PascalCase` components, `kebab-case.tsx` files. [Source: _bmad-output/project-context.md]
- Tests belong in the central `tests/` tree (no co-located tests). [Source: _bmad-output/project-context.md]

### References

- Epic 15 definitions and ACs: `_bmad-output/planning-artifacts/epics.md`
- Project rules: `_bmad-output/project-context.md`
- Export API: `travelblogs/src/app/api/trips/[id]/export/route.ts`
- Restore API: `travelblogs/src/app/api/trips/restore/route.ts`
- Export utilities: `travelblogs/src/utils/trip-export.ts`
- Restore utilities: `travelblogs/src/utils/trip-restore.ts`
- Admin export UI: `travelblogs/src/components/admin/trips-export-dashboard.tsx`
- Admin restore UI: `travelblogs/src/components/admin/trips-restore-dashboard.tsx`

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

Story created via SM create-story workflow (2026-02-07)

### Implementation Plan

- Add export size estimate computation and API support via `?estimate=true` with media stat sizes + JSON payload bytes.
- Update admin export UI to show size estimate and progress states.
- Update admin restore UI to show progress states for upload/validation/restore.
- Add/extend tests for new UX behaviors and API estimate path.

### Completion Notes List

- ✅ Story file created with requirements, guardrails, and file references.
- ✅ Added export size estimate API + UI display with tests covering estimate bytes and label.
- ✅ Added export download button with streaming progress states and UI test coverage.
- ✅ Added restore upload/validation/restoration progress states with XHR upload tracking and updated tests.
- ✅ Added EN/DE translations for size estimates and progress states.
- ✅ Added/updated export and restore UI tests for size/progress states and error handling.
- ✅ Review fixes: added indeterminate progress indicators, restore abort handling, and expanded test coverage for restore runs and export estimates.

### File List

- `/Users/tommy/Development/TravelBlogs/_bmad-output/implementation-artifacts/15-4-export-restore-ux-enhancements.md`
- `/Users/tommy/Development/TravelBlogs/_bmad-output/implementation-artifacts/sprint-status.yaml`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/app/admin/trips-restore/page.tsx`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/app/api/trips/[id]/export/route.ts`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/app/api/trips/restore/route.ts`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/components/admin/trips-export-dashboard.tsx`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/components/admin/trips-export-page-header.tsx`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/components/admin/trips-restore-dashboard.tsx`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/components/admin/trips-restore-page-header.tsx`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/utils/i18n.ts`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/utils/trip-export.ts`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/utils/trip-restore.ts`
- `/Users/tommy/Development/TravelBlogs/travelblogs/tests/api/trips/export-trip.test.ts`
- `/Users/tommy/Development/TravelBlogs/travelblogs/tests/api/trips/restore-trip.test.ts`
- `/Users/tommy/Development/TravelBlogs/travelblogs/tests/components/admin/trips-export.test.tsx`
- `/Users/tommy/Development/TravelBlogs/travelblogs/tests/components/admin/trips-restore.test.tsx`
- `/Users/tommy/Development/TravelBlogs/travelblogs/tests/utils/trip-export.test.ts`
- `/Users/tommy/Development/TravelBlogs/travelblogs/tests/utils/trip-restore.test.ts`
