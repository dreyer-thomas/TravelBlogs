# Story 8.2: Show Tags on Trip Overview Entry Cards

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want see tags on entry cards in the trip overview,
so that I can quickly understand what each story is about.

## Acceptance Criteria

1. Given a trip overview page is shown (signed-in or shared), when entries have tags, then each entry card displays its tags as chips.
2. Given an entry has no tags, when I view the entry card, then no tag chips are shown.

## Tasks / Subtasks

- [x] Expose tags in trip overview data (AC: 1,2)
  - [x] Include tags in trip overview API/loader for each entry.
  - [x] Ensure response uses camelCase and `{ data, error }`.
- [x] Render tag chips on entry cards (AC: 1)
  - [x] Add chip UI to entry cards with overflow-safe layout.
  - [x] Hide tag container when empty.
- [x] Tests (AC: 1,2)
  - [x] Component tests for chips rendering and empty state.

## Dev Notes

- App Router only; API routes live under `src/app/api` and are plural.
- API responses must be `{ data, error }` with `{ error: { code, message } }` on failures.
- JSON fields are camelCase; dates are ISO 8601 strings.
- Tests live under `tests/` (no co-located tests).
- Use Next.js Image for media; lazy-load by default.
- All user-facing UI strings must be translatable in English and German.

### Project Structure Notes

- Tags must render in both signed-in and shared trip overview views.
- Chips should not reflow entry card layout unexpectedly on mobile.

### References

- Epic 8 requirements and ACs: _bmad-output/implementation-artifacts/epics.md
- Project rules and conventions: _bmad-output/project-context.md

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- Implementation plan: extend trip overview API and shared overview API to include entry tag names in camelCase responses, update trip overview types, and add API tests for tag payloads.
- Test plan: add component coverage for tag chips rendering and empty state; run full Vitest suite.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- Added tag names to trip overview API payloads (signed-in + shared), updated overview types, and added API coverage for tag fields in overview responses.
- Rendered tag chips on trip overview entry cards with truncation safeguards, and added component tests for tags plus empty state.
- Tests: `npm test`.

### File List

- travelblogs/src/app/api/trips/[id]/overview/route.ts
- travelblogs/src/app/api/trips/share/[token]/route.ts
- travelblogs/src/app/trips/[tripId]/overview/page.tsx
- travelblogs/src/app/trips/share/[token]/page.tsx
- travelblogs/src/components/trips/trip-overview.tsx
- travelblogs/src/types/trip-overview.ts
- travelblogs/src/utils/tag-sort.ts
- travelblogs/tests/api/trips/trip-overview.test.ts
- travelblogs/tests/api/trips/share-trip-overview.test.ts
- travelblogs/tests/components/trip-overview.test.tsx
- travelblogs/tests/components/shared-trip-page.test.tsx
- travelblogs/tests/utils/tag-sort.test.ts
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Code Review Notes

### Review Date: 2026-01-13

**Findings Fixed:**
1. ✅ Tag sorting inconsistency - Created shared `sortTagNames` utility with consistent locale-aware sorting
2. ✅ Type duplication - Extracted shared `TripOverviewEntry` and `TripOverviewTrip` types to `src/types/trip-overview.ts`
3. ✅ RTL support - Added `dir="auto"` to tag chip spans for proper bidirectional text rendering

**Test Results:**
- All 442 tests passing
- New test coverage: tag-sort utility (4 tests)

## Change Log

- 2026-01-12: Added entry tag chips to trip overview cards, exposed tags in overview APIs, and expanded component/API tests.
- 2026-01-13: Code review fixes - extracted shared types, added tag sort utility with tests, added RTL support to tag chips. All ACs verified, story marked done.
