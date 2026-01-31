# Story 14.3: show-trip-list-on-country-hover

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want a popup list of trips when I hover a country,
so that I can select a trip directly from the map.

## Acceptance Criteria

1. **Popup lists trips for hovered country**
   - Given I hover a country with at least one visible trip
   - When the hover state is active
   - Then a popup lists the titles of trips that include at least one story in that country

2. **No popup for countries without visible trips**
   - Given I hover a country with no visible trips
   - When the hover state is active
   - Then no trip list is shown

## Tasks / Subtasks

- [x] Load trip lists by country for the world map (AC: 1)
  - [x] Extend the Trips page world-map fetch to store `tripsByCountry`
  - [x] Preserve non-blocking behavior (map renders even if fetch fails)
- [x] Show a hover popup on the world map (AC: 1, 2)
  - [x] Track hovered country + trip list in `WorldMap`
  - [x] Render a popup overlay anchored to the hover position
  - [x] Hide popup on mouseout or when no trips exist
- [x] Keep layout and map settings unchanged (AC: 1, 2)
  - [x] Do not alter zoom/latitude/height or ocean background
- [x] Add/adjust tests for hover popup behavior (AC: 1, 2)
  - [x] WorldMap shows popup for highlighted countries with trips
  - [x] WorldMap does not show popup for non-visible countries

## Dev Notes

### Story Foundation

- Epic 14 focuses on the Trips page world map experience. Story 14.3 adds hover-based trip discovery without changing navigation yet. [Source: _bmad-output/planning-artifacts/epics.md#Epic-14]
- Product requirement: hover shows a popup list of trip titles for the hovered country; no list for countries without visible trips. [Source: _bmad-output/planning-artifacts/prd.md#FR36]
- Access control must be enforced so the map only reflects trips visible to the current viewer. [Source: _bmad-output/planning-artifacts/prd.md#FR38]

### Developer Context (Guardrails)

- **Do not change the finalized map settings** (zoom 1.55, latitude 33, height 40rem, white ocean background). These are user-tested and must remain stable. [Source: _bmad-output/implementation-artifacts/14-1-render-trips-page-world-map.md#IMPORTANT-NOTES-FOR-REVIEWER]
- **Use the world-map API payload for visibility**. Do not build trip lists from the Trips page data; the map must use `/api/trips/world-map` to avoid leaks. [Source: travelblogs/src/app/api/trips/world-map/route.ts]
- **No popup for countries without trips**. Hover should only surface a list when `tripsByCountry[countryCode]` is non-empty.
- **No navigation changes in 14.3**. Clicking a trip to navigate is Story 14.4; keep this story scoped to hover list only. [Source: _bmad-output/planning-artifacts/epics.md#Story-14-4]
- **All UI strings must be localized** (English + German). Add translation keys if you introduce labels (e.g., "Trips in this country"). [Source: _bmad-output/project-context.md#Code-Quality--Style-Rules]
- **API response shape must remain `{ data, error }`**. Never bypass the wrapper. [Source: _bmad-output/project-context.md#Critical-Implementation-Rules]

### Technical Requirements

- Reuse existing world-map endpoint: `/api/trips/world-map`.
  - Payload shape:
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
- Update `travelblogs/src/components/trips/trips-page-content.tsx`:
  - Store both `highlightedCountries` and `tripsByCountry` from the API.
  - Pass `tripsByCountry` into `WorldMap` as a new prop.
  - Keep the map visible even if the fetch fails.
- Update `travelblogs/src/components/trips/world-map.tsx`:
  - Add prop `tripsByCountry?: Record<string, { id: string; title: string }[]>`.
  - Normalize country codes to uppercase when matching.
  - Use Leaflet GeoJSON feature events (`mouseover`, `mouseout`, `mousemove`) to detect hover and derive the country code from `feature.properties["ISO3166-1-Alpha-2"]`.
  - On hover:
    - If there are trips for the hovered country, set React state for `hoveredCountry`, `hoveredTrips`, and `hoverPosition`.
    - If there are no trips, clear hover state.
  - Render a small popup overlay inside the map container positioned near the cursor or country centroid. Keep it lightweight (no new dependencies).
  - Hide the popup on mouseout and when the map is unmounted.
- Keep map interaction disabled (no drag/zoom). Hover must work without enabling map panning.
- Avoid showing a popup on touch devices if hover is not supported; do not add click behavior yet.

### Architecture Compliance

- App Router only; no changes outside `src/app` API structure. [Source: _bmad-output/project-context.md#Framework-Specific-Rules]
- Components remain in `src/components/trips/` with kebab-case file names.
- Shared helpers go under `src/utils/` if needed.
- Tests remain in `tests/` (no co-located tests).

### Library / Framework Requirements

- Continue using Leaflet 1.9.4 integration patterns from existing trip maps (dynamic import, client component). [Source: _bmad-output/implementation-artifacts/14-1-render-trips-page-world-map.md]
- Do not upgrade Leaflet or introduce new map libraries.

### File Structure Requirements

- `travelblogs/src/components/trips/trips-page-content.tsx`
- `travelblogs/src/components/trips/world-map.tsx`
- `travelblogs/tests/components/world-map.test.tsx`
- Optional: `travelblogs/src/utils/` for shared hover or popup helpers

### Testing Requirements

- Unit tests:
  - Verify hover over a highlighted country with trips renders a popup list of titles.
  - Verify hover over a country without trips does not render a popup.
  - Ensure highlights remain unchanged while hovering.
- Manual checks:
  - Trips page shows the map immediately, highlights load after fetch.
  - Popup appears on hover with the correct list of trip titles.
  - Map settings unchanged (zoom 1.55, latitude 33, height 40rem, white ocean).

### Previous Story Intelligence

- Story 14.2 already built `/api/trips/world-map` and intentionally included `tripsByCountry` to support this hover list; reuse it without API changes. [Source: _bmad-output/implementation-artifacts/14-2-highlight-countries-with-visible-trips.md]
- Map settings are fixed and user-tested: zoom 1.55, latitude center 33, height 40rem, white ocean background; do not modify or the map will be clipped. [Source: _bmad-output/implementation-artifacts/14-1-render-trips-page-world-map.md]
- Country codes use ISO 3166-1 Alpha-2 from `world-countries.geojson` and are stored on entries as uppercase strings. [Source: travelblogs/public/world-countries.geojson, travelblogs/prisma/schema.prisma]

### Git Intelligence

- Recent commits touched `travelblogs/src/components/trips/world-map.tsx`, `travelblogs/src/components/trips/trips-page-content.tsx`, and `travelblogs/tests/components/world-map.test.tsx`. Follow existing patterns for Leaflet dynamic imports and tests. [Source: `git log -5 --name-only`]

### Latest Tech Information

- Leaflet 1.9.4 remains the latest stable release; Leaflet 2.0 is still in alpha with breaking changes (ESM-only, no global `L`). Do not upgrade as part of this story. [Source: https://leafletjs.com/reference.html]
- Next.js security advisories may require patch-level upgrades; do not change Next.js versions for this story unless explicitly requested. [Source: https://nextjs.org/docs/messages/security-release]

### Project Context Reference

- Follow `_bmad-output/project-context.md`: App Router only, `{ data, error }` responses, camelCase JSON fields, tests under `tests/`, and all UI strings localized (English + German).

### References

- Epic 14, Story 14.3 requirements: `_bmad-output/planning-artifacts/epics.md`
- World map hover requirement: `_bmad-output/planning-artifacts/prd.md` (FR36)
- Access control requirement: `_bmad-output/planning-artifacts/prd.md` (FR38)
- Map settings and constraints: `_bmad-output/implementation-artifacts/14-1-render-trips-page-world-map.md`
- API payload and visibility rules: `travelblogs/src/app/api/trips/world-map/route.ts`
- Highlight + tripsByCountry groundwork: `_bmad-output/implementation-artifacts/14-2-highlight-countries-with-visible-trips.md`
- Country code property: `travelblogs/public/world-countries.geojson`
- Entry countryCode storage: `travelblogs/prisma/schema.prisma`
- Project rules: `_bmad-output/project-context.md`

## Completion Status

- Status set to: `review`
- Completion note: Implementation complete; ready for review

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Sprint status auto-selected story: `14-3-show-trip-list-on-country-hover`

### Completion Notes List

- Story created from epics + PRD + project context
- Guardrails added to preserve map configuration and access control
- Implementation notes aligned with existing Leaflet patterns
- Web research completed for current Leaflet guidance
- Added tripsByCountry handling in Trips page fetch and passed through to WorldMap
- Added TripsPageContent tests for tripsByCountry payload + fetch failure behavior
- Tests: `npm test -- trips-page-content.test.tsx`, `npm test`
- Lint: `npm run lint` (fails due to pre-existing repo issues; see lint output)
- Implemented hover tracking and popup rendering for country trip lists
- Added hover popup coverage in WorldMap tests
- Tests: `npm test -- world-map.test.tsx`, `npm test`
- Lint: `npm run lint` (still fails due to pre-existing repo issues)
- DoD blocked: lint errors remain in repo, so story cannot move to review yet
- Lint: `npm run lint` (warnings only)
- Full test suite: `npm test` (passes; existing stderr warnings about canvas/video thumbnails)
- Note: left untracked validation report `_bmad-output/implementation-artifacts/validation-report-20260129T205313Z.md` per user request
- Lint warnings remain (existing repo warnings; no lint errors)
- Code review fixes: prevent map re-init on highlight changes, disable hover when hover media query missing, refresh hover popup when trips change, and update WorldMap tests for hover support.
- Review note: unrelated entry/media changes are present in git and require separate scope or explicit approval to revert.
- UI fix: ensure hover popup renders above Leaflet layers; added regression test for popup z-index. Tests: `npm test -- world-map.test.tsx`.
- Follow-up change: popup trigger switched to click in Story 14.4 to improve usability.

### Change Log

- 2026-01-31: Implemented hover popup trip list; wired tripsByCountry; updated tests and lint blockers
- 2026-01-31: Code review fixes for world map hover stability + test updates.
- 2026-01-31: Fix hover popup stacking; add z-index regression test; run world-map tests.

### Implementation Plan

- Extend Trips page world-map fetch to capture tripsByCountry and pass to WorldMap.
- Add component tests to confirm payload wiring and non-blocking behavior.

### File List

- `_bmad-output/implementation-artifacts/14-3-show-trip-list-on-country-hover.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/validation-report-20260129T205313Z.md`
- `travelblogs/src/components/trips/trips-page-content.tsx`
- `travelblogs/src/components/trips/world-map.tsx`
- `travelblogs/src/components/entries/create-entry-form.tsx`
- `travelblogs/src/components/entries/edit-entry-form.tsx`
- `travelblogs/src/components/entries/entry-detail.tsx`
- `travelblogs/src/components/entries/full-screen-photo-viewer.tsx`
- `travelblogs/src/utils/tiptap-image-helpers.ts`
- `travelblogs/tests/api/entries/create-entry.test.ts`
- `travelblogs/tests/api/entries/update-entry.test.ts`
- `travelblogs/tests/api/media/upload.test.ts`
- `travelblogs/tests/components/create-entry-form.test.tsx`
- `travelblogs/tests/components/edit-entry-form.test.tsx`
- `travelblogs/tests/components/trips-page-content.test.tsx`
- `travelblogs/tests/components/world-map.test.tsx`
- `travelblogs/tests/utils/tiptap-entry-image-extension.test.ts`
- `travelblogs/tests/utils/tiptap-image-helpers.test.ts`
