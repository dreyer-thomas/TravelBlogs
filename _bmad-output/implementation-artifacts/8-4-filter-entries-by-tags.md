# Story 8.4: Filter Entries by Tags

Status: ready-for-dev

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

- [ ] Compute distinct tags per trip (AC: 1,2)
  - [ ] Expose distinct tag list for trip overview.
  - [ ] Sort tags predictably (alpha or usage count).
- [ ] Implement filter UI (AC: 1,2,3)
  - [ ] Chip list for <=8 tags with multi-select OR.
  - [ ] Multi-select control for >8 tags with OR behavior.
  - [ ] Clear state shows all entries.
- [ ] Filter entries client-side or via API (AC: 1,2,3)
  - [ ] Apply OR logic to tags; ensure shared and signed-in views match.
- [ ] Tests (AC: 1,2,3)
  - [ ] Component tests for chip/multi-select modes.
  - [ ] Filtering behavior tests for OR logic and empty selection.

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

### File List

