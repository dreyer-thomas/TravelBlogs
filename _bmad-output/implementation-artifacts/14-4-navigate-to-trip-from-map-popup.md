# Story 14.4: navigate-to-trip-from-map-popup

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want to click a trip in the popup,
so that I can navigate directly to that trip detail page.

## Acceptance Criteria

1. **Click trip title navigates to trip detail**
   - Given I see a trip list in the country popup
   - When I click a trip title
   - Then I am navigated to that trip’s detail page

## Tasks / Subtasks

- [x] Make popup trip titles navigable (AC: 1)
  - [x] Render each trip title as a link to `/trips/[id]`
  - [x] Ensure popup allows pointer events and focus
  - [x] Keep navigation scoped to popup items only
- [x] Switch popup trigger to click for stable interaction (AC: 1)
  - [x] Open popup on country click and pin at click position
  - [x] Keep popup visible until clicking outside the map/popup
- [x] Tests (AC: 1)
  - [x] WorldMap renders links for popup trips on click
  - [x] Clicking a trip link targets `/trips/:id`

## Dev Notes

### Story Foundation

- Epic 14 story 14.4: clicking a trip in the popup navigates to its detail page. [Source: _bmad-output/planning-artifacts/epics.md#Story-14-4]
- Product requirement: map popup trips must support direct navigation. [Source: _bmad-output/planning-artifacts/prd.md#FR37]

### Developer Context (Guardrails)

- **Do not alter finalized map settings** (zoom 1.55, latitude 33, height 40rem, white ocean background). [Source: _bmad-output/implementation-artifacts/14-1-render-trips-page-world-map.md#IMPORTANT-NOTES-FOR-REVIEWER]
- **Use existing `/api/trips/world-map` payload** for popup data; do not fetch from other sources to avoid access leaks. [Source: travelblogs/src/app/api/trips/world-map/route.ts]
- **No new map interactions beyond popup click**: dragging/zoom remain disabled; click only opens the popup list. [Source: _bmad-output/implementation-artifacts/14-3-show-trip-list-on-country-hover.md]
- **All UI strings must be localized (EN + DE)** if you add any labels (e.g., popup heading). [Source: _bmad-output/project-context.md#Code-Quality--Style-Rules]

### Technical Requirements

- Update `travelblogs/src/components/trips/world-map.tsx`:
  - Replace plain text list items with `Link` (or `useRouter().push`) to `/trips/[id]`.
  - Remove `pointer-events-none` from the popup so links are clickable; add `pointer-events-auto` where needed.
  - Keep popup position logic and hover tracking intact.
  - Open popup on country click and keep it visible until outside click.
- Keep map layer styles and highlight logic unchanged.

### Architecture Compliance

- App Router only; no Pages Router usage. [Source: _bmad-output/project-context.md#Framework-Specific-Rules]
- Components in `src/components/trips/` with kebab-case filenames.
- Tests live under `tests/` (no co-located tests). [Source: _bmad-output/project-context.md#Testing-Rules]

### Library / Framework Requirements

- Use existing Leaflet 1.x integration patterns (dynamic import, no new map libraries). [Source: _bmad-output/implementation-artifacts/14-1-render-trips-page-world-map.md]
- Do not upgrade Leaflet or Next.js versions for this story.

### File Structure Requirements

- `travelblogs/src/components/trips/world-map.tsx`
- `travelblogs/tests/components/world-map.test.tsx`

### Testing Requirements

- Unit tests:
  - Hover popup renders trip titles as links with correct `href`.
  - Popup remains visible while pointer is inside it, and links are clickable.
- Manual checks:
  - Hovering a highlighted country shows the popup.
  - Clicking a trip navigates to `/trips/:id`.
  - Map settings unchanged (zoom 1.55, latitude 33, height 40rem, white ocean background).

### Previous Story Intelligence

- Story 14.3 added hover popup and trip list state; do not refetch or recompute trips outside `tripsByCountry`. [Source: _bmad-output/implementation-artifacts/14-3-show-trip-list-on-country-hover.md]
- Map settings are fixed and user-tested; changes can clip countries. [Source: _bmad-output/implementation-artifacts/14-1-render-trips-page-world-map.md]

### Git Intelligence

- Recent commits touched `travelblogs/src/components/trips/world-map.tsx`, `travelblogs/src/components/trips/trips-page-content.tsx`, and `travelblogs/tests/components/world-map.test.tsx`. Follow existing Leaflet and test patterns. [Source: `git log -5 --name-only`]

### Latest Tech Information

- Leaflet 2.0 remains alpha and introduces breaking changes; keep current 1.x integration. [Source: https://leafletjs.com/2025/05/18/leaflet-2.0.0-alpha.html]
- Next.js App Router security advisories exist (RSC-related and cache poisoning); do not upgrade in this story, but avoid introducing patterns flagged by these advisories. [Source: https://nextjs.org/blog/security-update-2025-12-11, https://github.com/advisories/GHSA-r2fc-ccr8-96c4]

### Project Context Reference

- Follow `_bmad-output/project-context.md`: App Router only, `{ data, error }` responses, camelCase JSON, tests under `tests/`, and localized UI strings.

### References

- Epic 14, Story 14.4 requirements: `_bmad-output/planning-artifacts/epics.md`
- Map navigation requirement: `_bmad-output/planning-artifacts/prd.md` (FR37)
- Hover popup implementation: `_bmad-output/implementation-artifacts/14-3-show-trip-list-on-country-hover.md`
- Map settings and base constraints: `_bmad-output/implementation-artifacts/14-1-render-trips-page-world-map.md`
- World-map API payload: `travelblogs/src/app/api/trips/world-map/route.ts`
- Project rules: `_bmad-output/project-context.md`

## Completion Status

- Status set to: `done`
- Completion note: Navigation links added to map popup with hover lock; tests updated and passing

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Sprint status auto-selected story: `14-4-navigate-to-trip-from-map-popup`

### Completion Notes List

- Story created from epics + PRD + project context + previous story intelligence
- Guardrails added to preserve map settings and access control
- Navigation scoped to popup list items only; map interactions unchanged
- Added Link targets for popup trips and enabled pointer events on popup container
- Switched popup to click-to-open and close-on-outside-click
- Updated edit entry submit gating to use Tiptap empty-content detection
- Updated WorldMap tests for click popup behavior
- Tests not run for these fixes (not requested)
- Tests: `npm test`

### Change Log

- 2026-01-31: Link popup trip titles to `/trips/:id`, add hover lock, update WorldMap tests.
- 2026-01-31: Switch popup to click trigger + outside close, adjust edit-entry submit gating, update WorldMap tests and story file list.

### Implementation Plan

- Render popup trips as Next.js Links with pointer events enabled.
- Add hover lock to keep popup visible while interacting.

### File List

- `_bmad-output/implementation-artifacts/14-4-navigate-to-trip-from-map-popup.md`
- `_bmad-output/implementation-artifacts/14-3-show-trip-list-on-country-hover.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/validation-report-20260129T205313Z.md`
- `_bmad-output/implementation-artifacts/validation-report-20260131T155851Z.md`
- `travelblogs/src/components/entries/create-entry-form.tsx`
- `travelblogs/src/components/entries/edit-entry-form.tsx`
- `travelblogs/src/components/entries/entry-detail.tsx`
- `travelblogs/src/components/entries/full-screen-photo-viewer.tsx`
- `travelblogs/src/components/trips/trips-page-content.tsx`
- `travelblogs/src/components/trips/world-map.tsx`
- `travelblogs/src/utils/tiptap-image-helpers.ts`
- `travelblogs/tests/api/entries/create-entry.test.ts`
- `travelblogs/tests/api/entries/update-entry.test.ts`
- `travelblogs/tests/api/media/upload.test.ts`
- `travelblogs/tests/components/create-entry-form.test.tsx`
- `travelblogs/tests/components/edit-entry-form.test.tsx`
- `travelblogs/tests/components/world-map.test.tsx`
- `travelblogs/tests/components/trips-page-content.test.tsx`
- `travelblogs/tests/utils/tiptap-entry-image-extension.test.ts`
- `travelblogs/tests/utils/tiptap-image-helpers.test.ts`
