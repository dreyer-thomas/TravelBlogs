# Story 8.3: Show Tags on Entry Reader Hero

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want see entry tags on the story hero image,
so that I can understand the story context at a glance.

## Acceptance Criteria

1. Given I open an entry reader page (signed-in or shared), when the entry has tags, then the tags appear on the hero image at the top-right corner.

## Tasks / Subtasks

- [x] Expose tags in entry reader data (AC: 1)
  - [x] Ensure entry reader API/loader includes tag list.
- [x] Render hero tag overlay (AC: 1)
  - [x] Position tag chips top-right on hero image, responsive for mobile.
  - [x] Ensure contrast and accessibility against media.
- [x] Tests (AC: 1)
  - [x] Component test for hero tag overlay when tags exist.

## Dev Notes

- App Router only; API routes live under `src/app/api` and are plural.
- API responses must be `{ data, error }` with `{ error: { code, message } }` on failures.
- JSON fields are camelCase; dates are ISO 8601 strings.
- Tests live under `tests/` (no co-located tests).
- Use Next.js Image for media; lazy-load by default.
- All user-facing UI strings must be translatable in English and German.

### Project Structure Notes

- Shared entry reader must include tags (public share link paths).
- Use existing chip styles for visual consistency.

### References

- Epic 8 requirements and ACs: _bmad-output/implementation-artifacts/epics.md
- Project rules and conventions: _bmad-output/project-context.md

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- Added entry tag data to entry reader API/mapping and exposed shared entry tags.
- Rendered tag chips overlay on entry hero with accessible contrast styling.
- Tests: `npm test`
- Code review completed: Fixed 6 issues (4 MEDIUM, 2 LOW)
  - Fixed tag overflow with `overflow-hidden` and vertical layout
  - Improved tag alignment with `flex-col items-end`
  - Enhanced backdrop contrast from `bg-black/45` to `bg-black/60`
  - Added test coverage for shared view tag rendering
  - Added test coverage for empty tags behavior
  - Added API tests for empty tags array responses

### File List

- travelblogs/src/utils/entry-reader.ts
- travelblogs/src/app/api/entries/[id]/route.ts
- travelblogs/src/app/api/trips/share/[token]/entries/[entryId]/route.ts
- travelblogs/src/components/entries/entry-reader.tsx
- travelblogs/tests/utils/entry-reader-mapper.test.ts
- travelblogs/tests/api/entries/get-entry.test.ts
- travelblogs/tests/api/trips/share-trip-entry.test.ts
- travelblogs/tests/components/entry-reader.test.tsx
- travelblogs/tests/components/entries/entry-reader-navigation.test.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml
