# Story 8.5: Show Tags on Story Cards

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want to see tags on each story card in the trip detail and shared overview pages,
so that I can quickly recognize what each story is about without cluttering the trips list.

## Acceptance Criteria

1. Given I am on the /trips page, when I view a trip card, then no tags are shown.
2. Given I am on the trip detail page (/trips/[id]) or shared trip overview, when an entry has tags, then the entry card shows the tags below the entry title.
3. Given an entry has no tags, when I view the entry card, then no tag list is shown.

## Tasks / Subtasks

- [x] Data: remove tag list from trips list response (AC: 1)
  - [x] Drop tag aggregation in GET /api/trips.
- [x] UI: hide tags on trip cards and show tags on entry cards (AC: 1, 2, 3)
  - [x] Remove trip card tag chips and tag props.
  - [x] Add entry tag chips to trip detail cards and keep them in overview cards.
- [x] i18n: add EN/DE strings if any new labels are introduced.
- [x] Tests: cover list response shape and card tag rendering rules.
  - [x] Update API list-trips tests to drop tags from response expectations.
  - [x] Update TripCard component tests to remove tag assertions.
  - [x] Ensure TripOverview component tests cover entry tag visibility.

## Dev Notes

### Developer Context

- Epic 8 established tag normalization, sorting, and filter behavior for entry tags on story cards.
- Tags are stored per trip in the Tag table and linked to entries via EntryTag.

### Technical Requirements

- Ensure GET /api/trips response excludes tag lists.
- Preserve response wrapper: { data, error } with { error: { code, message } } on failures.
- JSON fields camelCase; dates ISO 8601 strings.

### Architecture Compliance

- App Router only; API routes under src/app/api.
- Prisma models remain singular; no schema changes needed.
- Tests live under tests/ (no co-located tests).

### Library and Framework Requirements

- Keep Next.js Image usage for trip cover images (already in TripCard).
- Use useTranslation for any user-visible strings (EN and DE required).

### File Structure Requirements

- API: travelblogs/src/app/api/trips/route.ts
- Types: travelblogs/src/app/trips/page.tsx (TripListItem)
- UI: travelblogs/src/components/trips/trips-page-content.tsx and travelblogs/src/components/trips/trip-card.tsx
- Tests: travelblogs/tests/api/trips/list-trips.test.ts and travelblogs/tests/components/trip-card.test.tsx

### Testing Requirements

- API tests: ensure list response excludes tags.
- Component tests: ensure trip cards no longer render tags; entry tags covered in TripOverview tests.
- Keep tests in tests/ and use existing patterns (LocaleProvider for i18n).

### Previous Story Intelligence

- Story 8.4 added tag utilities (getDistinctTagList, normalizeTagName, sortTagNames) and established consistent tag behavior across views.
- Trip overview already exposes tags on entry cards and uses sorted tag lists; keep tags there and remove them from trip cards.

### Git Intelligence Summary

- Recent commits touched tag utilities and trip overview components. Follow the established pattern of utilities in src/utils and component tests in tests/components.

### Latest Tech Information

- Skipped: network access restricted. No external research required for this UI and API change.

### Project Context Reference

- All user-facing strings must be translatable (English and German).
- Follow naming conventions (camelCase, PascalCase, kebab-case files).
- Responses must be { data, error } with consistent error format.

### References

- _bmad-output/planning-artifacts/epics.md (Epic 8, Story 8.5)
- _bmad-output/project-context.md (global rules)
- _bmad-output/architecture.md (patterns and structure)
- travelblogs/src/components/trips/trip-card.tsx (trip card UI)
- travelblogs/src/app/api/trips/route.ts (trip list API)
- travelblogs/tests/components/trip-card.test.tsx (component tests)
- travelblogs/tests/api/trips/list-trips.test.ts (API tests)

## Story Completion Status

Status: done

Completion note: Removed tags from trips list cards and API, showing tags on trip detail and shared overview entry cards. Tests updated.

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- None.

### Implementation Plan

- Remove trip list tag aggregation and update response shape.
- Drop trip card tag chips and add entry tag chips to trip detail cards.
- Update list-trips and trip-card tests to match the new tag placement.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Web research skipped due to restricted network access.
- Removed tag aggregation from trips list API and trip cards.
- Updated list-trips and trip-card tests to match the slimmer payload.
- Tags render on trip detail entry cards via entries API and remain on shared overview cards.
- Tests: `npm test` (460/460)

### File List

- travelblogs/src/app/api/trips/route.ts
- travelblogs/src/app/api/entries/route.ts
- travelblogs/src/app/trips/page.tsx
- travelblogs/src/components/trips/trips-page-content.tsx
- travelblogs/src/components/trips/trip-card.tsx
- travelblogs/src/components/trips/trip-detail.tsx
- travelblogs/tests/api/trips/list-trips.test.ts
- travelblogs/tests/components/trip-card.test.tsx
- travelblogs/tests/components/trips-page.test.tsx
- travelblogs/tests/components/trip-detail.test.tsx
- _bmad-output/implementation-artifacts/8-5-trip-cards.md

## Change Log

- 2026-01-14: Removed tags from /trips cards and list API; tags render on trip detail and shared overview entry cards with tests updated.
- 2026-01-13: Added trip tag aggregation in list API, surfaced tags on trip cards, and updated API/UI tests for tag ordering and empty states.
- 2026-01-13: Enforced deterministic tag ordering for trips API and added trimming/duplicate tag test coverage.
