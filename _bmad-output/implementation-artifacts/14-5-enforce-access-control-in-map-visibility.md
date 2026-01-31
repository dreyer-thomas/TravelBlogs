# Story 14.5: enforce-access-control-in-map-visibility

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want the world map to reflect only trips I am allowed to see,
so that hidden trip information is not exposed.

## Acceptance Criteria

1. **Hidden trips do not affect country highlighting**
   - Given I am viewing the Trips page
   - When the world map renders
   - Then only countries with **visible** trips are highlighted
   - And countries for hidden trips remain in the dark base state

2. **Hidden trips do not appear in popups**
   - Given I hover or click a country on the map
   - When the popup list is shown
   - Then it only includes trips I am authorized to view
   - And no hidden trips are listed

3. **Access control enforced in map API**
   - Given I request `/api/trips/world-map`
   - Then the response includes only visible trips for my role
   - And unauthenticated requests receive 401
   - And inactive accounts receive 403

4. **No UX regressions**
   - Given I have no visible trips (or the fetch fails)
   - When the Trips page loads
   - Then the base map still renders
   - And map settings remain unchanged (zoom, latitude, height, white ocean)

## Tasks / Subtasks

- [x] Enforce visibility rules in `/api/trips/world-map` (AC: 1, 2, 3)
  - [x] Reuse the same role/visibility logic as `/api/trips`
  - [x] Require active account for all roles
  - [x] Build `countries` + `tripsByCountry` only from visible trips
  - [x] Validate country codes to ISO alpha-2 and normalize uppercase
- [x] Prevent client-side leakage (AC: 1, 2, 4)
  - [x] Ensure `WorldMap` uses only API payload (no fallback to Trips list)
  - [x] Keep map render non-blocking on fetch failure
  - [x] Preserve finalized map settings (zoom 1.55, latitude 33, height 40rem, white ocean)
- [x] Add access-control tests (AC: 1, 2, 3)
  - [x] Viewer sees only invited trips in map payload
  - [x] Creator sees owned + invited trips
  - [x] Admin sees all trips
  - [x] Inactive account receives 403

## Dev Notes

### Story Foundation

- Epic 14, Story 14.5 requires map visibility to reflect access control (highlight + popup lists only visible trips).
- PRD FR38: access control enforced so map only reflects trips visible to current viewer.

### Developer Context (Guardrails)

- Do **not** change finalized map settings (zoom 1.55, latitude 33, height 40rem, white ocean background).
- Map **must** use `/api/trips/world-map` payload for visibility; do not derive from Trips list to avoid leaks.
- No new map interactions beyond existing hover/click behavior; keep interactions disabled (no drag/zoom).
- All UI strings must be localized (EN + DE) if any new labels are added.

### Technical Requirements

- Enforce access control in `travelblogs/src/app/api/trips/world-map/route.ts` by reusing the same visibility rules as `/api/trips`.
- Require active accounts for all roles (creator, viewer, admin).
- Aggregate countries only from visible trips’ entries with valid ISO alpha-2 `countryCode`.
- Ensure payload remains `{ data: { countries, tripsByCountry }, error: null }` and uses camelCase.
- Client must only use API payload for highlights/popups; no fallback to local trip list.

### Architecture Compliance

- App Router only; API routes live under `src/app/api`.
- Keep response envelope `{ data, error }` with `{ error: { code, message } }`.
- Use `utils/` for shared helpers if needed; no new `lib/`.

### Library / Framework Requirements

- Keep Leaflet 1.9.4 integration patterns (dynamic import, client component).
- Do not upgrade Leaflet or Next.js as part of this story.

### File Structure Requirements

- `travelblogs/src/app/api/trips/world-map/route.ts`
- `travelblogs/src/components/trips/trips-page-content.tsx`
- `travelblogs/src/components/trips/world-map.tsx`
- `travelblogs/tests/api/trips/world-map.test.ts`
- `travelblogs/tests/components/world-map.test.tsx`

### Testing Requirements

- API tests:
  - Viewer sees only invited trips in map payload.
  - Creator sees owned + invited trips.
  - Admin sees all trips.
  - Inactive account receives 403.
- Component tests:
  - Popup list contains only trips from `tripsByCountry`.
  - No highlights/popup for hidden trips.
  - Base map renders when fetch fails.
  - Map settings unchanged.

### Previous Story Intelligence

- Story 14.2 introduced `/api/trips/world-map` with access control and `tripsByCountry`; reuse it.
- Story 14.3/14.4 added hover/click popup behavior; keep logic and only filter via API payload.
- Map settings are fixed and user-tested; changes risk clipping the world.

### Git Intelligence

- Recent work touched `world-map.tsx`, `trips-page-content.tsx`, and `route.ts`; follow existing Leaflet and API patterns.

### Latest Tech Information

- Next.js App Router has recent RSC security advisories (Dec 3 & Dec 11, 2025). Do not introduce new RSC patterns; keep to existing API route usage and avoid exposing server function details.
- Leaflet 2.0 is still alpha with ESM-only changes and no global `L`; stay on Leaflet 1.x integration.

### Project Context Reference

- Follow `_bmad-output/project-context.md` rules: App Router only, `{ data, error }` responses, camelCase JSON, tests under `tests/`, and localized UI strings.

### Project Structure Notes

- `src/app/api` for API routes; `src/components/trips` for map UI.
- Tests live under `tests/` (no co-located tests).
- No known structure conflicts.

### References

- Epic 14, Story 14.5 requirements: `_bmad-output/planning-artifacts/epics.md#Story-14-5`
- PRD access control requirement: `_bmad-output/planning-artifacts/prd.md#FR38`
- Map settings and constraints: `_bmad-output/implementation-artifacts/14-1-render-trips-page-world-map.md`
- World-map API payload + access control: `travelblogs/src/app/api/trips/world-map/route.ts`
- Map UI behavior: `travelblogs/src/components/trips/world-map.tsx`
- Trips page fetch wiring: `travelblogs/src/components/trips/trips-page-content.tsx`
- Project rules: `_bmad-output/project-context.md`

## Completion Status

- Status set to: `done`
- Completion note: Cleared map highlights/popup state on world-map fetch failure to prevent stale access leakage; file list synced with git changes.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

Sprint status auto-selected story: `14-5-enforce-access-control-in-map-visibility`

### Implementation Plan

- Verify world-map API access-control matches `/api/trips` logic and active account checks.
- Add missing admin coverage and map settings assertions in tests.
- Run targeted and full test suites to validate no regressions.

### Completion Notes List

- Added admin visibility coverage for `/api/trips/world-map` payload.
- Added map settings assertions for zoom/latitude and fixed height.
- Updated edit-entry-form validation test to align with disabled submit on empty content.
- Clear map highlights/popup state on world-map fetch failure to avoid stale access leaks.
- Updated File List to reflect current git changes (includes unrelated entry/media edits).
- Tests: `npx vitest run tests/api/trips/world-map.test.ts tests/components/world-map.test.tsx`, `npm test`.

### File List

- `_bmad-output/implementation-artifacts/14-3-show-trip-list-on-country-hover.md`
- `_bmad-output/implementation-artifacts/14-4-navigate-to-trip-from-map-popup.md`
- `_bmad-output/implementation-artifacts/14-5-enforce-access-control-in-map-visibility.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/validation-report-20260129T205313Z.md`
- `_bmad-output/implementation-artifacts/validation-report-20260131T155851Z.md`
- `_bmad-output/implementation-artifacts/validation-report-20260131T165140Z.md`
- `travelblogs/src/components/entries/create-entry-form.tsx`
- `travelblogs/src/components/entries/edit-entry-form.tsx`
- `travelblogs/src/components/entries/entry-detail.tsx`
- `travelblogs/src/components/entries/full-screen-photo-viewer.tsx`
- `travelblogs/src/components/trips/trips-page-content.tsx`
- `travelblogs/src/components/trips/world-map.tsx`
- `travelblogs/src/utils/tiptap-image-helpers.ts`
- `travelblogs/tests/api/entries/create-entry.test.ts`
- `travelblogs/tests/api/entries/update-entry.test.ts`
- `travelblogs/tests/api/media/upload.test.ts`
- `travelblogs/tests/api/trips/world-map.test.ts`
- `travelblogs/tests/components/create-entry-form.test.tsx`
- `travelblogs/tests/components/edit-entry-form.test.tsx`
- `travelblogs/tests/components/trips-page-content.test.tsx`
- `travelblogs/tests/components/world-map.test.tsx`
- `travelblogs/tests/utils/tiptap-entry-image-extension.test.ts`
- `travelblogs/tests/utils/tiptap-image-helpers.test.ts`

## Change Log

- 2026-01-31: Added admin world-map API coverage and map settings tests; aligned edit-entry-form empty-content validation test with submit disabling.
- 2026-01-31: Clear map highlight state on world-map fetch failure and sync file list/sprint status.
