# Story 15.6: Trips List Ordered by Start Date

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want trip lists ordered by start date (newest first),
so that I see the most recent trips at the top.

## Acceptance Criteria

1. **Start date descending**
   - Given I view a trips list in any of these surfaces:
     - `/trips` page (viewer/creator/admin)
     - Admin trips export list
     - Trips map popup list
   - When the list renders
   - Then trips are ordered by `startDate` descending (newest first)
2. **Tie-break by trip name**
   - Given two trips share the same `startDate`
   - When the list is ordered
   - Then those trips are sorted by trip name ascending (A–Z)
3. **Sorting after visibility filters**
   - Given trips are filtered by access or visibility
   - When the list is rendered
   - Then sorting is applied after filtering
   - And drafts/archived trips remain included and are sorted by the same rules

## Tasks / Subtasks

- [x] Update trip list ordering at the data source (AC: 1-2)
  - [x] `/api/trips` GET: order by `startDate` desc, then `title` asc (admin/creator/viewer)
  - [x] Creator merged list: apply the same ordering after merging owned + invited trips
  - [x] Admin export list: update ordering to match `startDate` desc + `title` asc
  - [x] Trips map popup list: ensure it uses the same ordering after filtering
- [x] Ensure deterministic ordering (AC: 2)
  - [x] Use `id` as a final tie-breaker after `title` to keep results stable
- [x] Update tests to assert sorting (AC: 1-3)
  - [x] API list tests for admin/creator/viewer ordering
  - [x] Admin export list ordering (if UI tests assert sequence)
  - [x] World map popup ordering test (if trip order is user-visible)

## Dev Notes

### Developer Context

- **Primary list endpoint:** `travelblogs/src/app/api/trips/route.ts`
  - Currently ordered by `updatedAt` (admin and viewer) or in-memory sort by `updatedAt` (creator).
  - Replace with `startDate` desc, then `title` asc; keep response shape `{ data, error }`.
- **Admin export list:** `travelblogs/src/app/admin/trips-export/page.tsx`
  - Update `orderBy` to match `startDate` desc, then `title` asc.
- **Trips map popup list:** `travelblogs/src/components/trips/world-map.tsx`
  - Ensure any client-side ordering uses the same rules after filtering.
- **Sorting rule:** Use the same `startDate` field shown on trip cards. For in-memory sorts, compare dates descending, then `title` with `localeCompare` using `"en"` locale and `{ sensitivity: "base" }`, then `id`.
- **Project rules:** Keep JSON fields camelCase, keep API response wrapper `{ data, error }` with `{ error: { code, message } }`, tests live under `travelblogs/tests/`.
- **i18n:** No new user-facing strings expected; keep existing translations intact.

### Technical Requirements

- Use Prisma `orderBy` where possible: `startDate: "desc"`, then `title: "asc"`, then `id: "desc"` for stable ordering.
- For merged lists (creator owned + invited), apply the same ordering in-memory.
- Do not change API response shape or field names.
- Prefer a shared sorting helper if multiple lists need the same ordering to prevent drift.

### Architecture Compliance

- App Router only; API routes stay under `travelblogs/src/app/api`.
- Use existing Prisma models and utilities; avoid introducing new helpers unless needed.
 - No additional architecture docs were referenced for this change beyond project context.

### Library/Framework Requirements

- Next.js App Router + TypeScript + Prisma + Zod (per project context).
- Use `localeCompare` for string ordering; avoid adding new dependencies.

### File Structure Requirements

- API route changes in `travelblogs/src/app/api/trips/route.ts`.
- Admin export ordering in `travelblogs/src/app/admin/trips-export/page.tsx`.
- Tests in `travelblogs/tests/api` and `travelblogs/tests/components`.

### Testing Requirements

- Update `travelblogs/tests/api/trips/list-trips.test.ts` to assert ordering for admin/creator/viewer.
- Update `travelblogs/tests/components/admin/trips-export.test.tsx` if ordering is asserted in UI snapshots/expectations.
 - Add regression cases with mixed owned/invited trips and same start dates to verify tie-break behavior.

### Previous Story Intelligence

- Story 15.5 reinforced strict API response shape `{ data, error }` and i18n usage for user-facing errors.
- Tests are centralized under `travelblogs/tests/` and follow explicit expectations.

### Git Intelligence Summary

- Recent commits focus on media upload handling (`travelblogs/src/app/api/media/upload/route.ts`) and layout fixes.
- No recent changes to trips list ordering; this change should be localized to trips listing/query paths.

### Latest Tech Information

- No external research required; use existing stack versions from project context.

### Project Context Reference

- Source of truth: `_bmad-output/project-context.md`.
- Key rules: camelCase JSON fields, `{ data, error }` API wrapper, tests under `travelblogs/tests/`, App Router only.

### Story Completion Status

- Status set to **ready-for-dev**.
- Completion note: "Ultimate context engine analysis completed - comprehensive developer guide created".

### Project Structure Notes

- API routes live under `travelblogs/src/app/api` (App Router only).
- Trip UI components live under `travelblogs/src/components/trips`.
- Admin pages live under `travelblogs/src/app/admin`.

### References

- Source: User requirement for trips list order.
- Project rules: `_bmad-output/project-context.md`
- Existing ordering:
  - `travelblogs/src/app/api/trips/route.ts`
  - `travelblogs/src/app/admin/trips-export/page.tsx`
  - `travelblogs/src/components/trips/world-map.tsx`
- Tests likely to update:
  - `travelblogs/tests/api/trips/list-trips.test.ts`
  - `travelblogs/tests/components/admin/trips-export.test.tsx`

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

N/A

### Implementation Plan

- Add shared trip ordering helper for Prisma + in-memory sorts.
- Apply ordering to trips list, admin export list, and world map API.
- Update API tests for trips list and world map ordering.

### Completion Notes List

- ✅ Implemented shared trip ordering (startDate desc, title asc, id desc) across trips list, admin export, and world map APIs.
- ✅ Updated trips list and world map tests to assert ordering rules (admin/creator/viewer + country popup).
- ✅ Tests: `npm test`.

### File List

- travelblogs/src/utils/trip-ordering.ts
- travelblogs/src/app/api/trips/route.ts
- travelblogs/src/app/admin/trips-export/page.tsx
- travelblogs/src/app/api/trips/world-map/route.ts
- travelblogs/tests/api/trips/list-trips.test.ts
- travelblogs/tests/api/trips/world-map.test.ts
- _bmad-output/implementation-artifacts/epics.md
- _bmad-output/implementation-artifacts/15-6-trip-list-ordered-by-start-date.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/validation-report-20260208T113513Z.md
- _bmad-output/planning-artifacts/epics.md

### Change Log

- 2026-02-08: Updated trip ordering to startDate desc/title asc/id desc across list/map/export; added ordering tests.
