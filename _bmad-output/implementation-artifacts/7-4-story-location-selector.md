# Story 7.4: Story Location Selector

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want to choose a story location even when photos have no GPS metadata,
so that each entry can appear on the trip map.

## Acceptance Criteria

1. **Given** I am creating or editing a story with no photo location data
   **When** I enter a place name (e.g., "London Tower Bridge")
   **Then** the app searches for matching locations and shows results
   **And** if the search is ambiguous, I am prompted to select the correct result
2. **Given** I select a location result
   **When** the selection is saved
   **Then** the story location is stored with latitude, longitude, and a readable name
   **And** the story appears on the trip map in the overview
3. **Given** a story has photos with GPS data
   **When** I hover over a photo in the story image library
   **Then** I see a control to use that photo's location as the story location
   **And** selecting it sets the story location to that photo's coordinates

## Tasks / Subtasks

- [ ] Add story location inputs to create/edit entry forms (AC: 1, 2, 3)
  - [ ] Add a location search field with results list and selection state
  - [ ] Reuse the story image hover pattern for the new "use photo location" action
  - [ ] Provide a clear way to view or clear the selected story location
- [ ] Implement location search API (AC: 1)
  - [ ] Add a server route (e.g., `src/app/api/locations/search/route.ts`) to call the chosen geocoding provider
  - [ ] Return results in `{ data, error }` with `camelCase` fields
  - [ ] Handle ambiguous results with a selectable list
- [ ] Persist entry location selection (AC: 2, 3)
  - [ ] Update entry create/update payloads to accept `latitude`, `longitude`, and `locationName`
  - [ ] Ensure `locationName` is stored alongside coordinates when chosen from search
- [ ] Wire map overview to updated location data (AC: 2)
  - [ ] Reuse existing `EntryLocation` shape (`latitude`, `longitude`, `label?`)
  - [ ] Map `locationName` to `label` in API responses
- [ ] Tests (AC: 1, 2, 3)
  - [ ] Component tests for search results, selection, and image-location action
  - [ ] API tests for location search responses and entry payload updates

## Dev Notes

### Developer Context

- Entry locations already exist in the schema (`latitude`, `longitude`, `locationName`) and are used by the trip overview map.
- `TripOverview` + `TripMap` expect `location: { latitude, longitude, label? } | null` per `src/utils/entry-location.ts`.
- The story image selection UI in `create-entry-form.tsx` and `edit-entry-form.tsx` uses a hover overlay pattern; mirror this for location selection to keep UX consistent.
- The new manual location search is the fallback when no GPS metadata is present, but it should remain available even when GPS exists.

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

- Map provider remains Leaflet + OpenStreetMap tiles per Story 7.1.
- Choose a geocoding provider that can be called server-side; document any API key requirements and rate limits.

### File Structure Requirements

- Entry forms: `src/components/entries/create-entry-form.tsx`, `src/components/entries/edit-entry-form.tsx`.
- Entry APIs: `src/app/api/entries/route.ts`, `src/app/api/entries/[id]/route.ts`.
- Location search API: `src/app/api/locations/search/route.ts` (or another plural `locations` route).
- Shared types/helpers: `src/utils/entry-location.ts` and any new geocoding helpers in `src/utils/`.
- Tests must live in `tests/` (no co-located tests).

### Testing Requirements

- Add component tests in `tests/components/` for:
  - Location search input, result selection, and ambiguous selection behavior.
  - Image hover action to set story location from GPS metadata.
- Add API tests in `tests/api/` for:
  - Location search route responses.
  - Entry create/update payloads accepting `latitude`, `longitude`, `locationName`.

### Performance Considerations

- Debounce location search requests to avoid excessive geocoding calls.
- Keep map rendering lazy (as in `TripOverview`) to avoid blocking form load.

### Previous Story Intelligence

- Story 7.1 defined the map panel and expects entry location fields in API responses.
- Story 7.2 handles EXIF GPS extraction; reuse that data for the "use photo location" action.
- Story 7.3 uses the map panel on the edit trip page; entry locations must be reliable for that view.

### Git Intelligence Summary

- Recent commits focus on language/date formatting and admin flows; no recent location search patterns exist.

### Latest Tech Information

- Web research not performed due to restricted network access; rely on pinned versions from architecture and project context.

### Project Structure Notes

- Follow existing naming conventions: `PascalCase` components, `kebab-case.tsx` files.
- Keep entry creation/editing flows consistent with existing UX patterns and translation usage.

### References

- Epic story source: `_bmad-output/epics.md` (Epic 7, Story 7.4)
- Entry forms: `travelblogs/src/components/entries/create-entry-form.tsx`, `travelblogs/src/components/entries/edit-entry-form.tsx`
- Map overview: `travelblogs/src/components/trips/trip-overview.tsx`
- Entry location helpers: `travelblogs/src/utils/entry-location.ts`
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

- Add manual location search flow with disambiguation list.
- Add per-image "use photo location" action mirroring story image selection UI.

### File List

- `_bmad-output/implementation-artifacts/7-4-story-location-selector.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/epics.md`
