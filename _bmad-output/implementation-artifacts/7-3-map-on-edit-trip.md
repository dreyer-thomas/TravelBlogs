# Story 7.3: Map on Edit Trip Page

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want the trip map panel visible on the edit trip page,
so that I can review location context while updating trip details.

## Acceptance Criteria

1. **Given** I open the edit trip page for a trip with entries that have location data
   **When** the page loads
   **Then** I see the map panel and entry list arranged in the same layout as the shared viewer
   **And** map pins match the trip entry locations
2. **Given** I open the edit trip page for a trip with no entry locations
   **When** the map panel renders
   **Then** I see the same empty-state message used in the shared viewer
   **And** the layout still matches the shared viewer styling
3. **Given** I select a map pin on the edit trip page
   **When** the selection changes
   **Then** the corresponding entry card is highlighted in the list

## Tasks / Subtasks

- [ ] Extend the edit trip page layout with the map + entry list panel (AC: 1, 2, 3)
  - [ ] Reuse the shared viewer layout (TripOverview + TripMap) or extract a shared layout block
  - [ ] Keep the edit form intact and ensure the combined layout stays readable on mobile
- [ ] Load trip overview data with entry locations for the edit page (AC: 1, 2)
  - [ ] Reuse `/api/trips/[id]/overview` response shape or mirror it server-side
  - [ ] Ensure entries include `location` fields in `camelCase`
- [ ] Wire map selection to entry list highlight (AC: 3)
  - [ ] Keep selection behavior consistent with `TripOverview`
- [ ] UI copy parity (AC: 2)
  - [ ] Use the same translated string keys as the shared viewer for map labels and empty state
- [ ] Tests (AC: 1, 2, 3)
  - [ ] Add/extend component tests for edit trip page map layout and empty state
  - [ ] Add regression coverage for selection highlight behavior if the layout is refactored

## Dev Notes

### Developer Context

- The shared viewer uses `TripOverview` with `TripMap` for the map + entry list layout.
- The edit trip page (`src/app/trips/[tripId]/edit/page.tsx`) currently renders only `EditTripHeader` and `EditTripForm`.
- The new requirement is to include the same map layout as the shared viewer on the edit trip page.
- Align map panel behavior with Story 7.1: map pins correspond to entry locations and selection highlights the related entry.

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

- Edit trip page: `src/app/trips/[tripId]/edit/page.tsx`.
- Shared viewer layout source: `src/components/trips/trip-overview.tsx`.
- Map component: `src/components/trips/trip-map.tsx`.
- Entry location helpers: `src/utils/entry-location.ts`.
- Tests must live in `tests/` (no co-located tests).

### Testing Requirements

- Add component tests in `tests/components/` for edit trip page map layout, empty state, and selection highlighting.
- Ensure tests assert localized text and selection behavior matches shared viewer.

### Performance Considerations

- Do not block edit page load on map rendering; preserve lazy map behavior from `TripOverview`.
- Keep entry list rendering efficient for trips with many entries.

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
- Shared viewer layout: `travelblogs/src/components/trips/trip-overview.tsx`
- Edit trip page: `travelblogs/src/app/trips/[tripId]/edit/page.tsx`
- Map component: `travelblogs/src/components/trips/trip-map.tsx`
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

- Ensure edit trip page layout matches shared viewer map + entry list panel.
- Reuse existing map selection behavior to highlight entries.

### File List

- `_bmad-output/implementation-artifacts/7-3-map-on-edit-trip.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/epics.md`
