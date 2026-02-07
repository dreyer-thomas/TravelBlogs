# Story 15.1: Trip Export (Admin UI + API)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an administrator,
I want to export a trip to a portable archive,
so that I can back it up or transfer it in an emergency.

## Acceptance Criteria

1. **Export action available for admins and trip owners**
   - Given I am an administrator (or the trip owner)
   - When I access the trip export action
   - Then I can trigger an export for that trip

2. **Portable ZIP format with full trip data**
   - Given I export a trip
   - When the export completes
   - Then I receive a ZIP containing JSON data and all media files
   - And the export includes trip metadata, entries, tags, locations, GPS, and weather
   - And the archive contains `meta.json`, `trip.json`, `entries.json`, and a `media/` folder

3. **Access control enforced**
   - Given I am not an admin or the trip owner
   - When I attempt to export a trip
   - Then the export is rejected with a clear error

4. **Streaming download with no size limit**
   - Given the trip is large
   - When I export it
   - Then the ZIP is streamed without loading the full archive into memory
   - And the download uses a meaningful filename

## Tasks / Subtasks

- [x] Define export format + helpers (AC: 2, 4)
  - [x] Add export schema version constant and metadata shape
  - [x] Create helper to resolve upload root (reuse upload path behavior)
  - [x] Implement JSON serializers (ISO dates, camelCase)

- [x] Build export API endpoint (AC: 2, 3, 4)
  - [x] Add `GET /api/trips/[id]/export` route handler (Node runtime)
  - [x] Enforce admin or trip-owner access
  - [x] Load trip + entries + media with Prisma includes
  - [x] Stream ZIP with `meta.json`, `trip.json`, `entries.json`, and `media/`
  - [x] Set `Content-Disposition` filename and `application/zip` content type
  - [x] Ensure errors return `{ data: null, error: { code, message } }`

- [x] Admin UI export entry point (AC: 1)
  - [x] Add admin page to list trips with export action
  - [x] Wire export button to download endpoint
  - [x] Add i18n strings (EN/DE) for labels and errors

- [x] Tests (AC: 1-4)
  - [x] API test: admin/owner can export; non-authorized rejected
  - [x] API test: ZIP contains required files and media
  - [x] Component test: admin UI shows export action

## Dev Notes

### Developer Context

- Follow existing admin access patterns in `travelblogs/src/app/api/users/route.ts` and `travelblogs/src/app/api/users/admin-helpers.ts`. Admin/owner access should align with trip permission checks used in `travelblogs/src/app/api/trips/[id]/route.ts`. [Source: travelblogs/src/app/api/users/route.ts, travelblogs/src/app/api/users/admin-helpers.ts, travelblogs/src/app/api/trips/[id]/route.ts]
- Media files are stored under `public/uploads/trips` (or `MEDIA_UPLOAD_DIR` + `/trips`). Resolve URLs like `/uploads/trips/...` to file paths using a shared helper to avoid duplication. [Source: travelblogs/src/app/api/media/upload/route.ts]

### Technical Requirements

- Export format: ZIP with `meta.json`, `trip.json`, `entries.json`, and `media/` directory.
- `meta.json` must include schema version, export timestamp, and counts (trip, entries, media).
- JSON output uses camelCase and ISO 8601 dates.
- ZIP generation must stream and support large archives (no hard size limits).
- Error responses must use `{ data: null, error: { code, message } }`.

### Architecture Compliance

- App Router only; all API routes under `src/app/api`. [Source: _bmad-output/project-context.md]
- REST endpoints must remain plural (use `/trips/[id]/export`). [Source: _bmad-output/project-context.md]
- Responses must be wrapped `{ data, error }` for JSON error cases. [Source: _bmad-output/project-context.md]

### Library / Framework Requirements

- Use Route Handlers and Web `Response` APIs for streaming download responses in App Router. [Source: Next.js Route Handlers docs]
- Use a streaming ZIP generator that supports ZIP64 (e.g., ZipStream). [Source: ZipStream docs]
- Choose a ZIP reader for future restore that supports large archives without loading into memory (e.g., node-stream-zip). [Source: node-stream-zip docs]

### File Structure Requirements

- API route: `travelblogs/src/app/api/trips/[id]/export/route.ts`
- Admin UI: `travelblogs/src/app/admin/trips-export/page.tsx` (or `admin/backups` per design choice)
- Shared helpers: `travelblogs/src/utils/` (no new `lib/`)
- Tests: `travelblogs/tests/api/trips/export-trip.test.ts`, `travelblogs/tests/components/admin/trips-export.test.tsx`

### Testing Requirements

- Admin/owner export allowed; unauthorized users rejected.
- ZIP contains `meta.json`, `trip.json`, `entries.json`, and `media/` files.
- JSON uses ISO dates and camelCase keys.
- Export download uses `Content-Disposition` and `application/zip`.

### Latest Tech Information

- Route Handlers in App Router use Web Request/Response APIs and can return a streamed `Response`. [Source: Next.js Route Handlers docs]
- ZipStream supports streaming zip generation and ZIP64 headers via `forceZip64`. [Source: ZipStream docs]
- node-stream-zip reads large archives without loading entire zip into memory and supports ZIP64. [Source: node-stream-zip docs]

### Project Context Reference

- `_bmad-output/project-context.md`

### Project Structure Notes

- API routes live under `src/app/api` only.
- Feature components live in `src/components/<feature>/`.
- Tests live under `tests/` (no co-located tests).

### References

- Epic 15 definitions and ACs: `_bmad-output/planning-artifacts/epics.md`
- Project rules: `_bmad-output/project-context.md`
- Admin access patterns: `travelblogs/src/app/api/users/route.ts`, `travelblogs/src/app/api/users/admin-helpers.ts`
- Upload storage behavior: `travelblogs/src/app/api/media/upload/route.ts`

### Story Completion Status

- Status set to **ready-for-dev**.
- Completion note added in Dev Agent Record.

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- Story created via SM create-story workflow (2026-02-07)

### Completion Notes List

- ✅ Created story 15.1 for trip export with admin/owner access and streaming ZIP requirements.
- ✅ Added trip export helpers (schema version, metadata, serializers, upload root) and unit tests; full test suite passed.
- ✅ Implemented export API route with ZIP streaming and media inclusion; added API coverage and reran full test suite.
- ✅ Built admin trip export UI, i18n strings, and component coverage; full test suite passed.
- ✅ Addressed code review fixes: meta trip counts, streamed media entries, portable ZIP paths, and added test coverage for counts/entry date.

### File List

- `/Users/tommy/Development/TravelBlogs/_bmad-output/implementation-artifacts/15-1-trip-export-admin-ui-api.md`
- `/Users/tommy/Development/TravelBlogs/_bmad-output/implementation-artifacts/sprint-status.yaml`
- `/Users/tommy/Development/TravelBlogs/_bmad-output/implementation-artifacts/validation-report-20260207T174000.md`
- `/Users/tommy/Development/TravelBlogs/_bmad-output/planning-artifacts/epics.md`
- `travelblogs/src/utils/trip-export.ts`
- `travelblogs/tests/utils/trip-export.test.ts`
- `travelblogs/src/app/api/trips/[id]/export/route.ts`
- `travelblogs/tests/api/trips/export-trip.test.ts`
- `travelblogs/src/app/admin/trips-export/page.tsx`
- `travelblogs/src/components/admin/trips-export-dashboard.tsx`
- `travelblogs/src/components/admin/trips-export-page-header.tsx`
- `travelblogs/src/components/trips/trips-page-content.tsx`
- `travelblogs/src/utils/i18n.ts`
- `travelblogs/tests/components/admin/trips-export.test.tsx`
- `travelblogs/tests/components/trips-page.test.tsx`
- `travelblogs/package.json`
- `travelblogs/package-lock.json`
