# Story 5.15: Shared View Hero Image Uses Selected Cover

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want the shared entry hero image to use the selected story image,
so that the shared view reflects the intended cover photo.

## Acceptance Criteria

1. **Given** an entry has a selected story image (cover image)
   **When** I open the shared entry view
   **Then** the hero image displays the selected story image
2. **Given** an entry does not have a selected story image
   **When** I open the shared entry view
   **Then** the hero image uses the first available entry photo (fallback)

## Tasks / Subtasks

- [ ] Update shared entry mapping to respect cover image (AC: 1, 2)
  - [ ] Ensure `EntryReader` receives the selected cover image URL when present
  - [ ] Preserve existing fallback behavior when no cover image is set
- [ ] Add/adjust tests (AC: 1, 2)
  - [ ] Component test for shared entry hero image using cover image
  - [ ] Component test for fallback to first photo when no cover image

## Dev Notes

- Shared entry view uses `EntryReader` with `mapEntryToReader`; ensure mapping uses `coverImageUrl` when present. [Source: travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx] [Source: travelblogs/src/utils/entry-reader.ts]
- Entry API already returns `coverImageUrl`; avoid additional API changes. [Source: travelblogs/src/app/api/entries/[id]/route.ts] [Source: travelblogs/src/app/api/trips/share/[token]/entries/[entryId]/route.ts]

### Technical Requirements

- The hero image must prefer `coverImageUrl` when present.
- Fallback to the first media image if no cover image is set.
- No schema changes or new endpoints required.

### UX Requirements

- Keep shared view layout intact; only update the hero image source selection.

### Architecture Compliance

- App Router only; use existing shared view route and entry mapping utilities.
- Use existing data models and response shapes.

### Library/Framework Requirements

- Next.js App Router + TypeScript.
- Auth.js (NextAuth) 4.24.13 JWT sessions.
- Prisma 7.2.0 + SQLite.

### File Structure Requirements

- Shared entry page: `travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx`.
- Entry reader mapping utility: `travelblogs/src/utils/entry-reader.ts`.
- Tests: `travelblogs/tests/components/`.

### Testing Requirements

- Component tests:
  - Hero image uses cover image when provided.
  - Hero image falls back to first media image when cover is missing.

### Previous Story Intelligence

- Entry cover image is already supported in entry creation/edit flows; keep consistency with entry reader expectations. [Source: _bmad-output/implementation-artifacts/2-6-unified-entry-image-library.md]

### Git Intelligence Summary

- Recent commits adjusted shared views and entry readers; avoid regressions in shared entry rendering. [Source: git log -5]

### Latest Tech Information

- Web research not performed due to network restrictions; use pinned versions and patterns in `_bmad-output/project-context.md`.

### Project Context Reference

- App Router only; REST endpoints plural; API responses wrapped `{ data, error }` with `{ error: { code, message } }`.
- Tests live in `tests/` (no co-located tests) and JSON fields are `camelCase`.
- Do not introduce Docker/TLS proxy in MVP tasks.

### Story Completion Status

- Status: ready-for-dev
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Components live under `travelblogs/src/components/<feature>/`.
- Tests live under `travelblogs/tests/` (no co-located tests).

### References

- Epic and acceptance criteria: `_bmad-output/epics.md`
- Architecture and patterns: `_bmad-output/architecture.md`
- Project rules: `_bmad-output/project-context.md`
- Shared entry page: `travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx`
- Entry reader mapping: `travelblogs/src/utils/entry-reader.ts`

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Drafted shared-view hero image behavior using cover image preference and fallback.
- Added test coverage expectations for hero image selection.

### File List

- _bmad-output/epics.md
- _bmad-output/architecture.md
- _bmad-output/project-context.md
- travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx
- travelblogs/src/utils/entry-reader.ts
