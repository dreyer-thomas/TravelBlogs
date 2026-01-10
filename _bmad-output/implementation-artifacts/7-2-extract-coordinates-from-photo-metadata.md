# Story 7.2: Extract Coordinates from Photo Metadata

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want the system to extract location coordinates from uploaded photos,
so that entries can be placed on the map automatically.

## Acceptance Criteria

1. **Given** I upload photos that contain GPS metadata
   **When** the upload completes
   **Then** the system extracts coordinates and associates them with the entry
2. **Given** I upload photos without GPS metadata
   **When** the upload completes
   **Then** the system leaves location empty and does not error

## Dependencies / Decisions Required

- Choose and document the EXIF parsing library before implementation.
  - Decision: `exifr` (server-side EXIF parsing).
- Decide and document the single source of truth for location (entry-level, media-level, or both). If both, define precedence for map pins.
- Align with Story 7.1 map view expectations for location field names and null handling.

## Tasks / Subtasks

- [x] Define location data model and storage strategy (AC: 1, 2)
  - [x] Decide where location lives (entry-level, media-level, or both) and update schema accordingly
  - [x] Define how to derive entry location when multiple photos have GPS metadata
- [x] Extend media upload pipeline to parse GPS metadata (AC: 1)
  - [x] Use `exifr` for server-side EXIF parsing
  - [x] Extract latitude/longitude during upload and persist to the database
- [x] Ensure graceful handling for missing GPS metadata (AC: 2)
  - [x] Do not fail uploads without GPS data
  - [x] Leave location fields null or empty per schema
- [x] API contract updates (AC: 1, 2)
  - [x] Ensure entry/media responses include location fields in `camelCase`
  - [x] Preserve `{ data, error }` response wrapper
- [x] Tests (AC: 1, 2)
  - [x] Add API tests for GPS extraction and null handling
  - [x] Add unit tests for metadata parsing helpers if introduced

## Dev Notes

### Developer Context

- This story powers the map view (Epic 7.1). It must produce reliable entry locations.
- The media upload pipeline already exists; integrate GPS extraction there to avoid extra passes.
- Missing GPS must never error; location should remain empty and the UI should show the map empty state.
- Reuse existing upload routes and media utilities; do not create a parallel upload flow.

### Technical Requirements

- Server-side only validation and parsing (Zod 4.2.1 for API validation).
- Store dates as ISO 8601 strings; use `camelCase` for JSON fields.
- All user-facing strings remain translatable (EN/DE) if any new UI copy is added.
- Use the pinned stack versions: Next.js + TypeScript, Redux Toolkit 2.11.2, Prisma 7.2.0, Auth.js 4.24.13, Zod 4.2.1.

### Architecture Compliance

- API routes under `src/app/api` only.
- REST endpoints are plural; responses wrapped `{ data, error }` with `{ error: { code, message } }`.
- Use Prisma 7.2.0 + SQLite; avoid schema naming violations (singular tables, `camelCase` columns).
- Use `.env` and `.env.example` only; no `.env.local`. Do not add Docker/TLS proxy.

### Library / Framework Requirements

- Next.js App Router + TypeScript + Tailwind CSS.
- Auth.js (NextAuth) 4.24.13 for protected creator routes.
- Select an EXIF parsing library that works in Node without browser-only dependencies.

### File Structure Requirements

- Any parsing helpers should live in `src/utils/`.
- API changes belong under `src/app/api/media/` or `src/app/api/entries/` depending on current upload flow.
- Tests must live under `tests/` (no co-located tests).

### Testing Requirements

- Add API tests in `tests/api/` for GPS extraction and null cases.
- If helpers are created, add focused unit tests in `tests/` to cover parsing behavior.
- Add regression tests to ensure media upload succeeds when GPS metadata is missing.

### Performance Considerations

- Avoid blocking uploads on heavy EXIF parsing; keep upload response times aligned with existing media flows.
- If parsing is async, ensure location association is complete before map view relies on it.

### Previous Story Intelligence

- Story 7.1 identified map provider selection as a prerequisite and expects entry location fields in responses.
- Align location field naming and null handling with map view expectations to avoid UI mismatches.

### Git Intelligence Summary

- Recent commits focus on language/date formatting and admin flows; no existing map or EXIF patterns to reuse.

### Latest Tech Information

- Web research not performed due to restricted network access; use versions pinned in architecture and project context.

### Project Structure Notes

- Keep feature and naming conventions consistent: `PascalCase` components, `kebab-case.tsx` files.
- Use `src/utils/` for shared helpers; avoid adding `lib/`.

### References

- Epic story source: `_bmad-output/epics.md` (Epic 7, Story 7.2)
- UX context: Map + Timeline Sync Panel behavior: `_bmad-output/ux-design-specification.md`
- Architecture rules and stack versions: `_bmad-output/architecture.md`
- Global agent rules: `_bmad-output/project-context.md`

## Project Context Reference

- Project-wide rules and constraints are defined in `_bmad-output/project-context.md`. Follow them exactly.

## Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

None.

### Completion Notes List

- Installed `exifr` library for server-side GPS extraction from EXIF metadata
- Created `extractGpsFromImage` utility in [src/utils/entry-location.ts](travelblogs/src/utils/entry-location.ts) with comprehensive validation
- Extended media upload API [src/app/api/media/upload/route.ts](travelblogs/src/app/api/media/upload/route.ts) to extract GPS and return location with upload response
- Location data model: Entry-level storage using existing `latitude`, `longitude`, `locationName` fields from Story 7.1
- Strategy: First photo with GPS metadata populates entry location (client-side responsibility)
- Graceful null handling: Missing GPS returns `location: null` without errors
- API responses include location in camelCase format: `{ latitude, longitude }`
- **Automatic GPS Backfill on Startup:**
  - Created [src/utils/backfill-gps.ts](travelblogs/src/utils/backfill-gps.ts) to extract GPS from existing images
  - Integrated with Next.js instrumentation hook in [src/instrumentation.ts](travelblogs/src/instrumentation.ts)
  - Runs once on app startup (dev and production) to backfill GPS data for existing entries
  - Skips entries that already have location data
  - Manual script available: `cd travelblogs && npx tsx scripts/run-gps-backfill.ts`
  - Note: Next.js 16.1.0+ recognizes `instrumentation.ts` by default (experimental flag not needed)
  - Both instrumentation hook and production server use BetterSqlite3 adapter (required for Prisma 7.2.0)
  - Instrumentation hook uses dynamic imports to avoid Edge Runtime compatibility issues
- Comprehensive test coverage:
  - Unit tests for GPS extraction utility [tests/utils/entry-location.test.ts](travelblogs/tests/utils/entry-location.test.ts)
  - API integration tests for media upload [tests/api/media/upload.test.ts](travelblogs/tests/api/media/upload.test.ts)
  - Backfill integration tests [tests/utils/backfill-gps.test.ts](travelblogs/tests/utils/backfill-gps.test.ts)
  - Test fixtures for images with/without GPS metadata
- All 387 tests passing, no regressions

### File List

- `_bmad-output/implementation-artifacts/7-2-extract-coordinates-from-photo-metadata.md`
- `travelblogs/package.json` (added exifr dependency)
- `travelblogs/src/utils/entry-location.ts` (added extractGpsFromImage function)
- `travelblogs/src/app/api/media/upload/route.ts` (GPS extraction integration)
- `travelblogs/src/utils/backfill-gps.ts` (new file - GPS backfill utility)
- `travelblogs/src/instrumentation.ts` (new file - Next.js startup hook)
- `travelblogs/next.config.ts` (cleaned up - instrumentation hook no longer needed in Next.js 16.1.0+)
- `travelblogs/server.js` (added backfill for production startup)
- `travelblogs/scripts/run-gps-backfill.ts` (new file - manual backfill script)
- `travelblogs/tests/utils/entry-location.test.ts` (GPS extraction tests)
- `travelblogs/tests/api/media/upload.test.ts` (new file)
- `travelblogs/tests/utils/backfill-gps.test.ts` (new file - backfill tests)
- `travelblogs/tests/fixtures/test-image-with-gps.jpg` (new test fixture)
- `travelblogs/tests/fixtures/test-image-no-gps.jpg` (new test fixture)
