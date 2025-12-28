# Story 2.5: Entry Title

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want to add a short title for each blog entry,
so that the entry is summarized in one short message.

## Acceptance Criteria

1. Given I am creating or editing an entry, when I enter a title up to 80 characters, then the title is saved with the entry and appears in the entry list and entry view header.
2. Given I submit an entry without a title or with a title over 80 characters, when I attempt to save, then I see a clear validation error and the entry is not saved.

## Tasks / Subtasks

- [ ] Add entry title to data model and API (AC: 1, 2)
  - [ ] Add `title` field to entry model in `prisma/schema.prisma` and run migration
  - [ ] Update entry create/update validation (Zod) to require `title` and enforce max length 80
  - [ ] Ensure API responses include `title` in entry payloads
- [ ] Update entry create/edit UI (AC: 1, 2)
  - [ ] Add title input to entry create/edit form with 80-char limit hint
  - [ ] Show validation errors for missing/too-long title
- [ ] Display title in entry list and entry view header (AC: 1)
  - [ ] Update entry list item to show title summary
  - [ ] Update entry reader header to show title
- [ ] Tests and regression checks (AC: 1, 2)
  - [ ] Add/extend API tests for required title and max length
  - [ ] Add/extend component tests for title rendering in list and entry view

## Dev Notes

### Developer Context (Purpose + UX Intent)
- Titles are short summaries that help scan entries in the list and orient readers in the entry view.
- Keep title input lightweight and always required for entry create/edit flows.

### Technical Requirements
- Title is required; max length 80 characters.
- Validation is server-side (Zod) with clear error messaging.
- API response shape remains `{ data, error }` with `{ error: { code, message } }`.

### Architecture Compliance
- App Router only; API routes under `src/app/api`.
- Validation is server-side only.
- Use `camelCase` JSON fields; keep REST endpoints plural.

### Library / Framework Requirements
- Next.js App Router + React + TypeScript; Tailwind CSS styling.
- Zod 4.2.1 for validation; Prisma 7.2.0 for schema/migrations.
- Latest-version verification not performed; use pinned versions from architecture and project context.

### Data Model and API Contract Notes
- Update `entry` model in `prisma/schema.prisma` to include `title` (string, required).
- Entry payloads must include `title` in list and detail responses.
- Align field names and types with `prisma/schema.prisma`; do not invent fields.

### File Structure Requirements
- Entry forms/components live in `src/components/entries/`.
- API handlers under `src/app/api/entries/`.
- Shared UI atoms in `src/components/ui/`.

### Reuse / Anti-Pattern Guidance
- Reuse existing entry form components; do not create duplicate forms.
- Keep data fetching in route handlers and server components; avoid API calls inside UI atoms.

### Testing Requirements
- Tests live in `tests/` (no co-located tests).
- API tests in `tests/api/` must assert `{ data, error }` shape.
- Component tests (if present) in `tests/components/entries/`.

### Scope Boundaries (Prevent Creep)
- Do not change entry body/media behavior beyond adding title.
- Do not change auth flows or permissions.

### Project Structure Notes

- Aligns with structure: `src/app/api/entries/`, `src/components/entries/`, `prisma/schema.prisma`.
- Keep files `kebab-case.tsx`, components `PascalCase`.

### References

- [Source: _bmad-output/epics.md#Story 2.5: Entry Title]
- [Source: _bmad-output/architecture.md#Data Architecture]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]

### Project Context Reference

- App Router only; API routes in `src/app/api`.
- Response shape `{ data, error }`, errors `{ error: { code, message } }`.
- JSON fields are `camelCase`.
- Tests in central `tests/` only.

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created

### File List

- TBD during implementation

### Story Completion Status

Status: ready-for-dev
