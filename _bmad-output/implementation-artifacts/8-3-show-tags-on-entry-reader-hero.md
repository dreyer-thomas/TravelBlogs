# Story 8.3: Show Tags on Entry Reader Hero

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want see entry tags on the story hero image,
so that I can understand the story context at a glance.

## Acceptance Criteria

1. Given I open an entry reader page (signed-in or shared), when the entry has tags, then the tags appear on the hero image at the top-right corner.

## Tasks / Subtasks

- [ ] Expose tags in entry reader data (AC: 1)
  - [ ] Ensure entry reader API/loader includes tag list.
- [ ] Render hero tag overlay (AC: 1)
  - [ ] Position tag chips top-right on hero image, responsive for mobile.
  - [ ] Ensure contrast and accessibility against media.
- [ ] Tests (AC: 1)
  - [ ] Component test for hero tag overlay when tags exist.

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

### File List

