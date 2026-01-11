# Story 7.7: Fullscreen Trip Map

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want to open a fullscreen trip map from the entry reader and trip overview,
so that I can explore all trip locations and jump directly to specific entries.

## Acceptance Criteria

1. **Given** I view an entry reader that shows the trip location map
   **When** I hover/focus the map (or tap on mobile)
   **Then** I see a "View full map" button hovering above the map
   **And** selecting the button opens a fullscreen map view for the same trip
2. **Given** I view the trip overview map (signed-in or shared)
   **When** I hover/focus the map (or tap on mobile)
   **Then** I see the same "View full map" button
   **And** selecting the button opens the fullscreen map view for that trip
3. **Given** I open the fullscreen map view
   **When** the map loads
   **Then** I see all entry locations for the trip as markers
   **And** the map fits bounds to all available locations
   **And** if no entry locations exist, I see the existing no-locations message
4. **Given** the fullscreen map markers are displayed
   **When** I select a marker
   **Then** a popup opens showing the entry hero image, entry title, and a link to the entry
   **And** selecting the link navigates to the correct entry (shared or signed-in route)
5. **Given** the fullscreen map view is open
   **When** I use the back control
   **Then** I return to the trip overview or entry reader without losing context
6. **Given** any new UI text is displayed
   **When** I view the UI in English or German
   **Then** all new strings are translated in both languages

## Tasks / Subtasks

- [x] Add a fullscreen map route for signed-in trips and shared trips (AC: 1, 2, 3, 4, 5)
  - [x] Signed-in route under `src/app/trips/[tripId]/map/page.tsx`
  - [x] Shared route under `src/app/trips/share/[token]/map/page.tsx`
  - [x] Reuse existing trip overview API responses for entries + locations
- [x] Create a fullscreen map component that renders Leaflet map with markers and rich popups (AC: 3, 4)
  - [x] Render popup content with hero image, entry title, and entry link
  - [x] Reuse existing hero image selection logic (cover image, first media, fallback)
  - [x] Keep map bounds + empty-state behavior consistent with TripMap
- [x] Add hover/focus/tap "View full map" button overlay to entry reader and trip overview maps (AC: 1, 2)
- [x] Add translations for new UI strings (AC: 6)
- [x] Tests (AC: 1, 2, 3, 4)
  - [x] Component tests for overlay button rendering in entry reader + trip overview
  - [x] Component test for fullscreen map popup content
  - [x] Route-level test for shared map view token routing

## Dev Notes

### Developer Context
- Trip overview map uses `TripMap` and `filterEntriesWithLocation` in `travelblogs/src/components/trips/trip-overview.tsx`. [Source: travelblogs/src/components/trips/trip-overview.tsx]
- Entry reader uses `TripMap` in the Location section for shared entry views. [Source: travelblogs/src/components/entries/entry-reader.tsx]
- Leaflet is already the map library and is loaded dynamically to avoid SSR issues. [Source: travelblogs/src/components/trips/trip-map.tsx]
- Shared trip overview data is fetched from `/api/trips/share/:token` and includes entry `coverImageUrl` plus media list. [Source: travelblogs/src/app/trips/share/[token]/page.tsx]
- Signed-in trip overview data is fetched from `/api/trips/:id/overview` with the same shape. [Source: travelblogs/src/app/trips/[tripId]/overview/page.tsx]

### Technical Requirements
- Use Leaflet + OpenStreetMap tiles (no new map providers). [Source: travelblogs/src/components/trips/trip-map.tsx]
- Use Next.js App Router routes only under `src/app/`.
- Keep API response format `{ data, error }` with `{ error: { code, message } }` when adding or reusing endpoints.
- Use `useTranslation` and `getTranslation` for all new UI strings. [Source: travelblogs/src/utils/i18n.ts]

### Architecture Compliance
- Components live under `src/components/<feature>/` and follow `PascalCase`.
- Files are `kebab-case.tsx`.
- Tests live in `tests/` (no co-located tests).
- Use `utils/` for shared helpers.

### Library / Framework Requirements
- Keep Leaflet dynamic import patterns to avoid SSR issues.
- Continue using `next/image` for hero images where possible; if popup HTML requires `<img>`, ensure URLs are sanitized and use existing fallback image.

### File Structure Requirements
- Map UI components: `travelblogs/src/components/trips/` (new fullscreen map component or extension of `trip-map.tsx`).
- Shared and signed-in routes: `travelblogs/src/app/trips/[tripId]/map/page.tsx`, `travelblogs/src/app/trips/share/[token]/map/page.tsx`.
- i18n strings: `travelblogs/src/utils/i18n.ts`.
- Tests: `travelblogs/tests/components/` and `travelblogs/tests/app/` (if route tests exist there).

### Testing Requirements
- Add component tests for the overlay button in entry reader and trip overview.
- Add tests for the fullscreen map popup content (hero image + link).
- Ensure shared and signed-in routes produce correct entry links.

### Scope Boundaries
- Do not change Prisma schema or API payload shapes unless required for hero image data.
- Do not introduce new map providers or libraries.
- Do not alter existing TripMap interactions outside of adding the fullscreen entry points.

### Latest Tech Information
- Web research not performed due to restricted network access; rely on existing Leaflet usage and pinned stack versions.

### References
- Epic source: `_bmad-output/epics.md` (Epic 7)
- UX guidance: `_bmad-output/ux-design-specification.md`
- Architecture rules: `_bmad-output/architecture.md`
- Project rules: `_bmad-output/project-context.md`
- Trip map component: `travelblogs/src/components/trips/trip-map.tsx`
- Trip overview: `travelblogs/src/components/trips/trip-overview.tsx`
- Entry reader: `travelblogs/src/components/entries/entry-reader.tsx`
- Shared trip overview page: `travelblogs/src/app/trips/share/[token]/page.tsx`
- Signed-in trip overview page: `travelblogs/src/app/trips/[tripId]/overview/page.tsx`

## Project Context Reference

- App Router only; API routes live under `src/app/api`.
- Responses must be wrapped `{ data, error }` with `{ error: { code, message } }`.
- Components are `PascalCase`, files are `kebab-case.tsx`.
- Tests live in central `tests/` (no co-located tests).
- All user-facing UI strings must be available in English and German.

## Story Completion Status

- Status: done
- Completion note: Fullscreen map routes, component, overlays, and tests completed. Code review performed with 3 MEDIUM and 2 LOW issues found and fixed. All 419 tests passing.

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

- Implementation Plan: Add signed-in/shared map pages that reuse existing overview APIs and seed a map layout, backed by route-level tests.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- ✅ Added signed-in and shared map routes using overview data with a baseline map layout.
- ✅ Tests: `travelblogs/tests/components/trip-map-pages.test.tsx`.
- ✅ Full test run: `npm test`.
- ✅ Added `FullscreenTripMap` with image/link popups and wired map routes to use it.
- ✅ Tests: `travelblogs/tests/components/fullscreen-trip-map.test.tsx`.
- ✅ Full test run: `npm test`.
- ✅ Added view full map overlays in entry reader and trip overview, and wired map routes into entry readers.
- ✅ Added `trips.viewFullMap` translations.
- ✅ Tests: `travelblogs/tests/components/entry-reader.test.tsx`, `travelblogs/tests/components/trip-overview.test.tsx`.
- ✅ Full test run: `npm test`.
- ✅ Story status set to review and sprint status updated.
- ✅ Full test run: `npm test`.
- ✅ Fullscreen map popup now uses a larger image with the entry title inside the link block below.
- ✅ Tests: `travelblogs/tests/components/fullscreen-trip-map.test.tsx`.
- ✅ Added full map access on the trip detail page map.
- ✅ Tests: `travelblogs/tests/components/trip-detail.test.tsx`.
- ✅ Code review completed: Fixed 3 MEDIUM issues (keyboard focus, URL validation, dead code) and 2 LOW issues (test coverage, consistent error handling).
- ✅ All 419 tests passing.

### File List

- _bmad-output/implementation-artifacts/7-7-fullscreen-trip-map.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- travelblogs/src/app/entries/[id]/page.tsx
- travelblogs/src/app/trips/[tripId]/map/page.tsx
- travelblogs/src/app/trips/[tripId]/overview/page.tsx
- travelblogs/src/app/trips/share/[token]/map/page.tsx
- travelblogs/src/app/trips/share/[token]/page.tsx
- travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx
- travelblogs/src/app/leaflet.css
- travelblogs/src/components/trips/fullscreen-trip-map.tsx
- travelblogs/src/components/trips/trip-overview.tsx
- travelblogs/src/components/trips/trip-detail.tsx
- travelblogs/src/components/entries/entry-reader.tsx
- travelblogs/src/utils/i18n.ts
- travelblogs/tests/components/entry-reader.test.tsx
- travelblogs/tests/components/trip-detail.test.tsx
- travelblogs/tests/components/trip-overview.test.tsx
- travelblogs/tests/components/trip-map-pages.test.tsx
- travelblogs/tests/components/fullscreen-trip-map.test.tsx
