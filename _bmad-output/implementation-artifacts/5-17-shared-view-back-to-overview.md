# Story 5.17: Shared View Link Back to Trip Overview

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want an easy way to return from a shared entry back to the shared trip overview,
so that I can navigate the trip without using the browser back button.

## Acceptance Criteria

1. **Given** I am viewing a shared entry page
   **When** I look for navigation options
   **Then** I see a clear "Back to trip" action that returns to the shared trip overview
2. **Given** I use the "Back to trip" action
   **When** the shared trip overview loads
   **Then** I can continue browsing entries from the overview

## Tasks / Subtasks

- [ ] Add shared entry navigation to overview (AC: 1, 2)
  - [ ] Add a "Back to trip" link or button on the shared entry page
  - [ ] Place it either in the top header or alongside the prev/next controls, matching existing UI patterns
- [ ] Add/adjust tests (AC: 1, 2)
  - [ ] Component test for presence of "Back to trip" action
  - [ ] Component test for correct link target

## Dev Notes

- Shared entry view uses `EntryReader` and provides prev/next navigation only; extend it to include a link to `/trips/share/[token]`. [Source: travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx] [Source: travelblogs/src/components/entries/entry-reader.tsx]
- Keep styling aligned with existing shared view patterns and navigation controls. [Source: travelblogs/src/components/entries/entry-reader.tsx]

### Technical Requirements

- The "Back to trip" action must navigate to `/trips/share/[token]` for the current share token.
- Navigation should be available on every shared entry view.

### UX Requirements

- Use existing button/link styling; keep the shared reader UI uncluttered.
- Placement should be consistent across entries and work on mobile.

### Architecture Compliance

- App Router only; use existing shared view routes.
- No schema changes or new APIs required.

### Library/Framework Requirements

- Next.js App Router + TypeScript.
- Auth.js (NextAuth) 4.24.13 JWT sessions.

### File Structure Requirements

- Shared entry page: `travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx`.
- Entry reader component: `travelblogs/src/components/entries/entry-reader.tsx`.
- Tests: `travelblogs/tests/components/`.

### Testing Requirements

- Component tests:
  - "Back to trip" link renders for shared entries.
  - Link points to `/trips/share/[token]`.

### Previous Story Intelligence

- Shared view routing and navigation were established in Epic 4; maintain consistent shared-view experience. [Source: _bmad-output/implementation-artifacts/4-5-invalidate-shared-entry-pages-on-revoke.md]

### Git Intelligence Summary

- Recent commits adjusted shared view navigation; avoid regressions in entry reader controls. [Source: git log -5]

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
- Entry reader component: `travelblogs/src/components/entries/entry-reader.tsx`

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Drafted shared-view back-to-overview navigation requirements and UI placement options.
- Added test coverage expectations for link rendering and target.

### File List

- _bmad-output/epics.md
- _bmad-output/architecture.md
- _bmad-output/project-context.md
- travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx
- travelblogs/src/components/entries/entry-reader.tsx
