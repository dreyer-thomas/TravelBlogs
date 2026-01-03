# Story 5.7: Contributor Adds and Edits Entries

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a contributor,
I want to add and edit entries for a trip I'm invited to,
so that I can help tell the story.

## Acceptance Criteria

1. **Given** I am signed in as a viewer with contributor access on a trip
   **When** I add a new entry
   **Then** the entry is created and appears in the trip's entry list
2. **Given** I am signed in as a contributor on a trip
   **When** I edit an existing entry
   **Then** my changes are saved and visible in the entry view
3. **Given** I am signed in as a contributor on a trip
   **When** I edit the trip metadata (title, dates, cover)
   **Then** the trip changes are saved and visible in the trip view

## Tasks / Subtasks

- [x] Confirm contributor permissions on entry APIs (AC: 1, 2)
  - [x] Verify `POST /api/entries` allows `canContribute === true`
  - [x] Verify `PATCH /api/entries/:id` allows `canContribute === true`
  - [x] Keep `DELETE /api/entries/:id` creator-only
- [x] Allow contributors to edit trip metadata (AC: 3)
  - [x] Update `PATCH /api/trips/:id` to allow `canContribute === true`
  - [x] Keep `DELETE /api/trips/:id` creator-only
- [x] Allow contributors into entry UI flows (AC: 1, 2)
  - [x] Update entry detail page server gating to allow `TripAccess` users
  - [x] Update edit entry page server gating to allow contributors
  - [x] Ensure edit action is visible for contributors but delete remains creator-only
- [x] Guard non-contributors from create/edit flows (AC: 1, 2)
  - [x] If user lacks `canContribute`, block access to create/edit pages with `notFound`
  - [x] Keep view-only users read-only
- [x] Add/adjust tests (AC: 1, 2)
  - [x] API tests for contributor create/edit success and viewer denial
  - [x] Component/page tests for contributor edit visibility and delete hidden
- [x] Add/adjust tests for trip metadata edits (AC: 3)
  - [x] API tests for contributor trip edit success and viewer denial
  - [x] Ensure delete remains creator-only

## Dev Notes

- Entry APIs already use `canContributeToTrip` for create/edit; re-use this logic rather than adding new checks. [Source: travelblogs/src/app/api/entries/route.ts] [Source: travelblogs/src/app/api/entries/[id]/route.ts]
- Entry pages currently check `trip.ownerId === session.user.id` and will block contributors; update to use `TripAccess` plus `canContributeToTrip` where needed. [Source: travelblogs/src/app/trips/[tripId]/entries/[entryId]/page.tsx] [Source: travelblogs/src/app/trips/[tripId]/entries/[entryId]/edit/page.tsx]
- Entry detail actions always show edit/delete; ensure delete remains creator-only and edit is shown for contributors. [Source: travelblogs/src/components/entries/entry-detail.tsx]
- Trip access helpers are centralized; avoid duplicating access queries. [Source: travelblogs/src/utils/trip-access.ts]
- Trip metadata edits currently check owner-only; update to allow contributors with `canContributeToTrip` while keeping delete owner-only. [Source: travelblogs/src/app/api/trips/[id]/route.ts]

### Technical Requirements

- Contributors can create and edit entries only for trips where `TripAccess.canContribute === true`.
- View-only users may view entries but cannot access create/edit routes.
- `DELETE /api/entries/:id` remains creator-only.
- Contributors can edit trip metadata only for trips where `TripAccess.canContribute === true`.
- `DELETE /api/trips/:id` remains creator-only.
- Responses must remain `{ data, error }` with `{ error: { code, message } }` and ISO timestamps.

### Architecture Compliance

- App Router only; API routes under `src/app/api`.
- Use Prisma 7.2.0 + SQLite models; no schema changes required.
- Use Zod 4.2.1 for request validation (server-side only).

### Library/Framework Requirements

- Next.js App Router + TypeScript.
- Auth.js (NextAuth) 4.24.13 JWT sessions with `token.sub`, `token.role`.
- Prisma 7.2.0 + SQLite.
- Use centralized access helpers in `src/utils/` (no new `lib/`).

### File Structure Requirements

- Entry APIs: `travelblogs/src/app/api/entries/route.ts`, `travelblogs/src/app/api/entries/[id]/route.ts`.
- Trip API: `travelblogs/src/app/api/trips/[id]/route.ts`.
- Entry pages: `travelblogs/src/app/trips/[tripId]/entries/new/page.tsx`, `travelblogs/src/app/trips/[tripId]/entries/[entryId]/page.tsx`, `travelblogs/src/app/trips/[tripId]/entries/[entryId]/edit/page.tsx`.
- Entry UI: `travelblogs/src/components/entries/entry-detail.tsx`.
- Tests: `travelblogs/tests/api/entries/` and `travelblogs/tests/components/`.
- Trip tests: `travelblogs/tests/api/trips/`.

### Testing Requirements

- API tests:
  - Contributors can create and edit entries for invited trips.
  - View-only users receive `403 FORBIDDEN` on create/edit.
  - Creators remain allowed for all entry actions; delete stays creator-only.
  - Contributors can edit trip metadata for invited trips.
  - View-only users receive `403 FORBIDDEN` on trip edit.
- Component/page tests:
  - Contributor sees edit action but not delete.
  - View-only users do not see edit/delete actions.

### Previous Story Intelligence

- Story 5.5 added contributor toggles and already updated entry APIs; focus on UI and page gating to match API rules. [Source: _bmad-output/implementation-artifacts/5-5-enable-contributor-access-for-a-viewer.md]
- Story 5.6 updated viewer trip access; keep view-only users read-only in entry flows. [Source: _bmad-output/implementation-artifacts/5-6-viewer-access-to-invited-trips.md]

### Git Intelligence Summary

- Recent commits added contributor access and viewer invites; avoid regressions in Auth.js role checks and `{ data, error }` response shape. [Source: git log -5]

### Latest Tech Information

- Web research not performed due to network restrictions; use pinned versions and patterns in `_bmad-output/project-context.md`.

### Project Context Reference

- App Router only; REST endpoints plural; API responses wrapped `{ data, error }` with `{ error: { code, message } }`.
- Tests live in `tests/` (no co-located tests) and JSON fields are `camelCase`.
- Do not introduce Docker/TLS proxy in MVP tasks.

### Story Completion Status

- Status: done
- Completion note: Contributor entry and trip metadata permissions validated with new tests; inactive owners blocked from entry create/edit; full test suite passing.

### Project Structure Notes

- API routes live under `travelblogs/src/app/api` and must be plural.
- Components live under `travelblogs/src/components/<feature>/`.
- Tests live under `travelblogs/tests/` (no co-located tests).

### References

- Epic and acceptance criteria: `_bmad-output/epics.md`
- Architecture and patterns: `_bmad-output/architecture.md`
- Project rules: `_bmad-output/project-context.md`
- Entry APIs: `travelblogs/src/app/api/entries/route.ts`, `travelblogs/src/app/api/entries/[id]/route.ts`
- Entry pages: `travelblogs/src/app/trips/[tripId]/entries/[entryId]/page.tsx`, `travelblogs/src/app/trips/[tripId]/entries/[entryId]/edit/page.tsx`
- Entry UI: `travelblogs/src/components/entries/entry-detail.tsx`
- Trip access helper: `travelblogs/src/utils/trip-access.ts`

## Change Log

- Addressed contributor create/edit access verification and expanded tests for view-only users and delete permissions. (Date: 2025-12-29)
- Added inactive owner guardrails for entry create/edit and documented current working set, including tooling artifacts. (Date: 2026-01-03)

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Drafted contributor entry flow guidance focusing on UI gating and action visibility.
- Reused existing contributor API checks and access helper patterns.
- Verified entry API permissions for contributors and creator-only deletes; full test suite passed (`npm test`).
- Confirmed trip metadata contributor permissions and creator-only delete; full test suite passed (`npm test`).
- Confirmed entry detail/edit gating and action visibility already allow contributors while keeping deletes owner-only; full test suite passed (`npm test`).
- Verified create/edit gating for non-contributors and added tests for view-only entry edit denial and action visibility; full test suite passed (`npm test`).
- Added inactive owner checks for entry create/edit and tests covering blocked inactive owners.

### File List

- .codex/history.jsonl
- .codex/log/codex-tui.log
- .codex/sessions/2026/01/03/rollout-2026-01-03T12-41-26-019b83a9-8f57-7761-a03c-120012bf2623.jsonl
- .codex/sessions/2026/01/03/rollout-2026-01-03T13-31-41-019b83d7-9184-75c3-8a26-b9ea846958b0.jsonl
- .codex/sessions/2026/01/03/rollout-2026-01-03T13-40-56-019b83e0-0a40-77c3-bce3-f3138c56b77c.jsonl
- _bmad-output/implementation-artifacts/5-7-contributor-adds-and-edits-entries.md
- _bmad-output/implementation-artifacts/6-4-user-manual.md
- _bmad-output/implementation-artifacts/6-5-language-selection.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/validation-report-20260103T123708Z.md
- travelblogs/tests/api/entries/create-entry.test.ts
- travelblogs/tests/api/entries/update-entry.test.ts
- travelblogs/tests/api/trips/delete-trip.test.ts
- travelblogs/tests/components/entry-detail.test.tsx
- travelblogs/src/app/api/entries/route.ts
- travelblogs/src/app/api/entries/[id]/route.ts
