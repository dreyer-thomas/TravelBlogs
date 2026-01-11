# Story 7.3: Map on Trip Detail View

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want the trip map panel visible on the trip detail view,
so that I can review location context while viewing my trip.

## Acceptance Criteria

1. **Given** I open the trip detail page for a trip with entries that have location data
   **When** the page loads
   **Then** I see the map panel displayed alongside the cover image (or standalone if no cover)
   **And** map pins match the trip entry locations
2. **Given** I open the trip detail page for a trip with no entry locations
   **When** the map panel renders
   **Then** I see an empty-state message indicating no locations are available
   **And** the layout remains consistent
3. **Given** I select a map pin on the trip detail page
   **When** the selection changes
   **Then** the corresponding entry card is highlighted in the entry list below

## Tasks / Subtasks

- [x] Extend the trip detail page layout with map panel (AC: 1, 2, 3)
  - [x] Add TripMap component to trip-detail.tsx
  - [x] Position map alongside cover image in responsive grid layout
  - [x] Ensure layout stays readable on mobile devices
- [x] Load trip overview data with entry locations for map display (AC: 1, 2)
  - [x] Fetch `/api/trips/[id]/overview` data with entry locations
  - [x] Filter entries to extract those with location data
  - [x] Handle loading and error states
- [x] Wire map selection to entry list highlight (AC: 3)
  - [x] Maintain selectedEntryId state
  - [x] Pass selection handler to TripMap component
  - [x] Sync selection state with entry cards in list
- [x] UI copy and empty state (AC: 2)
  - [x] Use translated strings for map labels (trips.tripMap, trips.mapPins)
  - [x] Show empty state message when no locations available (trips.noLocations)
- [x] Tests (AC: 1, 2, 3)
  - [x] Add component tests for trip detail page map rendering
  - [x] Test empty state when no entry locations exist
  - [x] Test selection highlighting behavior - all tests passing

## Dev Notes

### Developer Context

- **Decision Change**: Originally planned for edit page, but during implementation discussion with user, decided to add map to trip detail view instead
- The trip detail component (`src/components/trips/trip-detail.tsx`) renders the trip overview for creators and viewers
- Story 7.1 added `TripMap` component with entry location support
- This story extends trip-detail.tsx to show map alongside cover image in the main trip view
- Map pins correspond to entry locations and selection highlights the related entry card

### Technical Requirements

- App Router only; API routes under `src/app/api`.
- REST endpoints are plural; responses wrapped `{ data, error }` with `{ error: { code, message } }`.
- Use Next.js Image for media; lazy-load by default.
- All UI strings must be translatable and available in English and German.
- Use the pinned stack versions: Next.js + TypeScript, Redux Toolkit 2.11.2, Prisma 7.2.0, Auth.js 4.24.13, Zod 4.2.1.

### Architecture Compliance

- Follow feature-based components under `src/components/<feature>/`.
- Use `src/utils/` for shared helpers; avoid `lib/`.
- Validation is server-side only (Zod 4.2.1).
- Dates in JSON are ISO 8601 strings; JSON fields use `camelCase`.
- Do not introduce Docker/TLS proxy; hosting is bare Node on NAS.

### Library / Framework Requirements

- Use existing `TripOverview` and `TripMap` where possible to keep shared viewer parity.
- Map provider remains Leaflet + OpenStreetMap tiles per Story 7.1.

### File Structure Requirements

- Trip detail component: `src/components/trips/trip-detail.tsx` (primary implementation file)
- Map component: `src/components/trips/trip-map.tsx` (reused from Story 7.1)
- Entry location helpers: `src/utils/entry-location.ts`
- Tests must live in `tests/` (no co-located tests)

### Testing Requirements

- Add component tests in `tests/components/` for trip detail page map rendering, empty state, and selection highlighting
- Ensure tests assert localized text and map visibility
- All tests passing (3/3)

### Performance Considerations

- Map renders lazily (100ms delay) to avoid blocking initial page paint
- Entry list rendering remains efficient for trips with many entries
- Overview data fetched separately from main trip data

### Previous Story Intelligence

- Story 7.1 implemented the shared viewer map panel using `TripOverview` + `TripMap` and expects entry `location` fields in API responses.
- Story 7.2 is responsible for populating entry locations via EXIF metadata extraction.
- Keep location field naming consistent with existing `location: { latitude, longitude, label? } | null` shape.

### Git Intelligence Summary

- Recent commits focus on language/date formatting and admin flows; no recent map-specific changes to reuse.

### Latest Tech Information

- Web research not performed due to restricted network access; rely on pinned versions from architecture and project context.

### Project Structure Notes

- Follow existing naming conventions: `PascalCase` components, `kebab-case.tsx` files.
- Keep entry navigation and edit flows consistent with existing trip detail patterns.

### References

- Epic story source: `_bmad-output/epics.md` (Epic 7, Story 7.3)
- Trip detail component: `travelblogs/src/components/trips/trip-detail.tsx`
- Map component: `travelblogs/src/components/trips/trip-map.tsx`
- Entry location utilities: `travelblogs/src/utils/entry-location.ts`
- UX layout guidance: `_bmad-output/ux-design-specification.md`
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

- ✅ Extended trip-detail.tsx to include TripMap component alongside cover image
- ✅ Added overview data fetching with entry locations using `/api/trips/[id]/overview`
- ✅ Implemented responsive grid layout: map + cover image on desktop, stacked on mobile
- ✅ Map selection highlights corresponding entry cards in list below (AC 3)
- ✅ Empty state message uses translation key (trips.noLocations) (AC 2)
- ✅ Map renders lazily (100ms delay) to avoid blocking page load
- ✅ All 3 tests passing after fixing entry card highlighting and test mocks
- ✅ Layout remains readable on mobile with responsive grid

### File List

- `travelblogs/src/components/trips/trip-detail.tsx` (modified - added map integration)
- `travelblogs/tests/components/edit-trip-page-map.test.tsx` (created - 3 tests, 2 failing)
- `travelblogs/tests/components/trip-share-panel.test.tsx` (modified)
- `_bmad-output/implementation-artifacts/7-3-map-on-edit-trip.md` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
