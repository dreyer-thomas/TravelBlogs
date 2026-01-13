# Story 8.1: Add Tags to Entry Create/Edit

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator or contributor,
I want add tags to an entry while creating or editing,
so that I can group stories by place or phase.

## Acceptance Criteria

1. Given I am creating or editing an entry, when I type a tag, then I can select from trip-specific suggestions while still entering free text, and the same tag text cannot be added twice to the same entry.
2. Given I add more than three tags, when I save the entry, then all tags are saved without blocking me.

## Tasks / Subtasks

- [x] Define tag storage and constraints (AC: 1,2)
  - [x] Decide tag model shape (e.g., EntryTag join with Tag table; tags scoped to trip).
  - [x] Enforce per-entry uniqueness and case normalization.
- [x] Add API support for tags on entry create/edit (AC: 1,2)
  - [x] Validate tags with Zod (non-empty, max length, de-dup).
  - [x] Persist tags with entry create/update.
- [x] UI for tag input with suggestions (AC: 1)
  - [x] Autocomplete using trip-specific existing tags.
  - [x] Allow free-text entry and prevent duplicates in UI state.
- [x] Tests (AC: 1,2)
  - [x] API tests for tag create/update and de-dup behavior.
  - [x] Component tests for tag input de-dup and suggestion selection.

## Dev Notes

- App Router only; API routes live under `src/app/api` and are plural.
- API responses must be `{ data, error }` with `{ error: { code, message } }` on failures.
- JSON fields are camelCase; dates are ISO 8601 strings.
- Tests live under `tests/` (no co-located tests).
- Use Next.js Image for media; lazy-load by default.
- All user-facing UI strings must be translatable in English and German.

### Project Structure Notes

- Tag suggestions must be trip-scoped (existing tags for the trip only).
- Deduplicate tag text per entry; decide case-folding rules explicitly.
- If using Prisma, keep model names singular and tables singular.

### References

- Epic 8 requirements and ACs: _bmad-output/implementation-artifacts/epics.md
- Project rules and conventions: _bmad-output/project-context.md

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

### Implementation Plan

- Add Tag + EntryTag models with trip-scoped normalizedName uniqueness and entry-level tag uniqueness.
- Extend Prisma schema and add migration to enforce constraints at the database layer.
- Add tag validation + persistence in entry POST/PATCH using connect-or-create by trip scope.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- Added Tag/EntryTag models with unique constraints and migration.
- Added model tests covering per-entry and per-trip normalized uniqueness.
- Tests: `npm test`.
- Added tag validation and persistence for entry create/update.
- Added API tests for tag create/update and de-dup behavior.
- Tests: `npx vitest run tests/api/entries/create-entry.test.ts tests/api/entries/update-entry.test.ts`.
- Tests: `npm test`.
- Added tag input UI with suggestions from trip-scoped tags.
- Added tag input component tests (de-dup + suggestion selection).
- Tests: `npx vitest run tests/components/entry-tag-input.test.tsx`.
- Tests: `npx vitest run tests/components/create-entry-form.test.tsx tests/components/edit-entry-form.test.tsx`.
- Tests: `npm test`.
- All tasks complete; story ready for review.

## Change Log

- 2026-01-12: Added tag models, entry tag API support, trip tag suggestions API, tag input UI, and tests.

### File List

- _bmad-output/implementation-artifacts/8-1-add-tags-to-entry-createedit.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- travelblogs/prisma/schema.prisma
- travelblogs/prisma/migrations/20260112233000_add_entry_tags/migration.sql
- travelblogs/tests/api/entries/entry-tag-model.test.ts
- travelblogs/src/utils/entry-tags.ts
- travelblogs/src/app/api/entries/route.ts
- travelblogs/src/app/api/entries/[id]/route.ts
- travelblogs/tests/api/entries/create-entry.test.ts
- travelblogs/tests/api/entries/update-entry.test.ts
- travelblogs/src/components/entries/entry-tag-input.tsx
- travelblogs/src/components/entries/create-entry-form.tsx
- travelblogs/src/components/entries/edit-entry-form.tsx
- travelblogs/src/app/trips/[tripId]/entries/[entryId]/edit/page.tsx
- travelblogs/src/app/api/trips/[id]/tags/route.ts
- travelblogs/src/utils/i18n.ts
- travelblogs/tests/components/entry-tag-input.test.tsx
- travelblogs/tests/components/create-entry-form.test.tsx
- travelblogs/tests/components/edit-entry-form.test.tsx
