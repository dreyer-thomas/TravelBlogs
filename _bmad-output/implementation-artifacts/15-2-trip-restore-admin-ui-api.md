# Story 15.2: Trip Restore (Admin UI + API)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an administrator,
I want to restore a trip from an export ZIP,
so that I can recover it in a new or repaired system.

## Acceptance Criteria

1. **Restore action available**
   - Given I am an admin
   - When I open the admin restore UI
   - Then I can upload a trip export ZIP

2. **Validation and import**
   - Given I upload a valid export ZIP
   - When the restore runs
   - Then trip data, entries, tags, and media are imported
   - And I see a summary of what was created (counts for trip, entries, media)

3. **Invalid export handling**
   - Given I upload an invalid or incompatible ZIP
   - When validation fails
   - Then no partial data is written
   - And I see a clear error message

4. **Admin-only access**
   - Given I am not an admin
   - When I attempt to restore a trip
   - Then the restore is rejected

## Tasks / Subtasks

- [x] Define restore validation + mapping (AC: 2, 3)
  - [x] Validate ZIP structure: `meta.json`, `trip.json`, `entries.json`, `media/`
  - [x] Validate `meta.json` schema + version compatibility
  - [x] Validate JSON shape + required fields (trip, entries, tags)
  - [x] Build a dry-run summary (counts + conflicts)
- [x] Build restore API endpoint (AC: 2, 3, 4)
  - [x] Add `POST /api/trips/restore` route handler (Node runtime)
  - [x] Enforce admin-only access + active account
  - [x] Stream/read ZIP without loading entire file into memory
  - [x] Import trip + entries + tags + media atomically (transaction)
  - [x] Roll back on any validation/import error
  - [x] Return `{ data, error }` response shape
- [x] Build admin restore UI (AC: 1, 2, 3)
  - [x] Add admin page (e.g., `/admin/trips-restore`)
  - [x] File upload control with progress/disabled state
  - [x] Show dry-run summary (counts + warnings) before final commit
  - [x] Surface validation errors clearly (EN/DE strings)
- [x] Tests (AC: 1-4)
  - [x] API test: admin restore success imports trip, entries, media
  - [x] API test: invalid ZIP rejected with no partial writes
  - [x] API test: non-admin rejected
  - [x] Component test: restore UI upload + error states

### Review Follow-ups (AI)
- [x] [AI-Review][High] Reject path traversal in media restore paths (normalize and block `..` / absolute paths). `/Users/tommy/Development/TravelBlogs/travelblogs/src/utils/trip-restore.ts`
- [x] [AI-Review][High] Enforce safe-join for media restore writes under upload root. `/Users/tommy/Development/TravelBlogs/travelblogs/src/app/api/trips/restore/route.ts`
- [x] [AI-Review][Medium] Filter or reject unreferenced media entries in restore archives. `/Users/tommy/Development/TravelBlogs/travelblogs/src/app/api/trips/restore/route.ts`
- [x] [AI-Review][Medium] Return dry-run summary with warnings even on conflict detection. `/Users/tommy/Development/TravelBlogs/travelblogs/src/app/api/trips/restore/route.ts`
- [x] [AI-Review][Medium] Pre-validate duplicate tag normalized names and duplicate entry-tag pairs to avoid 500s. `/Users/tommy/Development/TravelBlogs/travelblogs/src/app/api/trips/restore/route.ts`

## Dev Notes

### Developer Context

- Restore must align with the export format defined in `travelblogs/src/utils/trip-export.ts` and produced by `travelblogs/src/app/api/trips/[id]/export/route.ts`. The ZIP contains `meta.json`, `trip.json`, `entries.json`, and `media/` with paths rooted at `/uploads/`. Use the same upload root resolution logic (`MEDIA_UPLOAD_DIR` or `public/uploads`). [Source: travelblogs/src/utils/trip-export.ts, travelblogs/src/app/api/trips/[id]/export/route.ts]
- Entry schema does not have a dedicated entry date field. Exports currently set `entryDate` from `createdAt`. Restore should map `entries.json.entryDate` to `Entry.createdAt` (and `updatedAt` if provided) to preserve ordering and display behavior. [Source: travelblogs/src/utils/trip-export.ts, travelblogs/prisma/schema.prisma]
- Tag model enforces uniqueness on `(tripId, normalizedName)` and EntryTag enforces `(entryId, tagId)`. Restore must avoid violating these constraints (use upsert or de-dupe by normalizedName). [Source: travelblogs/prisma/schema.prisma]
- Admin-only access is required. Mirror auth patterns and inactive account checks from existing admin APIs. [Source: travelblogs/src/app/api/users/route.ts, travelblogs/src/utils/roles.ts]
- All user-facing strings must be translatable and provided in English and German. [Source: _bmad-output/project-context.md]

### Technical Requirements

- Validate ZIP structure and JSON schema before any writes. Reject on missing files, invalid JSON, or unsupported schema version (from `meta.json`).
- Ensure atomic restore: use a Prisma transaction and roll back on any validation or write error.
- Handle ID collisions safely:
  - If `trip.id` already exists, fail with a clear conflict error (do not overwrite).
  - If any `entry.id`, `tag.id`, or `media.id` conflicts, fail and report conflict (unless a safe remap strategy is explicitly implemented).
- Media restoration:
  - Map `media.url` to filesystem paths under the upload root and restore bytes to the same relative path.
  - Reject if a media file already exists to avoid silent overwrite.
- API responses must be wrapped as `{ data, error }` with `{ error: { code, message } }`. [Source: _bmad-output/project-context.md]

### Architecture Compliance

- App Router only; all API routes under `travelblogs/src/app/api`. [Source: _bmad-output/project-context.md]
- REST endpoints must be plural (e.g., `/api/trips/restore`). [Source: _bmad-output/project-context.md]
- Use `utils/` for shared helpers; do not introduce `lib/`. [Source: _bmad-output/project-context.md]

### Library / Framework Requirements

- Use a ZIP reader that supports large archives without loading everything into memory. `node-stream-zip` supports ZIP64 and streaming entry reads. citeturn1search1
- For streaming ZIP creation/consumption compatibility, stay aligned with `zip-stream` behavior used by export (no internal queueing; entries must be added sequentially). citeturn1search0
- Route Handlers in App Router use Web Request/Response APIs; keep the restore endpoint in `app/api` as a Route Handler with Node runtime. citeturn0search1

### File Structure Requirements

- API route: `travelblogs/src/app/api/trips/restore/route.ts`
- Admin UI: `travelblogs/src/app/admin/trips-restore/page.tsx`
- Components: `travelblogs/src/components/admin/trips-restore-dashboard.tsx` (or similar)
- Shared helpers: `travelblogs/src/utils/trip-restore.ts`
- Tests: `travelblogs/tests/api/trips/restore-trip.test.ts`, `travelblogs/tests/components/admin/trips-restore.test.tsx`

### Testing Requirements

- Admin restore succeeds with valid ZIP; trip, entries, tags, and media are imported.
- Invalid ZIP or incompatible schema version is rejected with no partial writes.
- Non-admin user receives `403` and no writes occur.
- Media collisions are detected and reported.

### Previous Story Intelligence

- Export ZIP structure and metadata are defined in Story 15.1 and implemented in `travelblogs/src/app/api/trips/[id]/export/route.ts`. Restore must treat `meta.json`, `trip.json`, `entries.json`, and `media/` as the authoritative export layout. [Source: _bmad-output/implementation-artifacts/15-1-trip-export-admin-ui-api.md]
- Export uses `zip-stream` with ZIP64 support and writes entries sequentially. Restore should be compatible with that output and avoid assumptions about entry order. [Source: _bmad-output/implementation-artifacts/15-1-trip-export-admin-ui-api.md]
- Admin export UI patterns and i18n keys are already established (e.g., `admin.exportTrip`, `admin.exportTripsDescription`). Mirror the UX style and translation approach for restore. [Source: travelblogs/src/components/admin/trips-export-dashboard.tsx, travelblogs/src/utils/i18n.ts]

### Git Intelligence Summary

- Recent work introduced trip export API + admin UI (`/admin/trips-export`) and supporting utilities/tests. Maintain consistency with these patterns.
- Recent media upload updates added HEIC/HEIF handling. Ensure restore writes media to the same uploads path and does not introduce new media pipelines.

### Latest Tech Information

- `node-stream-zip` supports ZIP64 archives and streaming entry reads, appropriate for large exports. citeturn1search1
- `zip-stream` does not internally queue entries; entries must be added sequentially, which influences restore compatibility expectations. citeturn1search0
- Next.js Route Handlers are built on Web Request/Response APIs and should be used for App Router API endpoints. citeturn0search1

### Project Context Reference

- `_bmad-output/project-context.md`

### Story Completion Status

- Status set to **review**.
- Completion note: "Restore workflow implemented with admin-only validation, atomic import, admin UI, and tests."

### Change Log

- 2026-02-07: Implemented trip restore validation, API endpoint, admin UI, translations, and tests; full suite passing.
- 2026-02-07: Hardened restore media path validation, dry-run conflict warnings, and added coverage for new validation cases.

### Project Structure Notes

- Maintain existing project conventions: `kebab-case.tsx` files, `PascalCase` components, and `tests/` as the test root. [Source: _bmad-output/project-context.md]
- This story adds restore functionality and should not alter export behavior or existing routes.

### References

- Epic 15 definitions and ACs: `_bmad-output/planning-artifacts/epics.md`
- Project rules: `_bmad-output/project-context.md`
- Export format + helpers: `travelblogs/src/utils/trip-export.ts`
- Export API: `travelblogs/src/app/api/trips/[id]/export/route.ts`
- DB schema: `travelblogs/prisma/schema.prisma`
- Admin auth patterns: `travelblogs/src/app/api/users/route.ts`, `travelblogs/src/utils/roles.ts`

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

Story created via SM create-story workflow (2026-02-07)
Full test suite failed at tests/components/world-map.test.tsx (popup not dismissed) on 2026-02-07; fixed in world-map document handler.
Full test suite passed on 2026-02-07.
Restore API tests passed and full suite re-run on 2026-02-07.
Restore UI tests passed and full suite re-run on 2026-02-07.
Full test suite passed via `npm test` on 2026-02-07.

### Completion Notes List

- ✅ Drafted ACs, tasks, and restore strategy aligned with export format and project rules.
- ✅ Added admin-only access, validation, and atomic import guidance.
- ✅ Included library guidance for streaming ZIP handling and App Router route handlers.
- ✅ Implemented trip restore validation + dry-run summary utilities with conflict detection.
- ✅ Added unit tests for restore archive validation and summary generation.
- ✅ Fixed world-map outside-click dismissal to stabilize full test suite.
- ✅ Implemented restore API endpoint with admin-only access, ZIP validation, media restore, and atomic DB import.
- ✅ Added API tests covering restore success, invalid archives, and non-admin access.
- ✅ Added admin restore page + dashboard with dry-run summary and error states.
- ✅ Added EN/DE translations for restore workflow.
- ✅ Added component tests for restore UI.
- ✅ Added media path sanitization, conflict-aware dry-run warnings, and expanded restore validation tests.

### File List

- `/Users/tommy/Development/TravelBlogs/_bmad-output/implementation-artifacts/15-2-trip-restore-admin-ui-api.md`
- `/Users/tommy/Development/TravelBlogs/_bmad-output/implementation-artifacts/sprint-status.yaml`
- `/Users/tommy/Development/TravelBlogs/_bmad-output/implementation-artifacts/validation-report-20260207T175423.md`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/components/trips/world-map.tsx`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/utils/i18n.ts`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/app/admin/trips-restore/page.tsx`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/app/api/trips/restore/route.ts`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/components/admin/trips-restore-dashboard.tsx`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/components/admin/trips-restore-page-header.tsx`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/utils/trip-restore.ts`
- `/Users/tommy/Development/TravelBlogs/travelblogs/tests/api/trips/restore-trip.test.ts`
- `/Users/tommy/Development/TravelBlogs/travelblogs/tests/components/admin/trips-restore.test.tsx`
- `/Users/tommy/Development/TravelBlogs/travelblogs/tests/utils/trip-restore.test.ts`
