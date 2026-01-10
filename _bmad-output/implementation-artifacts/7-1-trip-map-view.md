# Story 7.1: Trip Map View

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want to see a map view with entry locations,
so that I can understand where the trip took place.

## Acceptance Criteria

1. **Given** a trip has entries with location data
   **When** I open the map view
   **Then** I see pins for each entry location
   **And** selecting a pin highlights the related entry
2. **Given** a trip has entries without location data
   **When** I open the map view
   **Then** I see a clear message or empty state indicating no locations are available

## Dependencies / Decisions Required

- Map provider and client library must be selected before implementation.
  - Decision: Leaflet (client library) + OpenStreetMap tiles.
- Story 7.2 must provide entry location fields in API responses so the map can render pins.

## Tasks / Subtasks

- [x] Define map view routing and data needs (AC: 1, 2)
  - [x] Decide route or panel placement aligned with existing trip view (map + timeline context)
  - [x] Confirm how to load entry locations for a trip via existing trip/entry API
- [x] Data model and API contract for entry locations (AC: 1, 2)
  - [x] Ensure entry location fields exist and are returned in trip/entry payloads
  - [x] Add or extend API response shape to include coordinates and optional labels
- [x] Map provider decision and integration plan (AC: 1)
  - [x] Use Leaflet with OpenStreetMap tiles; document API key strategy only if a paid tile provider is adopted later
  - [x] Define a minimal map component wrapper for pins and selection
- [x] UI implementation for map view and pin selection (AC: 1)
  - [x] Build map panel with pins and selection state wired to timeline/entry list
  - [x] Highlight the related entry when a pin is selected
- [x] Empty state behavior (AC: 2)
  - [x] Add clear, localized empty state message when no locations exist
- [x] Tests (AC: 1, 2)
  - [x] Add component tests for map view empty state and selection highlighting
  - [x] Add API tests for location fields in responses

## Dev Notes

### Developer Context

- This epic isolates map handling; timeline-only view remains in Epic 6.
- UX calls for a Map + Timeline Sync Panel: desktop side-by-side, mobile stacked.
- Selecting a pin must highlight the related entry in the timeline list.
- Map provider selection is a Phase 3 prerequisite and not yet decided; do not hard-code provider-specific assumptions.
- Reuse the existing timeline/entry list UI for selection state; do not build a duplicate list for map selection.

### Technical Requirements

- App Router only; API routes must live under `src/app/api`.
- REST endpoints must be plural, responses wrapped in `{ data, error }`, errors in `{ error: { code, message } }`.
- Use Next.js Image for media; lazy-load by default (if map view uses entry thumbnails).
- All UI strings must be translatable and available in English and German.
- Use the pinned stack versions: Next.js + TypeScript, Redux Toolkit 2.11.2, Prisma 7.2.0, Auth.js 4.24.13, Zod 4.2.1.

### Architecture Compliance

- Use Redux Toolkit patterns for shared selection state if needed: `status: 'idle' | 'loading' | 'succeeded' | 'failed'`.
- Validation is server-side only (Zod 4.2.1).
- Dates in JSON are ISO 8601 strings; JSON fields are `camelCase`.
- Do not introduce Docker/TLS proxy; hosting is bare Node on NAS.
- Use `.env` and `.env.example` only; no `.env.local`.

### Library / Framework Requirements

- Next.js App Router + TypeScript + Tailwind CSS (as established).
- Prisma 7.2.0 + SQLite for persistence.
- Auth.js (NextAuth) 4.24.13 for authenticated routes (if map view requires auth in non-shared contexts).

### File Structure Requirements

- Feature components under `src/components/<feature>/` (e.g., `src/components/trips/` or `src/components/entries/`).
- Map/timeline UI may belong under `src/components/trips/` or a dedicated `src/components/maps/` feature (choose one and stay consistent).
- Tests must live in `tests/` (no co-located tests).

### Testing Requirements

- Add tests in `tests/components/` for map view empty state and selection highlight.
- Add tests in `tests/api/` for API payloads that include entry location fields.
- Ensure tests assert `{ data, error }` response wrapper and `camelCase` fields.
- Add regression coverage to ensure entry navigation/timeline still works with map selection wiring.

### Performance Considerations

- Do not block the initial trip view render on map loading; load the map panel lazily.
- Keep entry switching targets intact (<1s) by decoupling map rendering from entry content updates.

### Project Structure Notes

- Follow existing feature structure and naming conventions: `PascalCase` components, `kebab-case.tsx` files.
- Use `src/utils/` for shared helpers; do not add `lib/`.

### References

- Epic story source: `_bmad-output/epics.md` (Epic 7, Story 7.1)
- UX: Map + Timeline Sync Panel behavior and layout: `_bmad-output/ux-design-specification.md`
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

### Implementation Plan

- Map + timeline panel will live in the existing trip overview view.
- Entry locations will load from `/api/trips/[id]/overview` and `/api/trips/share/[token]`.
- Entry location shape: `location: { latitude, longitude, label? } | null`.

### Completion Notes List

- Map provider set to Leaflet with OpenStreetMap tiles.
- Map view will be embedded in trip overview; location data sourced from trip overview/share endpoints.
- Added entry-location helper and tests to formalize map data needs.
- Added entry location fields to the Entry model and returned `location` payloads in entry/trip endpoints.
- Standardized map provider choice as Leaflet with OpenStreetMap tiles and added a minimal map wrapper component.
- Integrated the map panel into trip overview with lazy rendering and selection highlighting.
- Added localized map empty state messaging when no entry locations exist.
- Added component and API test coverage for location payloads and map behavior.
- Fixed component test setup with LocaleProvider wrappers and updated sign-in/cover image expectations.
- Tests: `npm test`.
- Moved the map panel into the trip overview section above the entry list.
- Removed the map frame and aligned it next to the cover image on wide screens.
- Moved the empty-state message into the map overlay.

**Code Review Fixes Applied:**
- Installed Leaflet (1.9.4) and react-leaflet (5.0.0) dependencies
- Implemented full Leaflet map rendering with OpenStreetMap tiles in trip-map.tsx
- Map now renders actual interactive markers on map canvas with click handlers
- Fixed lazy-loading to use 100ms setTimeout instead of immediate render
- Moved extractGpsFromImage to separate image-gps.ts module (belongs to Story 7.2)
- Added Leaflet CSS import to layout.tsx
- Updated tests to mock Leaflet module for JSDOM compatibility
- All 387 tests passing

### File List

- `_bmad-output/implementation-artifacts/7-1-trip-map-view.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `travelblogs/package.json` (added leaflet, react-leaflet, @types/leaflet)
- `travelblogs/package-lock.json`
- `travelblogs/src/utils/entry-location.ts`
- `travelblogs/src/utils/image-gps.ts` (new - extracted from entry-location.ts)
- `travelblogs/tests/utils/entry-location.test.ts`
- `travelblogs/src/components/trips/trip-overview.tsx`
- `travelblogs/src/app/trips/[tripId]/overview/page.tsx`
- `travelblogs/src/app/trips/share/[token]/page.tsx`
- `travelblogs/src/app/layout.tsx` (added leaflet.css import)
- `travelblogs/src/app/leaflet.css` (new)
- `travelblogs/prisma/schema.prisma`
- `travelblogs/prisma/migrations/20260110183000_add_entry_location_fields/migration.sql`
- `travelblogs/src/app/api/trips/[id]/overview/route.ts`
- `travelblogs/src/app/api/trips/share/[token]/route.ts`
- `travelblogs/src/app/api/entries/route.ts`
- `travelblogs/src/app/api/entries/[id]/route.ts`
- `travelblogs/src/app/api/trips/share/[token]/entries/[entryId]/route.ts`
- `travelblogs/tests/api/trips/trip-overview.test.ts`
- `travelblogs/tests/api/trips/share-trip-overview.test.ts`
- `travelblogs/tests/api/entries/list-entries.test.ts`
- `travelblogs/tests/api/entries/get-entry.test.ts`
- `travelblogs/tests/api/trips/share-trip-entry.test.ts`
- `travelblogs/src/components/trips/trip-map.tsx`
- `travelblogs/tests/components/trip-map.test.tsx`
- `travelblogs/src/utils/i18n.ts`
- `travelblogs/tests/components/trip-overview.test.tsx`
- `travelblogs/tests/components/media-gallery.test.tsx`
- `travelblogs/tests/components/full-screen-photo-viewer.test.tsx`
- `travelblogs/tests/components/create-entry-form.test.tsx`
- `travelblogs/tests/components/edit-entry-form.test.tsx`
- `travelblogs/tests/components/delete-entry-modal.test.tsx`
- `travelblogs/tests/components/sign-in-page.test.tsx`
- `travelblogs/tests/components/cover-image-form.test.tsx`
