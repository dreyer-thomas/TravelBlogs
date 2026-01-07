# Story 5.17: Shared View Link Back to Trip Overview

Status: done

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

- [x] Add shared entry navigation to overview (AC: 1, 2)
  - [x] Add a "Back to trip" link or button on the shared entry page
  - [x] Place it either in the top header or alongside the prev/next controls, matching existing UI patterns
- [x] Add/adjust tests (AC: 1, 2)
  - [x] Component test for presence of "Back to trip" action
  - [x] Component test for correct link target

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

- Status: done
- Completion note: Back-to-trip link verified with shared entry page coverage; story marked complete.

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

- Implementation Plan: Add optional back-to-trip link support in `EntryReader`, pass shared overview href from shared entry page, and add component coverage in `tests/components/entry-reader.test.tsx`.

### Completion Notes List

- ✅ Added shared entry back-to-trip link support in `travelblogs/src/components/entries/entry-reader.tsx` and wired the shared entry page.
- ✅ Tests: `travelblogs/tests/components/entry-reader.test.tsx`.
- ✅ Full test run: `npm test`.
- ✅ Added shared entry page coverage for back-to-trip link wiring.
- ✅ Synced sprint status and updated story file list to match current changes.
- ✅ Stabilized admin trip list ordering for deterministic tests.

### File List

- .codex/history.jsonl
- .codex/log/codex-tui.log
- .codex/sessions/2026/01/07/rollout-2026-01-07T23-26-54-019b9a91-f1a2-7713-9256-a776ed2e610a.jsonl
- .codex/sessions/2026/01/07/rollout-2026-01-07T23-52-30-019b9aa9-614e-76e2-83c3-8ae0595212a7.jsonl
- .codex/sessions/2026/01/07/rollout-2026-01-07T23-58-14-019b9aae-a1cf-7011-ae50-c020e9cfe20a.jsonl
- _bmad-output/implementation-artifacts/5-16-missing-migration-must-change-password.md
- _bmad-output/implementation-artifacts/5-19-fix-edit-navigation.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/5-17-shared-view-back-to-overview.md
- travelblogs/src/app/api/trips/route.ts
- travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx
- travelblogs/src/components/entries/entry-reader.tsx
- travelblogs/tests/components/entry-reader.test.tsx
- travelblogs/tests/components/shared-entry-page.test.tsx

### Change Log

- 2026-01-07: Added back-to-trip navigation for shared entry reader, added component tests, and marked story ready for review.
- 2026-01-07: Added shared entry page back-to-trip link coverage, synced sprint status, and aligned file list.
- 2026-01-07: Stabilized admin trip list ordering for deterministic tests.
