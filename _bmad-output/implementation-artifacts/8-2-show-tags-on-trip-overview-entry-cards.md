# Story 8.2: Show Tags on Trip Overview Entry Cards

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want see tags on entry cards in the trip overview,
so that I can quickly understand what each story is about.

## Acceptance Criteria

1. Given a trip overview page is shown (signed-in or shared), when entries have tags, then each entry card displays its tags as chips.
2. Given an entry has no tags, when I view the entry card, then no tag chips are shown.

## Tasks / Subtasks

- [ ] Expose tags in trip overview data (AC: 1,2)
  - [ ] Include tags in trip overview API/loader for each entry.
  - [ ] Ensure response uses camelCase and `{ data, error }`.
- [ ] Render tag chips on entry cards (AC: 1)
  - [ ] Add chip UI to entry cards with overflow-safe layout.
  - [ ] Hide tag container when empty.
- [ ] Tests (AC: 1,2)
  - [ ] Component tests for chips rendering and empty state.

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

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created

### File List

