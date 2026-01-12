# Story 7.9: Chronological Map Path

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want to see entry locations connected by lines in chronological order,
So that I can visualize the travel journey as a path on the map.

## Acceptance Criteria

### AC1: Path Line Rendering

**Given** a trip has multiple entries with location data
**When** I view the trip map
**Then** I see a line connecting the entry markers in chronological order (based on `createdAt` timestamp)
**And** the line connects markers sequentially from oldest to newest entry
**And** the path line appears below the markers (lower z-index)

### AC2: Path Styling

**Given** the path line is rendered on the map
**When** I view the map
**Then** the line uses a consistent visual style:
- Color: Teal (`#1F6F78` - matching app secondary color)
- Width: 2-3 pixels
- Style: Solid line
- Opacity: 0.7 to maintain readability with markers on top

### AC3: Single Entry or No Path

**Given** a trip has only one entry with location data
**When** I view the trip map
**Then** no path line is drawn (only the single marker is shown)

**Given** a trip has no entries with location data
**When** I view the trip map
**Then** the empty state message is shown with no path line

### AC4: Path Updates with Entry Changes

**Given** I am viewing the trip overview map
**When** a new entry with location is added to the trip
**Then** the map path updates to include the new location in chronological sequence
**And** the map bounds adjust to show all markers including the new one

**Given** I delete an entry that has a location
**When** I return to the trip map
**Then** the path line is updated to exclude the deleted entry's location

### AC5: Multiple Entries Same Day

**Given** a trip has multiple entries created on the same day with different locations
**When** I view the trip map
**Then** entries are connected in order of their `createdAt` timestamp (chronological within the day)
**And** the path accurately reflects the sequence they were created

### AC6: Shared Map Path Visibility

**Given** I am an unauthenticated user viewing a shared trip
**When** I view the map (embedded or fullscreen)
**Then** the chronological path line is visible
**And** the path renders identically to the authenticated view

### AC7: Fullscreen Map Path

**Given** I open the fullscreen map view
**When** the map renders
**Then** the chronological path line is displayed
**And** the path styling matches the embedded map view

### AC8: Marker Interaction Preserved

**Given** the path line is displayed on the map
**When** I click on a marker
**Then** the marker popup opens normally (path line doesn't interfere)
**And** I can interact with all markers regardless of the path line

### AC9: Map Bounds with Path

**Given** a trip map displays a path connecting multiple locations
**When** the map initializes
**Then** the map bounds include all markers and the full path
**And** appropriate padding ensures no markers or path segments are cut off at edges

## Tasks / Subtasks

- [ ] Update TripMapLocation type to include createdAt timestamp (AC: 1, 5)
  - [ ] Add optional `createdAt?: string` field to TripMapLocation type in trip-map.tsx
  - [ ] Add optional `createdAt?: string` field to FullscreenTripMapEntry type in fullscreen-trip-map.tsx
- [ ] Add path rendering logic to TripMap component (AC: 1, 2, 3, 8, 9)
  - [ ] Sort locations by createdAt timestamp before rendering path
  - [ ] Create polyline with sorted coordinates when locations.length >= 2
  - [ ] Apply path styling: color #1F6F78, weight 2.5, opacity 0.7
  - [ ] Store polyline reference for cleanup on unmount
  - [ ] Ensure path is added to map before markers (lower z-index)
- [ ] Add path rendering logic to FullscreenTripMap component (AC: 7, 8, 9)
  - [ ] Sort mapLocations by createdAt timestamp
  - [ ] Create polyline identical to TripMap implementation
  - [ ] Store polyline reference for cleanup
- [ ] Update parent components to pass createdAt with location data (AC: 4, 6)
  - [ ] Update trip overview page to include createdAt in location data
  - [ ] Update shared trip overview page to include createdAt in location data
  - [ ] Update fullscreen map pages to include createdAt in entry data
- [ ] Test path rendering across all map views (AC: 1-9)
  - [ ] Verify path connects markers chronologically in trip overview map
  - [ ] Verify path renders in fullscreen map view
  - [ ] Verify path renders in shared trip maps
  - [ ] Test single entry (no path), multiple entries (path drawn)
  - [ ] Test chronological ordering with same-day entries
  - [ ] Test marker interactions still work with path present

## Dev Notes

### Developer Context

**Map Components:**
- TripMap component (`travelblogs/src/components/trips/trip-map.tsx`) is used in trip overview, entry reader, and edit trip pages. [Source: travelblogs/src/components/trips/trip-map.tsx]
- FullscreenTripMap component (`travelblogs/src/components/trips/fullscreen-trip-map.tsx`) is used for fullscreen map views. [Source: travelblogs/src/components/trips/fullscreen-trip-map.tsx]
- Both components use Leaflet library with dynamic imports to avoid SSR issues. [Source: Story 7.7]

**Current Map Implementation:**
- Maps already display markers for each entry location with popups
- Maps use `L.marker()` and `L.tileLayer()` from Leaflet
- Markers are stored in `markersRef` for management and cleanup
- Map bounds are calculated using `L.latLngBounds()` and `fitBounds()`
- Components handle marker click events and popup interactions

**Data Flow:**
- Trip overview pages fetch entry data with location information
- Entry data includes `createdAt` timestamp already (ISO 8601 string)
- Location data includes `latitude` and `longitude` coordinates
- Parent components filter entries with locations before passing to map components

**Recent Pattern from Story 7.7:**
- Fullscreen map was recently added with popup enhancements
- Both signed-in and shared routes reuse existing trip overview APIs
- Map components follow consistent patterns for initialization, markers, and cleanup
- Polyline reference cleanup pattern should mirror marker cleanup pattern

### Technical Requirements

**Leaflet Polyline API:**
- Use `L.polyline(coordinates, options)` to draw path lines
- Coordinates format: `[[lat1, lng1], [lat2, lng2], ...]`
- Options: `{ color, weight, opacity, smoothFactor, lineJoin, lineCap }`
- Polyline must be added to map with `.addTo(map)`
- Z-index: Add polyline BEFORE markers so it renders underneath

**Path Styling Constants:**
```typescript
const PATH_STYLE = {
  color: '#1F6F78',      // Teal (app secondary color from UX spec)
  weight: 2.5,            // Line thickness in pixels
  opacity: 0.7,           // Semi-transparent to not obscure map
  smoothFactor: 1.0,      // Leaflet smoothing
  lineJoin: 'round',      // Smooth corners
  lineCap: 'round'        // Smooth endpoints
};
```

**Chronological Sorting:**
```typescript
// Sort locations by createdAt timestamp (oldest to newest)
const sortedLocations = [...locations].sort((a, b) => {
  if (!a.createdAt || !b.createdAt) return 0;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
});

// Extract coordinate pairs
const pathCoordinates = sortedLocations.map(loc =>
  [loc.location.latitude, loc.location.longitude]
);

// Only draw path if 2+ locations
if (pathCoordinates.length >= 2) {
  const polyline = L.polyline(pathCoordinates, PATH_STYLE).addTo(map);
  // Store reference for cleanup
}
```

**Component Lifecycle Management:**
- Store polyline reference in a ref (e.g., `polylineRef`)
- Remove polyline in cleanup function when component unmounts or locations change
- Pattern: `polylineRef.current?.remove()` before creating new polyline

### Architecture Compliance

**Component Structure:**
- Components live under `src/components/trips/`
- Files are `kebab-case.tsx`
- Use TypeScript with strict type checking
- Follow existing component patterns in TripMap and FullscreenTripMap

**Code Style:**
- Use `camelCase` for variables and functions
- Maintain existing ref patterns (`mapRef`, `markersRef`, add `polylineRef`)
- Use dynamic imports for Leaflet to avoid SSR issues
- Follow existing cleanup patterns in useEffect

**Data Format:**
- `createdAt` is ISO 8601 string (e.g., "2026-01-11T12:34:56Z")
- Convert to Date object for comparison: `new Date(createdAt).getTime()`
- Handle missing `createdAt` gracefully (fallback to insertion order)

### Library / Framework Requirements

**Leaflet Library:**
- Already installed and configured
- Version: Latest stable (installed in project)
- Use dynamic import pattern: `import("leaflet").then((L) => { ... })`
- Polyline API: `L.polyline(latlngs, options)`
- Documentation: https://leafletjs.com/reference.html#polyline

**TypeScript Types:**
- Import Leaflet types: `import type { Polyline } from "leaflet"`
- Add `polylineRef` as `useRef<L.Polyline | null>(null)`
- Ensure `createdAt` is optional in type definitions (backward compatibility)

### File Structure Requirements

**Files to Modify:**
1. `/travelblogs/src/components/trips/trip-map.tsx`
   - Update `TripMapLocation` type to include `createdAt?: string`
   - Add polyline rendering logic after map initialization
   - Add polyline cleanup in unmount effect

2. `/travelblogs/src/components/trips/fullscreen-trip-map.tsx`
   - Update `FullscreenTripMapEntry` type to include `createdAt?: string`
   - Add polyline rendering logic in marker update effect
   - Add polyline cleanup

3. `/travelblogs/src/app/trips/[tripId]/overview/page.tsx`
   - Include `createdAt` when passing location data to TripMap

4. `/travelblogs/src/app/trips/share/[token]/page.tsx`
   - Include `createdAt` when passing location data to TripMap

5. `/travelblogs/src/app/trips/[tripId]/map/page.tsx`
   - Ensure `createdAt` is included in entry data for FullscreenTripMap

6. `/travelblogs/src/app/trips/share/[token]/map/page.tsx`
   - Ensure `createdAt` is included in entry data for FullscreenTripMap

**No New Files Needed:**
- All changes are modifications to existing components and pages
- No new utilities or helpers required

### Testing Requirements

**Component Testing:**
- Test TripMap renders path when locations.length >= 2
- Test TripMap does NOT render path when locations.length < 2
- Test FullscreenTripMap renders path consistently with TripMap
- Test chronological ordering: verify path follows createdAt sequence
- Test marker interactions remain functional with path present

**Manual Testing Scenarios:**
1. Trip with 3+ entries: Path connects all markers chronologically
2. Trip with 1 entry: No path drawn, only single marker
3. Trip with 0 entries: Empty state message, no path
4. Same-day entries: Path follows time order within the day
5. Shared map: Path renders for unauthenticated users
6. Fullscreen map: Path styling matches embedded map
7. Marker clicks: Popups open correctly despite path overlay
8. Map bounds: All markers and path visible on initial load

**Test File Location:**
- `/travelblogs/tests/components/trip-map.test.tsx`
- `/travelblogs/tests/components/fullscreen-trip-map.test.tsx`

### Previous Story Intelligence

**From Story 7.7 (Fullscreen Trip Map):**
- Fullscreen map recently implemented with rich popups (image + link)
- Both signed-in and shared routes created for fullscreen map
- Overlay button pattern established for "View full map" interactions
- Learned: Keep map initialization and cleanup patterns consistent
- Learned: Reuse existing trip overview APIs for data fetching
- Issues encountered: TypeScript type mismatches between filtered entries and map props
- Solution: Used inline filters to match expected types

**Key Learnings:**
- Maintain consistent Leaflet patterns across TripMap and FullscreenTripMap
- Store all Leaflet object references (markers, polylines) for proper cleanup
- Test both signed-in and shared routes for feature parity
- Ensure map bounds calculations include all visual elements

**Code Patterns Established:**
- Dynamic Leaflet imports: `import("leaflet").then((L) => { ... })`
- Ref pattern: `mapRef`, `markersRef` (add `polylineRef` following same pattern)
- Cleanup pattern: Check ref existence, call `.remove()`, set to null
- Marker management: Store in Map, iterate for updates, clear on unmount

### Git Intelligence Summary

**Recent Map-Related Commits (Last 2 Days):**
1. Story 7.7 Bugfix 6 (4d3c0e2) - Middleware fix
2. Story 7.7 Bugfix 5-1 (d04e214-995c7a0) - Multiple bugfixes for fullscreen map
3. Story 7.7 Fullscreen map (4067cac) - Main fullscreen map implementation
4. Story 7.6 Entry Location section (ed41bd6) - Entry location display
5. Story 7.5 Map view in hero image (dbf2ac8) - Hero image map integration
6. Story 7.4 Story location selector (63a00bd) - Location picker
7. Story 7.3 Map on edit trip page (d657e7b) - Edit page map
8. Story 7.2 Extract coordinates (3c155bb) - Photo GPS extraction
9. Story 7.1 Trip Map View (1bcf67d) - Initial map implementation

**Pattern Observed:**
- Epic 7 stories consistently involve map enhancements
- Each story builds incrementally on previous map functionality
- Bugfix commits indicate thorough testing and iteration
- Map components are being extended rather than rewritten

**Recent File Modifications:**
- Heavy activity in `src/components/trips/` (TripMap, FullscreenTripMap)
- Multiple bugfixes suggest careful testing of map interactions
- Middleware changes (latest) may be related to route protection

### Scope Boundaries

**In Scope:**
- Adding chronological path line to all existing map views
- Path styling with teal color matching app design system
- Sorting locations by createdAt timestamp
- Updating type definitions to include createdAt
- Ensuring path renders below markers (z-index)

**Out of Scope:**
- Path toggle UI control (future enhancement)
- Directional arrows on path (future enhancement)
- Animated path drawing (future enhancement)
- Date labels along path segments (future enhancement)
- Different colors for different trip phases (future enhancement)
- Interactive path segments (future enhancement)
- Changing map provider or adding new map libraries
- Modifying Prisma schema or database structure
- Adding new API endpoints (use existing trip overview data)

**Do Not Change:**
- Existing marker rendering and popup interactions
- Map initialization and bounds calculation logic
- API response formats or data structures
- Database schema (createdAt already exists on entries)
- Leaflet configuration or tile providers

### Latest Tech Information

**Leaflet Polyline:**
- Current stable version: 1.9.x
- Polyline is a core Leaflet feature (no additional plugins needed)
- API is stable and well-documented
- Performance: Polylines are lightweight, no performance concerns for trip-scale data

**TypeScript Support:**
- Leaflet has official TypeScript definitions via @types/leaflet
- Polyline type: `L.Polyline` or import `{ Polyline } from 'leaflet'`
- No breaking changes expected in polyline API

**Best Practices:**
- Set appropriate `smoothFactor` (1.0 recommended for balance)
- Use `lineJoin: 'round'` and `lineCap: 'round'` for smooth appearance
- Add polyline before markers to ensure correct z-index ordering
- Store polyline reference for cleanup to prevent memory leaks

### References

- Epic source: `_bmad-output/epics.md` (Epic 7)
- UX guidance: `_bmad-output/ux-design-specification.md`
- Color system: Teal `#1F6F78` from UX spec (secondary color)
- Architecture rules: `_bmad-output/architecture.md`
- Project rules: `_bmad-output/project-context.md`
- TripMap component: `travelblogs/src/components/trips/trip-map.tsx`
- FullscreenTripMap component: `travelblogs/src/components/trips/fullscreen-trip-map.tsx`
- Trip overview page: `travelblogs/src/app/trips/[tripId]/overview/page.tsx`
- Shared trip overview: `travelblogs/src/app/trips/share/[token]/page.tsx`
- Signed-in fullscreen map: `travelblogs/src/app/trips/[tripId]/map/page.tsx`
- Shared fullscreen map: `travelblogs/src/app/trips/share/[token]/map/page.tsx`
- Previous story: `_bmad-output/implementation-artifacts/7-7-fullscreen-trip-map.md`
- Leaflet documentation: https://leafletjs.com/reference.html#polyline

## Project Context Reference

- App Router only; API routes live under `src/app/api`
- Responses must be wrapped `{ data, error }` with `{ error: { code, message } }`
- Components are `PascalCase`, files are `kebab-case.tsx`
- Tests live in central `tests/` (no co-located tests)
- Use `camelCase` for variables/functions; avoid `snake_case`
- Use dynamic imports for Leaflet to avoid SSR issues
- All user-facing UI strings must be available in English and German (no new strings needed for this story)
- Redux for state management; server components + fetch for data
- Prisma 7.2.0 with SQLite for database (no schema changes needed)

## Story Completion Status

- Status: ready-for-dev
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created. Story includes complete implementation guidance for adding chronological path lines to all map views using Leaflet polyline API with proper sorting, styling, and cleanup patterns.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (create-story workflow)

### Debug Log References

N/A - Story not yet implemented

### Completion Notes List

- Ultimate context engine analysis completed
- Analyzed Epic 7 context and all previous map stories (7.1-7.8)
- Reviewed TripMap and FullscreenTripMap component implementations
- Extracted Leaflet patterns and component lifecycle management
- Identified teal color (#1F6F78) from UX design specification
- Documented polyline API usage with specific code examples
- Listed all files to modify with specific changes needed
- Provided chronological sorting logic for createdAt timestamps
- Established testing requirements and manual test scenarios
- Story marked ready-for-dev with comprehensive implementation guide

### File List

- _bmad-output/implementation-artifacts/story-7-9-chronological-map-path.md (this file)
