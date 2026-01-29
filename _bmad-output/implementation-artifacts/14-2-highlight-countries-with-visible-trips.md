# Story 14.2: highlight-countries-with-visible-trips

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want countries with visible trips to appear lighter,
so that I can quickly see where trips are available to me.

## Acceptance Criteria

1. **Highlight countries with visible trips**
   - Given I can view one or more trips with stories in a country
   - When the map renders
   - Then that country appears in a lighter state

2. **Multi-country trips highlight multiple countries**
   - Given a trip contains stories from multiple countries
   - When the map renders
   - Then each relevant country is highlighted

## Tasks / Subtasks

- [x] Add a world-map data endpoint that returns visible trip countries (AC: 1, 2)
  - [x] Enforce access control (same visibility rules as `/api/trips`)
  - [x] Aggregate country codes from entries with `countryCode` (ignore null/invalid)
  - [x] Return `{ data, error }` with `countries` and `tripsByCountry` payloads
- [x] Fetch visible countries on the Trips page and pass into the map (AC: 1, 2)
  - [x] Load `/api/trips/world-map` (or similar) after initial render
  - [x] Keep base map visible even if the fetch fails
- [x] Update WorldMap to render highlighted countries (AC: 1, 2)
  - [x] Use ISO3166-1 Alpha-2 property from `world-countries.geojson`
  - [x] Apply lighter fill style for highlighted countries
- [x] Add/adjust tests for highlighting behavior (AC: 1, 2)

## Dev Notes

### Story Foundation

- Epic 14 is the Trips page world map phase; Story 14.2 builds on the map added in Story 14.1 to visually highlight countries that contain visible trips. [Source: _bmad-output/planning-artifacts/epics.md#Epic-14]
- The map currently renders a static GeoJSON world and is wired into `TripsPageContent` above the trips list. Highlighting must not break empty/error states. [Source: _bmad-output/implementation-artifacts/14-1-render-trips-page-world-map.md]

### Developer Context (Guardrails)

- **Do not alter the finalized map settings** (zoom 1.55, latitude 33, height 40rem, white ocean background). These were user-tested and documented as fixed. [Source: _bmad-output/implementation-artifacts/14-1-render-trips-page-world-map.md]
- **Access control matters:** highlighted countries must only reflect trips visible to the current user (same rules as `/api/trips`). This prevents leaking hidden trip info before Story 14.5. [Source: _bmad-output/planning-artifacts/prd.md#FR38]
- **Country codes are stored on entries** (`Entry.countryCode`) and are ISO 3166-1 alpha-2 strings; use normalized uppercase codes and ignore invalid values. [Source: travelblogs/prisma/schema.prisma#L31]
- **All API responses must be `{ data, error }`** with error `{ error: { code, message } }`. [Source: _bmad-output/project-context.md#Critical-Implementation-Rules]
- **All user-facing strings must be localized** (English + German). Use existing translations when possible. [Source: _bmad-output/project-context.md#Code-Quality--Style-Rules]

### Technical Requirements

- Create a new API route (recommended): `travelblogs/src/app/api/trips/world-map/route.ts` that returns visible trip country data.
  - Reuse the same role/active-account checks as `travelblogs/src/app/api/trips/route.ts` (creator/admin/viewer access).
  - Determine visible trips exactly as `/api/trips` does; avoid including trips the user cannot see.
  - Aggregate countries from `Entry.countryCode` for those trips (ignore null or invalid codes).
  - **Payload shape:**
    ```json
    {
      "data": {
        "countries": ["US", "DE"],
        "tripsByCountry": {
          "US": [{"id": "tripId", "title": "Trip title"}]
        }
      },
      "error": null
    }
    ```
    This preps Story 14.3 without rework.
  - Normalize country codes to uppercase and validate with `/^[A-Z]{2}$/`.
- In `travelblogs/src/components/trips/trips-page-content.tsx`, fetch the endpoint on mount and pass `highlightedCountries` into `WorldMap`.
  - Keep the map visible regardless of fetch outcome (base state is acceptable).
  - Avoid blocking the Trips page render; fetch after initial render.
- In `travelblogs/src/components/trips/world-map.tsx`, add `highlightedCountries?: string[]` and update the GeoJSON styling.
  - Read the country code from `feature.properties["ISO3166-1-Alpha-2"]` (present in `world-countries.geojson`).
  - Base style: keep the existing dark fill (#2D2A26).
  - Highlight style: use a lighter fill such as `#8D847B` (same stroke) so highlighted countries read clearly against the base map.
  - Store the GeoJSON layer in a ref and re-apply `setStyle` when highlights change.

### Architecture Compliance

- App Router only; API routes live under `src/app/api`.
- Keep UI components in `src/components/trips/` with kebab-case file names.
- If you add utilities for aggregation or validation, place them in `src/utils/`.

### Library / Framework Requirements

- Use existing Leaflet 1.9.4 integration and GeoJSON world map data. No new map libraries.
- Avoid changing map zoom/center/container settings defined in 14.1.

### File Structure Requirements

- `travelblogs/src/app/api/trips/world-map/route.ts` (new)
- `travelblogs/src/components/trips/trips-page-content.tsx` (fetch + pass highlight data)
- `travelblogs/src/components/trips/world-map.tsx` (highlight styling)
- `travelblogs/tests/components/world-map.test.tsx` (update tests)

### Testing Requirements

- Unit tests (recommended):
  - Verify `WorldMap` applies highlight style when a feature’s ISO alpha-2 code is in the highlight list.
  - Ensure base styling remains for non-highlighted countries.
- Manual verification:
  - Trips page loads with base map first, then highlights after data fetch.
  - Countries with trips appear lighter; countries without trips remain dark.
  - No regressions in empty or error states.

### Previous Story Intelligence

- Story 14.1 implemented the GeoJSON-based map and finalized settings (zoom 1.55, latitude 33, height 40rem, white ocean). Do not alter these or the world can be clipped. [Source: _bmad-output/implementation-artifacts/14-1-render-trips-page-world-map.md]
- World map data lives at `travelblogs/public/world-countries.geojson` and uses ISO3166-1 Alpha-2/Alpha-3 properties; use Alpha-2 for matching. [Source: travelblogs/public/world-countries.geojson]

### Git Intelligence

- Recent commits show work concentrated in `world-map.tsx` and `trips-page-content.tsx` for map integration. Follow the same patterns for Leaflet dynamic import and component structure. [Source: `git log -5 --oneline`]

### Latest Tech Information

- Leaflet 1.9.4 is the latest stable release; Leaflet 2.0 is still in alpha and introduces breaking changes (ESM-only, no global `L`). Do not upgrade as part of this story unless explicitly requested.

### Project Context Reference

- Follow `_bmad-output/project-context.md`: App Router, API response shape `{ data, error }`, `camelCase` JSON, tests under `tests/`, and localized UI strings (English + German).

### References

- Epic 14, Story 14.2 requirements: `_bmad-output/planning-artifacts/epics.md` (Epic 14)
- Access control requirement for map visibility: `_bmad-output/planning-artifacts/prd.md` (FR38)
- Map implementation and fixed settings: `_bmad-output/implementation-artifacts/14-1-render-trips-page-world-map.md`
- Country code storage: `travelblogs/prisma/schema.prisma` (Entry.countryCode)
- World map data properties: `travelblogs/public/world-countries.geojson`

## Completion Status

- Status set to: `review`
- Completion note: Story 14.2 implementation completed

## Change Log

- 2026-01-29: Implemented world-map highlighting for visible trip countries (API + UI + tests)
- 2026-01-29: Restored lighter highlight fill, map height 40rem, and added inactive-account API test

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Sprint status auto-selected story: `14-2-highlight-countries-with-visible-trips`

### Implementation Plan

- Reuse `/api/trips` access control for creator/admin/viewer visibility.
- Aggregate `Entry.countryCode` for visible trips, normalize to uppercase, validate `/^[A-Z]{2}$/`.
- Return `{ data, error }` with sorted `countries` and per-country unique trip list.

### Completion Notes List

- Story created from epics + PRD + project context + previous story intelligence
- Includes explicit guardrails to avoid map regression
- Preps API payload for Story 14.3 without rework
- Added `/api/trips/world-map` endpoint with access control + country aggregation
- Added API tests for world-map payload and access control
- Added Trips page fetch + WorldMap highlight styling
- Added WorldMap highlight tests
- Adjusted highlight fill to lighter color and restored map height to 40rem
- Added inactive-account coverage for world-map API and updated highlight tests
- Tests: not run (review fixes)

### File List

- `_bmad-output/implementation-artifacts/14-2-highlight-countries-with-visible-trips.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `travelblogs/src/app/api/trips/world-map/route.ts`
- `travelblogs/tests/api/trips/world-map.test.ts`
- `travelblogs/src/components/trips/trips-page-content.tsx`
- `travelblogs/src/components/trips/world-map.tsx`
- `travelblogs/tests/components/world-map.test.tsx`
