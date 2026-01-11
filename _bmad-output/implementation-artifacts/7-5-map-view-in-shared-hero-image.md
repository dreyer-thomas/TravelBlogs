# Story 7.5: Map View in Shared Hero Image

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want the shared entry hero image to include the date, title, and a small map overlay,
so that the page uses space efficiently while still showing location context.

## Acceptance Criteria

1. **Given** I open a shared entry view
   **When** the hero image renders
   **Then** the entry date and title are shown as an overlay within the hero image (not above it)
   **And** the overlay uses the shared date formatting utility and preserves readability on top of the image
2. **Given** the entry has a known location (`location: { latitude, longitude, label? }`)
   **When** the hero image renders
   **Then** a small map overlay appears in the lower-right of the hero image showing the entry location
3. **Given** the entry has no location
   **When** the shared entry view loads
   **Then** no map overlay is shown and the hero layout remains clean (no empty-state message)
4. **Given** I view the entry inside the non-shared reader
   **When** the page renders
   **Then** the existing hero layout remains unchanged (overlays are only for the shared viewer)

## Tasks / Subtasks

- [x] Update shared entry reader props to enable hero overlays (AC: 1, 2, 3, 4)
  - [x] Add a shared-only flag to `EntryReader` or a shared-only wrapper component
  - [x] Pass location data to the hero overlay in shared views only
- [x] Implement hero overlay UI (AC: 1)
  - [x] Render date + title inside the hero image container with a readable scrim/gradient
  - [x] Ensure overlay typography and spacing remain legible on mobile
- [x] Implement map overlay (AC: 2, 3)
  - [x] Reuse Leaflet + existing map utilities to render a small, non-interactive map
  - [x] Show a single marker for the entry location
  - [x] Hide the overlay when `location` is null
- [x] Tests (AC: 1, 2, 3, 4)
  - [x] Component test: shared entry hero shows date + title overlay
  - [x] Component test: map overlay renders when location exists and is hidden otherwise
  - [x] Component test: non-shared entry reader remains unchanged

## Dev Notes

### Developer Context
- Shared entry view uses `EntryReader` and `mapEntryToReader` in the share route; keep this story scoped to the shared viewer only. [Source: travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx] [Source: travelblogs/src/utils/entry-reader.ts]
- Story 5.15 already ensured the hero uses `coverImageUrl`; keep that behavior intact and layer overlays on top. [Source: _bmad-output/implementation-artifacts/5-15-shared-view-hero-image.md]
- Map infrastructure exists (Leaflet + `TripMap`) from Story 7.1 and should be reused where possible for consistency and styling. [Source: _bmad-output/implementation-artifacts/7-1-trip-map-view.md]

### Technical Requirements
- App Router only; shared entry view lives under `src/app/trips/share/[token]/entries/[entryId]/page.tsx`.
- Use `next/image` for hero media; overlays must not break the image layout or lazy loading.
- Dates in UI must use the shared date formatting utility (Story 6.6).
- All user-facing UI strings must be translatable and provided in English and German.
- JSON fields remain `camelCase`; do not introduce `snake_case`.

### Architecture Compliance
- Follow feature-based components under `src/components/<feature>/`.
- Use `src/utils/` for shared helpers; avoid `lib/`.
- Keep REST response shapes `{ data, error }` with `{ error: { code, message } }`.

### Library / Framework Requirements
- Use the pinned stack versions from architecture and project context.
- Leaflet + react-leaflet are already installed; reuse existing setup and mocks.

### File Structure Requirements
- Shared entry page: `src/app/trips/share/[token]/entries/[entryId]/page.tsx`.
- Entry reader UI: `src/components/entries/entry-reader.tsx` (or a shared-only wrapper in `src/components/entries/`).
- Map component reuse: `src/components/trips/trip-map.tsx` or a small shared map component under `src/components/entries/`.
- Tests: `tests/components/` only.

### Testing Requirements
- Add component tests in `tests/components/` that assert overlay rendering for shared views.
- Mock Leaflet modules for JSDOM as in existing map tests.
- Verify no regression in non-shared entry reader rendering.

### Scope Boundaries
- Do not change entry data models or API payloads.
- Do not alter trip overview or edit trip map layouts; only adjust shared entry view.
- Do not introduce new map providers or change Leaflet configuration.

### Previous Story Intelligence
- Shared entry mapping already prefers `coverImageUrl` and uses `EntryReader`; keep that mapping and extend with a shared-only overlay flag.
- Map panel selection logic and Leaflet CSS import already exist; reuse patterns to avoid duplicating map setup.

### Latest Tech Information
- Web research not performed due to restricted network access; rely on pinned versions and existing patterns.

### Project Structure Notes
- Components: `PascalCase`; files: `kebab-case.tsx`.
- Tests live in `tests/` only.

### References
- Epic source: `_bmad-output/epics.md` (Epic 7)
- Shared hero image: `_bmad-output/implementation-artifacts/5-15-shared-view-hero-image.md`
- Map view foundation: `_bmad-output/implementation-artifacts/7-1-trip-map-view.md`
- Date formatting rules: `_bmad-output/implementation-artifacts/6-6-date-formatting.md`
- UX guidance: `_bmad-output/ux-design-specification.md`
- Architecture rules: `_bmad-output/architecture.md`
- Project rules: `_bmad-output/project-context.md`

## Project Context Reference

- App Router only; API routes live under `src/app/api`.
- Responses must be wrapped `{ data, error }` with `{ error: { code, message } }`.
- Components are `PascalCase`, files are `kebab-case.tsx`.
- Tests live in central `tests/` (no co-located tests).
- All user-facing UI strings must be available in English and German.

## Story Completion Status

- Status: review
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

- 2026-01-11: Implemented shared hero overlays and map overlay, extended entry reader mapping for location, added component tests. `npm test` passing. `npm run lint` passing with warnings.
- 2026-01-11: Moved shared hero title/date overlay to upper-left with stronger scrim and ensured map overlay stays visible.
- 2026-01-11: Suppressed hydration mismatch in shared trip guard for locale-specific validation text.
- 2026-01-11: Increased shared map overlay size and boosted title/date overlay contrast.
- 2026-01-11: Fit shared hero map to trip-wide bounds while keeping single marker.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- Implemented shared hero date/title overlays and location map overlay; wired shared-only flag and location mapping; updated TripMap marker accessibility; added i18n strings and component tests.
- Tests: `npm test`, `npm run lint` (warnings only)
- Layout: Title/date overlay positioned upper-left (AC1), map overlay positioned lower-right (AC2) within hero image
- Prevented locale hydration mismatch in shared trip guard for validation text.
- Increased shared map overlay size and reinforced title/date overlay contrast.
- Shared hero map now fits trip bounds but only displays the entry marker.
- Code review fixes: Extracted image brightness analysis to utils, enhanced test coverage for overlay positioning, optimized trip-wide location fetch

### File List

- _bmad-output/epics.md
- _bmad-output/architecture.md
- _bmad-output/project-context.md
- _bmad-output/ux-design-specification.md
- _bmad-output/implementation-artifacts/5-15-shared-view-hero-image.md
- _bmad-output/implementation-artifacts/7-1-trip-map-view.md
- _bmad-output/implementation-artifacts/6-6-date-formatting.md
- travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx
- travelblogs/server.js
- travelblogs/src/utils/entry-reader.ts
- travelblogs/src/utils/i18n.ts
- travelblogs/src/utils/locale-context.tsx
- travelblogs/src/components/entries/entry-reader.tsx
- travelblogs/src/components/entries/entry-hero-map.tsx
- travelblogs/src/components/entries/entry-detail.tsx
- travelblogs/src/components/trips/trip-map.tsx
- travelblogs/src/utils/image-brightness.ts
- travelblogs/src/components/trips/trip-overview.tsx
- travelblogs/src/components/trips/shared-trip-guard.tsx
- travelblogs/tests/components/entry-reader.test.tsx
- travelblogs/tests/utils/entry-reader-mapper.test.ts
- travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx
- travelblogs/src/components/entries/entry-hero-map.tsx
- travelblogs/tests/components/trip-overview.test.tsx
- travelblogs/tests/components/shared-trip-page.test.tsx
- travelblogs/tests/components/edit-trip-page-map.test.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/7-5-map-view-in-shared-hero-image.md

### Change Log

- 2026-01-10: Story created.
- 2026-01-11: Added shared entry hero overlays with map, wired shared-only props/location mapping, updated TripMap marker accessibility, and updated tests.
- 2026-01-11: Code review fixes - extracted image brightness to utils, enhanced test coverage for positioning, optimized location fetch
