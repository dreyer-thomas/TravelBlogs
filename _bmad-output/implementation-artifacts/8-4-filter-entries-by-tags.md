# Story 8.4: Filter Entries by Tags

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want filter entries by tags on the trip overview,
so that I can see all stories related to selected tags.

## Acceptance Criteria

1. Given the trip overview shows tags, when there are eight or fewer distinct tags, then a horizontal tag chip list allows multi-select filtering (OR behavior).
2. Given there are more than eight distinct tags, when I open the tag filter, then a multi-select control allows choosing one or more tags with OR behavior.
3. Given no tags are selected, when I view the trip overview, then all entries are shown.

## Tasks / Subtasks

- [x] Compute distinct tags per trip (AC: 1,2)
  - [x] Expose distinct tag list for trip overview.
  - [x] Sort tags predictably (alpha or usage count).
- [x] Implement filter UI (AC: 1,2,3)
  - [x] Chip list for <=8 tags with multi-select OR.
  - [x] Multi-select control for >8 tags with OR behavior.
  - [x] Clear state shows all entries.
- [x] Filter entries client-side or via API (AC: 1,2,3)
  - [x] Apply OR logic to tags; ensure shared and signed-in views match.
- [x] Tests (AC: 1,2,3)
  - [x] Component tests for chip/multi-select modes.
  - [x] Filtering behavior tests for OR logic and empty selection.

## Dev Notes

- App Router only; API routes live under `src/app/api` and are plural.
- API responses must be `{ data, error }` with `{ error: { code, message } }` on failures.
- JSON fields are camelCase; dates are ISO 8601 strings.
- Tests live under `tests/` (no co-located tests).
- Use Next.js Image for media; lazy-load by default.
- All user-facing UI strings must be translatable in English and German.

### Project Structure Notes

- Tag filter must behave consistently across shared and signed-in trip views.
- Keep UI accessible and keyboard navigable.

### References

- Epic 8 requirements and ACs: _bmad-output/implementation-artifacts/epics.md
- Project rules and conventions: _bmad-output/project-context.md

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- Implemented distinct tag aggregation, tag filter UI modes, and client-side OR filtering for trip overview entries.
- Added tag utility and trip overview component tests; ran `npm test` and `npm run lint` (lint has pre-existing warnings).
- Code review completed: Fixed 1 HIGH + 4 MEDIUM issues (test coverage gaps, performance optimizations)
  - Added case-insensitive tag filtering test
  - Optimized tag normalization by pre-computing normalized tags
  - Fixed redundant useMemo dependency
  - Added multi-select dropdown interaction test
  - Added edge case tests (empty results, map filter interaction)
  - All tests passing (458/458)

### File List

- travelblogs/src/utils/entry-tags.ts
- travelblogs/src/components/trips/trip-overview.tsx
- travelblogs/src/utils/i18n.ts
- travelblogs/tests/utils/entry-tags.test.ts
- travelblogs/tests/components/trip-overview.test.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/8-4-filter-entries-by-tags.md
