# Story 4.4: Discreet Share UI

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want the share controls to be subtle and secondary in the trip UI,
So that sharing is available without dominating the trip experience.

## Acceptance Criteria

1. **Given** I view a trip I own
   **When** the trip header renders
   **Then** the share control is shown as a small icon/button in the header near the Owner label
2. **Given** I open trip actions
   **When** I review destructive options
   **Then** revoke share link is placed in the Trip Actions area
3. **Given** the share UI is visible
   **When** I look for link actions
   **Then** there is no "Regenerate" action (Revoke + Generate only)
4. **Given** no share link exists
   **When** I use the share control
   **Then** I can generate a new share link and copy it
5. **Given** a share link exists
   **When** I use the share control
   **Then** I can view and copy the existing link without excessive UI emphasis

## Tasks / Subtasks

- [x] Update trip header share control placement (AC: 1)
  - [x] Move share trigger to a small icon/button near Owner label in the trip header
  - [x] Ensure the control is visually subtle and does not dominate the header layout
- [x] Adjust share actions layout (AC: 2, 3)
  - [x] Move revoke action to the Trip Actions area at the bottom of the trip view
  - [x] Remove regenerate action from the UI (API remains for Story 4.2)
- [x] Keep share link generation and copy flow intact (AC: 4, 5)
  - [x] Ensure generate + copy works from the discreet share control
  - [x] Ensure existing link display and copy affordance remain clear but low-emphasis
- [x] Tests (AC: 1-5)
  - [x] Update share panel component tests for new placement and no regenerate action
  - [x] Add/adjust UI tests to confirm revoke placement in Trip Actions area

## Dev Notes

- Relevant architecture patterns and constraints
  - App Router only; API routes live under `src/app/api`.
  - Responses must be wrapped `{ data, error }` with `{ error: { code, message } }`.
  - Component files use `kebab-case.tsx` under `src/components/<feature>/`.
- Source tree components to touch
  - UI: `travelblogs/src/components/trips/trip-detail.tsx` (share control placement, revoke location)
  - UI: `travelblogs/src/components/trips/trip-overview.tsx` (if share trigger exists here)
  - Tests: `travelblogs/tests/components/trip-share-panel.test.tsx`
- Testing standards summary
  - Tests live in `travelblogs/tests` (no colocated tests).
  - Update existing component tests to match new layout and actions.

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
  - UI components remain in `src/components/trips/`.
  - Tests remain in `tests/components/`.
- Detected conflicts or variances (with rationale)
  - None expected; change is UI-only and should not alter API shape.

### References

- Share UI refinement action item from Epic 4 retrospective. [Source: _bmad-output/implementation-artifacts/epic-4-retro-20251229T163439Z.md]
- Story definition for Epic 4.4. [Source: _bmad-output/epics.md]
- Component structure and naming rules. [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

- Tests: `npm test -- --run tests/components/trip-share-panel.test.tsx`
- Tests: `npm test`
- Lint: `npm run lint` (warnings only)
- Lint: `npm run lint` (clean after test eslint disables)
- Tests: `npm test` (rerun after lint cleanup; console warnings from Next Image mocks)

### Implementation Plan

- Move share trigger into the trip header near the owner label.
- Convert the share panel into a discreet, toggleable panel and remove regenerate flow.
- Relocate revoke action into Trip Actions and refresh component tests.

### Completion Notes List

- Moved the share trigger into the trip header with a subtle button and toggleable panel.
- Removed regenerate UI usage; share panel now supports generate + copy only.
- Placed revoke action in Trip Actions and retained revoke modal flow.
- Tests: `npm test -- --run tests/components/trip-share-panel.test.tsx`
- Tests: `npm test`
- Lint: `npm run lint` (warnings only)
- Fixed lint errors in entry form validation, shared trip guard polling, and entry reader cleanup.
- Allowed public access to shared entry routes in middleware and added coverage.
- Clarified regenerate removal as UI-only for Story 4.4.

### File List

- _bmad-output/implementation-artifacts/4-4-discreet-share-ui.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- travelblogs/src/components/entries/create-entry-form.tsx
- travelblogs/src/components/entries/edit-entry-form.tsx
- travelblogs/src/components/entries/entry-reader.tsx
- travelblogs/src/components/entries/full-screen-photo-viewer.tsx
- travelblogs/src/components/trips/trip-detail.tsx
- travelblogs/src/components/trips/shared-trip-guard.tsx
- travelblogs/src/middleware.ts
- travelblogs/tests/api/trips/share-link.test.ts
- travelblogs/tests/api/auth/middleware.test.ts
- travelblogs/tests/components/entries/entry-reader-navigation.test.tsx
- travelblogs/tests/components/entry-detail.test.tsx
- travelblogs/tests/components/entry-reader.test.tsx
- travelblogs/tests/components/full-screen-photo-viewer.test.tsx
- travelblogs/tests/components/media-gallery.test.tsx
- travelblogs/tests/components/trip-detail.test.tsx
- travelblogs/tests/components/trip-overview.test.tsx
- travelblogs/tests/components/trip-share-panel.test.tsx

## Change Log

- 2025-12-29: Updated trip share UI placement, removed regenerate action, and relocated revoke control.
- 2025-12-29: Resolved lint errors in entry form validation, entry reader, and shared trip guard.
- 2025-12-29: Cleaned lint warnings in tests with eslint disables for img mocks.
- 2025-12-29: Allowed shared entry routes through middleware and added coverage; clarified regenerate removal scope.
