# Story 15.3: Export Compatibility Metadata

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an administrator,
I want export metadata to enforce compatibility,
so that I can detect incompatible restores early.

## Acceptance Criteria

1. **Version metadata**
   - Given I export a trip
   - Then the archive contains `meta.json` with schema version, app version, and export timestamp

2. **Restore guard**
   - Given I restore an export
   - When the version is incompatible
   - Then restore is blocked with a clear error

## Tasks / Subtasks

- [x] Define compatibility metadata fields (AC: 1)
  - [x] Add `appVersion` and `exportedAt` (timestamp) to export meta type
  - [x] Ensure `schemaVersion` is defined in a single constant for export + restore
- [x] Emit compatibility metadata in export flow (AC: 1)
  - [x] Update `buildExportMeta` to include `appVersion` from `package.json` (or shared constant)
  - [x] Ensure export API writes updated `meta.json`
- [x] Enforce compatibility on restore (AC: 2)
  - [x] Extend restore schema validation to require `appVersion` and `exportedAt`
  - [x] Add explicit compatibility check (schema + app version compatibility rules)
  - [x] Return `{ data, error }` with clear error code/message on incompatibility
- [x] Tests (AC: 1-2)
  - [x] Export meta includes `schemaVersion`, `appVersion`, `exportedAt`
  - [x] Restore rejects incompatible schema/app versions with explicit error

## Dev Notes

### Developer Context

- Export metadata is defined in `travelblogs/src/utils/trip-export.ts` as `ExportMeta` and produced by `buildExportMeta()`.
- Restore validation relies on `ExportMeta` and compares `schemaVersion` in `travelblogs/src/utils/trip-restore.ts`.
- `package.json` contains the app version (`version` field). Prefer a shared utility/constant to avoid duplicating version reads. [Source: travelblogs/package.json]
- API responses must be `{ data, error }` with `{ error: { code, message } }`. [Source: _bmad-output/project-context.md]
- All user-facing strings must be provided in English and German. [Source: _bmad-output/project-context.md]

### Technical Requirements

- Define compatibility rules (minimum: schema version must match; app version compatibility should be explicit).
- Update `ExportMeta` schema validation to require `appVersion` and `exportedAt`.
- Provide a clear error code/message when incompatibility is detected (e.g., `UNSUPPORTED_SCHEMA`, `UNSUPPORTED_APP_VERSION`).
- Preserve existing export ZIP structure: `meta.json`, `trip.json`, `entries.json`, `media/`.

### Architecture Compliance

- App Router only; API routes under `travelblogs/src/app/api`. [Source: _bmad-output/project-context.md]
- REST endpoints must be plural. [Source: _bmad-output/project-context.md]
- Use `utils/` for shared helpers; do not introduce `lib/`. [Source: _bmad-output/project-context.md]

### Library / Framework Requirements

- Stay compatible with `zip-stream` export behavior (sequential entry writing, no internal queueing). [Source: travelblogs/src/app/api/trips/[id]/export/route.ts]
- `node-stream-zip` is used for restore streaming reads and validates entry names by default. [Source: travelblogs/src/app/api/trips/restore/route.ts]

### File Structure Requirements

- Export utilities: `travelblogs/src/utils/trip-export.ts`
- Restore validation: `travelblogs/src/utils/trip-restore.ts`
- Export API: `travelblogs/src/app/api/trips/[id]/export/route.ts`
- Restore API: `travelblogs/src/app/api/trips/restore/route.ts`
- Tests: `travelblogs/tests/api/trips/export-trip.test.ts`, `travelblogs/tests/api/trips/restore-trip.test.ts`, `travelblogs/tests/utils/trip-restore.test.ts`

### Testing Requirements

- Export includes updated `meta.json` fields and preserves existing structure.
- Restore rejects incompatible schema/app versions with clear error response.
- Non-admin restore remains rejected (no regression).

### Previous Story Intelligence

- Story 15.2 restore validation already checks `schemaVersion` and ZIP structure. Extend it to include `appVersion` and explicit compatibility handling. [Source: _bmad-output/implementation-artifacts/15-2-trip-restore-admin-ui-api.md]
- Export/restore format is established in Story 15.1; maintain compatibility and do not alter file layout. [Source: _bmad-output/implementation-artifacts/15-1-trip-export-admin-ui-api.md]

### Git Intelligence Summary

- Recent commits focus on backup/export UI and media handling (HEIC/HEIF). Keep metadata changes localized to export/restore utilities and API routes.

### Latest Tech Information

- `zip-stream` latest stable on npm is `7.0.2`; it expects sequential entry writes (no internal queue). [Source: https://www.npmjs.com/package/zip-stream]
- `node-stream-zip` latest stable on npm is `1.15.0` and supports streaming ZIP reads with built-in entry name validation. [Source: https://www.npmjs.com/package/node-stream-zip]
- Next.js Route Handlers can set `export const runtime = 'nodejs'` when Node runtime is needed. [Source: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config]

### Project Context Reference

- `_bmad-output/project-context.md`

### Story Completion Status

- Status set to **review**.
- Completion note: "Compatibility metadata requirements specified with export/restore validation guidance."

### Project Structure Notes

- Maintain existing project conventions: `kebab-case.tsx` files, `PascalCase` components, and `tests/` as the test root. [Source: _bmad-output/project-context.md]

### References

- Epic 15 definitions and ACs: `_bmad-output/planning-artifacts/epics.md`
- Project rules: `_bmad-output/project-context.md`
- Export meta definitions: `travelblogs/src/utils/trip-export.ts`
- Restore validation: `travelblogs/src/utils/trip-restore.ts`
- Export API: `travelblogs/src/app/api/trips/[id]/export/route.ts`
- Restore API: `travelblogs/src/app/api/trips/restore/route.ts`
- App version source: `travelblogs/package.json`

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

Story created via SM create-story workflow (2026-02-07)

### Implementation Plan

- Add shared app version constant for export/restore metadata.
- Extend export metadata + restore validation with app version compatibility checks.
- Update export/restore tests to cover new metadata and incompatibility errors.

### Completion Notes List

- ✅ Added shared app version constant and included app version in export metadata.
- ✅ Enforced app version compatibility checks during restore with explicit error codes.
- ✅ Updated export/restore tests and ran full test suite (`npm test`).
- ✅ Accepted prerelease app version strings during restore compatibility checks.
- ✅ Normalized unsupported app version error message to English-only API string.
- ✅ Added unit test coverage for prerelease app version compatibility.

### Change Log

- 2026-02-07: Accepted prerelease app version strings, normalized error messaging, and added unit test coverage (tests not run for this change).

### File List

- `/Users/tommy/Development/TravelBlogs/_bmad-output/implementation-artifacts/15-3-export-compatibility-metadata.md`
- `/Users/tommy/Development/TravelBlogs/_bmad-output/implementation-artifacts/15-2-trip-restore-admin-ui-api.md`
- `/Users/tommy/Development/TravelBlogs/_bmad-output/implementation-artifacts/sprint-status.yaml`
- `/Users/tommy/Development/TravelBlogs/_bmad-output/implementation-artifacts/validation-report-20260207T175423.md`
- `/Users/tommy/Development/TravelBlogs/_bmad-output/implementation-artifacts/validation-report-20260207T183631Z.md`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/app/admin/trips-restore/page.tsx`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/app/api/trips/restore/route.ts`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/components/admin/trips-export-page-header.tsx`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/components/admin/trips-restore-dashboard.tsx`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/components/admin/trips-restore-page-header.tsx`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/components/trips/world-map.tsx`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/utils/app-version.ts`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/utils/i18n.ts`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/utils/trip-export.ts`
- `/Users/tommy/Development/TravelBlogs/travelblogs/src/utils/trip-restore.ts`
- `/Users/tommy/Development/TravelBlogs/travelblogs/tests/api/trips/export-trip.test.ts`
- `/Users/tommy/Development/TravelBlogs/travelblogs/tests/api/trips/restore-trip.test.ts`
- `/Users/tommy/Development/TravelBlogs/travelblogs/tests/components/admin/trips-restore.test.tsx`
- `/Users/tommy/Development/TravelBlogs/travelblogs/tests/utils/trip-export.test.ts`
- `/Users/tommy/Development/TravelBlogs/travelblogs/tests/utils/trip-restore.test.ts`
