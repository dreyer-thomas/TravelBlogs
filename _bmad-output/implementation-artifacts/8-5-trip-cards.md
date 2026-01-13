# Story 8.5: Show Tags on Trip Cards

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want to see trip tags on trip cards in the trips page,
so that I can quickly recognize what each trip is about.

## Acceptance Criteria

1. Given I am on the /trips page, when a trip has tagged entries, then the trip card shows the distinct tags below the trip title, to the right of the cover image, listed left to right.
2. Given a trip has no tags, when I view the trip card, then no tag list is shown.
3. Given a trip has tags, when I view the trip card, then tags are shown in predictable sorted order (alphabetical).

## Tasks / Subtasks

- [x] Data: add tag list to trips list response (AC: 1, 2, 3)
  - [x] Aggregate distinct tags per trip (case-insensitive) using existing tag utilities.
  - [x] Avoid N+1 queries by fetching tags for all trip IDs in one query and mapping in memory.
- [x] UI: render tag chips on TripCard (AC: 1, 2, 3)
  - [x] Extend trip list types/props to include tags.
  - [x] Place tags below the title, aligned to the right of the cover image, listed left to right.
  - [x] Hide the tag row when empty.
- [x] i18n: add EN/DE strings if any new labels are introduced.
- [x] Tests: cover tag output and ordering.
  - [x] Update API list-trips tests for tags in response.
  - [x] Update TripCard component tests for tag rendering and empty state.

## Dev Notes

### Developer Context

- Epic 8 established tag normalization, sorting, and filter behavior; reuse existing utilities to keep display consistent.
- Tags are stored per trip in the Tag table and linked to entries via EntryTag. The trips list should expose distinct trip tags derived from tagged entries.

### Technical Requirements

- Extend GET /api/trips response to include tags: string[] per trip.
- Tags must be distinct, trimmed, and case-insensitive for uniqueness; output retains the first encountered tag casing.
- Sort tags alphabetically using existing sortTagNames helper.
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
- Utilities: prefer travelblogs/src/utils/entry-tags.ts and travelblogs/src/utils/tag-sort.ts
- Tests: travelblogs/tests/api/trips/list-trips.test.ts and travelblogs/tests/components/trip-card.test.tsx

### Testing Requirements

- API tests: ensure tags array exists and is sorted, and empty when no tags.
- Component tests: verify tags render in order and are hidden when empty.
- Keep tests in tests/ and use existing patterns (LocaleProvider for i18n).

### Previous Story Intelligence

- Story 8.4 added tag utilities (getDistinctTagList, normalizeTagName, sortTagNames) and established consistent tag behavior across views.
- Trip overview already exposes tags on entry cards and uses sorted tag lists; align trip card tags to the same utilities.

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
- travelblogs/src/utils/entry-tags.ts (tag aggregation)
- travelblogs/src/utils/tag-sort.ts (sorting)
- travelblogs/src/components/trips/trip-card.tsx (trip card UI)
- travelblogs/src/app/api/trips/route.ts (trip list API)
- travelblogs/tests/components/trip-card.test.tsx (component tests)
- travelblogs/tests/api/trips/list-trips.test.ts (API tests)

## Story Completion Status

Status: done

Completion note: Added deterministic tag ordering and trimming coverage for trip tags. Tests passing (462/462).

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- None.

### Implementation Plan

- Aggregate per-trip tags with a single query, normalize for case-insensitive uniqueness, and sort with shared tag utilities.
- Surface tag arrays on trip list responses and propagate into trips page types/props.
- Render tag chips on TripCard with empty-state hiding and add API/UI tests.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Web research skipped due to restricted network access.
- Added tag aggregation to the trips list API with case-insensitive uniqueness and alpha sorting.
- Rendered tag chips on trip cards and wired tag props through trips page types.
- Ensured tag casing selection is deterministic across trips API responses.
- Added API test coverage for trimmed tag names and duplicate tags across entries.
- Tests: `npm test` (462/462)

### File List

- travelblogs/src/app/api/trips/route.ts
- travelblogs/src/app/trips/page.tsx
- travelblogs/src/components/trips/trips-page-content.tsx
- travelblogs/src/components/trips/trip-card.tsx
- travelblogs/tests/api/trips/list-trips.test.ts
- travelblogs/tests/components/trip-card.test.tsx
- travelblogs/tests/components/trips-page.test.tsx
- .codex/history.jsonl
- .codex/log/codex-tui.log
- .codex/sessions/2026/01/13/rollout-2026-01-13T20-55-55-019bb8ed-dddc-7ba3-9d07-a057261298a4.jsonl
- .codex/sessions/2026/01/13/rollout-2026-01-13T22-00-09-019bb928-abad-7753-a545-9272f1a2f8e2.jsonl
- .codex/sessions/2026/01/13/rollout-2026-01-13T22-01-52-019bb92a-3ed1-7f20-ac23-fcae2a42c6dd.jsonl
- .codex/sessions/2026/01/13/rollout-2026-01-13T22-43-41-019bb950-885d-7aa2-bfd7-3f201a20b49f.jsonl
- .codex/sessions/2026/01/13/rollout-2026-01-13T23-01-57-019bb961-4246-7d30-9f26-2c4c8bfce8c7.jsonl
- _bmad-output/planning-artifacts/epics.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/validation-report-20260113T214121Z.md
- _bmad-output/implementation-artifacts/8-5-trip-cards.md

## Change Log

- 2026-01-13: Added trip tag aggregation in list API, surfaced tags on trip cards, and updated API/UI tests for tag ordering and empty states.
- 2026-01-13: Enforced deterministic tag ordering for trips API and added trimming/duplicate tag test coverage.
