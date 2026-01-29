# Story 14.1: render-trips-page-world-map

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want to see a world map above the Trips list,
so that I can scan countries at a glance before choosing a trip.

## Acceptance Criteria

1. **Map renders above trips list**
   - Given I open the Trips page
   - When the page loads
   - Then a world map renders above the trip card list
   - And the existing trip list remains visible and usable

2. **Dark base state for all countries**
   - Given the map renders
   - Then all countries are shown in a dark base state by default

## Tasks / Subtasks

- [x] Add a world map component for the Trips page (AC: 1, 2)
  - [x] Decide rendering strategy (SVG/GeoJSON) that does not introduce unnecessary dependencies
  - [x] Ensure the map is responsive and scales on desktop and mobile
  - [x] Provide accessible labeling for the map region
- [x] Wire the map into Trips page layout above the trip list (AC: 1)
  - [x] Preserve existing empty/error states and list behavior
- [x] Add localized strings for map heading/aria label (if added) (AC: 1)

## Dev Notes

- Existing Trips page layout lives in `travelblogs/src/components/trips/trips-page-content.tsx` and renders the list; the map should be inserted above the list section without breaking empty/error states.
- Project already uses Leaflet for trip maps (`travelblogs/src/components/trips/trip-map.tsx`, `travelblogs/src/components/trips/fullscreen-trip-map.tsx`) with dynamic import and `travelblogs/src/app/leaflet.css` imported in `travelblogs/src/app/layout.tsx`.
- For this story, no trip/country data is required yet; the map can render a static world base layer. Leave hooks/props for highlighted countries and hover popups for Stories 14.2–14.4.
- All user-facing strings must be translatable and provided in English and German.

### Technical Requirements

- Render the map above the trips list on `/trips` while preserving existing error/empty/list states.
- Default world map must show all countries in a dark base state (no highlight logic yet).
- Provide an accessible label for the map region; add localized heading/label strings if introduced.
- Keep payload light; avoid heavy new dependencies unless truly necessary.

### Architecture Compliance

- App Router only; this is a UI-only change in `src/components/trips/` and `src/app/trips/page.tsx`/`trips-page-content.tsx`.
- Follow existing Tailwind styling conventions and layout structure.
- If the map uses browser-only APIs, make the component a client component.

### Library / Framework Requirements

- Stack reference: Next.js 16.1.0, React 19.2.3, Tailwind, Leaflet 1.9.4 (already in project).
- Prefer SVG/GeoJSON rendering without adding new libraries; if a map library is needed, re-use Leaflet patterns already in the codebase.

### Project Structure Notes

- New Trips map component should follow existing conventions:
  - Components live in `travelblogs/src/components/trips/`
  - File names are `kebab-case.tsx`
  - Client component if it uses browser APIs or dynamic imports
- If a GeoJSON/SVG asset is introduced, store it in a predictable location (e.g., `travelblogs/src/data/` or `travelblogs/public/`) and document its source/license.

### File Structure Requirements

- Keep new components in `travelblogs/src/components/trips/`.
- If adding assets, use `travelblogs/public/` (static SVG) or `travelblogs/src/data/` (GeoJSON), and cite license/source.

### Testing Requirements

- Manual verification:
  - Trips page renders with the map above the list.
  - Empty/error states still render correctly.
  - Map scales responsively on desktop and mobile.
  - Map region has an accessible label.
- Automated tests are optional for this UI-only change; if added, follow `tests/` placement rules.

### Project Context Reference

- Follow `_bmad-output/project-context.md` rules: App Router, `{ data, error }` response shape, no `snake_case`, shared utilities in `utils/`, tests under `tests/`, and all UI strings localized (English + German).

### Latest Tech Information

- Leaflet 2.0 is in alpha and ships as ESM with breaking changes (no global `L` by default). The project currently depends on Leaflet 1.9.4, so do not upgrade for this story unless explicitly required. citeturn0search4
- If you use the default OpenStreetMap raster tiles (`tile.openstreetmap.org`), follow the OSMF tile usage policy: clear attribution and avoid heavy or abusive traffic (best-effort service). citeturn0search1turn0search3

### References

- World map requirement and acceptance criteria: `_bmad-output/planning-artifacts/epics.md` (Epic 14, Story 14.1)
- Phase 3 world map scope and access control goals: `_bmad-output/planning-artifacts/prd.md` (FR34–FR39)
- Project conventions and stack rules: `_bmad-output/project-context.md`

## Completion Status

- Status set to: `done`
- Completion note: Story 14.1 implementation complete - world map renders above trips list with dark base state

## IMPORTANT NOTES FOR REVIEWER

**DO NOT modify the following settings without user approval:**

The final map configuration was determined through extensive user testing and iteration to ensure the complete world is visible without any regions being cut off:

- **Zoom level**: 1.55 (with `zoomSnap: 0.1` to allow fractional zoom)
- **Latitude center**: 33
- **Container height**: 40rem (640px)
- **Ocean background**: White (`[&_.leaflet-container]:bg-white`) to match page background

These settings were tested with multiple zoom levels (1.0-3.0), latitude values (-20 to 40), and heights (20-60rem) to find the optimal configuration that:
1. Shows the complete world from Antarctica to Greenland
2. Displays Alaska to Australia without horizontal cutoff
3. Fills the container appropriately without excessive empty space
4. Provides white ocean areas that blend seamlessly with the page background

The implementation uses GeoJSON country shapes (not raster tiles) to achieve transparent ocean rendering.

## Change Log

- 2026-01-29: Story 14.1 implementation completed - Added world map component to Trips page
- 2026-01-29: Switched from OpenStreetMap raster tiles to GeoJSON country shapes for transparent ocean rendering
- 2026-01-29: Added white box wrapper with rounded corners matching other page sections
- 2026-01-29: Extensive testing and iteration on zoom levels, latitude center, and container height
- 2026-01-29: Added interactive debug controls (zoom, latitude, height sliders) for live testing
- 2026-01-29: Implemented `zoomSnap: 0.1` to enable fractional zoom levels (1.0-3.0 with 0.1 increments)
- 2026-01-29: **FINAL SETTINGS** after user testing: zoom 1.55, latitude 33, height 40rem, white ocean background
- 2026-01-29: Removed debug controls after optimal settings confirmed
- 2026-01-29: Added `[&_.leaflet-container]:bg-white` to ensure white ocean/background blending
- 2026-01-29: Vendored world countries GeoJSON to `travelblogs/public/world-countries.geojson` and documented source/license

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (Implementation)

### Debug Log References

- Sprint status auto-selected story: `14-1-render-trips-page-world-map`

### Implementation Plan

- **Rendering Strategy**: GeoJSON country shapes (vector polygons) instead of raster tiles for transparent ocean effect
- **Data Source**: `travelblogs/public/world-countries.geojson` (datasets/geo-countries, derived from Natural Earth; Open Data Commons PDDL 1.0)
- **Leaflet Configuration**: 1.9.4 with fractional zoom support (`zoomSnap: 0.1`, `zoomDelta: 0.1`)
- **Component Pattern**: Client component with dynamic Leaflet import (follows existing trip-map.tsx patterns)
- **Styling**: Dark country fills (#2D2A26, opacity 0.85), white ocean background, white box wrapper with rounded corners
- **Final Dimensions** (user-tested): 40rem height, zoom 1.55, latitude center 33
- **No new dependencies added**

### Completion Notes List

- Story created from epics + PRD + project context
- ✅ Created WorldMap component using Leaflet 1.9.4 with GeoJSON rendering
- ✅ Integrated map into TripsPageContent above trip list
- ✅ Added localized strings (English + German) for map accessibility
- ✅ Wrote comprehensive unit tests covering rendering, accessibility, and styling
- ✅ Implemented GeoJSON-based rendering for transparent ocean effect (no raster tiles)
- ✅ White box wrapper with rounded corners matching page design language
- ✅ Dark country fills (#2D2A26, opacity 0.85) for base state
- ✅ White ocean/background blending (`[&_.leaflet-container]:bg-white`)
- ✅ Enabled fractional zoom levels (zoomSnap: 0.1) for precise world fitting
- ✅ Vendored GeoJSON dataset from datasets/geo-countries (Natural Earth; ODC PDDL 1.0)
- ✅ Adjusted world map tests to mock Leaflet/fetch and assert correct rounding
- ✅ **User-tested final settings**: zoom 1.55, latitude 33, height 40rem
- ✅ Complete world visibility: Antarctica to Greenland, Alaska to Australia
- ✅ Tests updated for world map (not run in review)

### File List

- `travelblogs/src/components/trips/world-map.tsx` (created)
- `travelblogs/src/components/trips/trips-page-content.tsx` (modified)
- `travelblogs/src/utils/i18n.ts` (modified)
- `travelblogs/tests/components/world-map.test.tsx` (created)
- `_bmad-output/implementation-artifacts/14-1-render-trips-page-world-map.md` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
- `_bmad-output/implementation-artifacts/validation-report-20260129T170647Z.md` (created)
- `travelblogs/public/world-countries.geojson` (created)
