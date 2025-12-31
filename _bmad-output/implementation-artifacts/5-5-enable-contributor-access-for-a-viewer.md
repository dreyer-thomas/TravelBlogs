# Story 5.5: Enable Contributor Access for a Viewer

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want to enable a viewer to contribute to a specific trip,
so that trusted people can add or edit entries.

## Acceptance Criteria

1. **Given** I am a creator viewing a trip I own  
   **When** I enable contributor access for a viewer  
   **Then** that viewer gains contributor permissions for this trip only
2. **Given** I disable contributor access  
   **When** the viewer tries to add or edit entries  
   **Then** they are blocked and can only view the trip

## Tasks / Subtasks

- [x] Add contributor access update API (AC: 1, 2)
  - [x] Add `PATCH /api/trips/:id/viewers/:userId` to toggle `canContribute`
  - [x] Validate `canContribute` boolean with Zod; return `{ data, error }`
  - [x] Enforce creator + trip owner authorization
  - [x] Return 404 for missing invite, 400 for invalid payload
- [x] Allow contributors to add/edit entries (AC: 1, 2)
  - [x] Update entry create API to allow `canContribute === true`
  - [x] Update entry update API to allow `canContribute === true`
  - [x] Keep delete restricted to creator/owner
- [x] Update invite UI to manage contributor access (AC: 1, 2)
  - [x] Show contributor status in invited viewer list
  - [x] Add toggle or action to enable/disable contribution per viewer
  - [x] Keep styling aligned with share panel patterns
- [x] Add tests (AC: 1, 2)
  - [x] API tests for contributor toggle + access gating
  - [x] API tests for contributor create/edit entries
  - [x] Component tests for contributor toggle UI and error states

## Dev Notes

- Trip access already exists via `TripAccess` with `canContribute` in Prisma; add a toggle endpoint and surface it in UI. [Source: travelblogs/prisma/schema.prisma]
- Current viewer invites/list live under `/api/trips/:id/viewers` with creator-only ownership checks; extend with `PATCH /api/trips/:id/viewers/:userId`. [Source: travelblogs/src/app/api/trips/[id]/viewers/route.ts]
- Entry create/edit are currently owner-only; allow contributors with `canContribute === true` for the trip while keeping delete creator-only. [Source: travelblogs/src/app/api/entries/route.ts] [Source: travelblogs/src/app/api/entries/[id]/route.ts]
- Access helper `hasTripAccess` only checks membership; add/adjust helper for `canContribute` to avoid duplicating logic. [Source: travelblogs/src/utils/trip-access.ts]
- Invite UI is in the share panel of trip detail; add per-viewer contributor toggle with existing styling. [Source: travelblogs/src/components/trips/trip-detail.tsx]
- Follow response format `{ data, error }` and `{ error: { code, message } }` and App Router-only API routes. [Source: _bmad-output/project-context.md]

### Technical Requirements

- Add a contributor toggle API: `PATCH /api/trips/:id/viewers/:userId` accepting `{ canContribute: boolean }`.
- Only the trip owner (creator) can toggle contributor access; use the same auth/ownership checks as invite endpoints.
- 404 for missing trip or invite, 400 for invalid payload, 401/403 for auth failures.
- Update entry create and entry update to allow contributors with `canContribute === true` on the trip; keep delete creator-only.
- Responses must remain `{ data, error }` with `{ error: { code, message } }` and ISO date strings.

### Architecture Compliance

- App Router only; API routes must live under `travelblogs/src/app/api`.
- Use Prisma 7.2.0 + SQLite via existing `prisma` client.
- Use Zod 4.2.1 for request validation (server-side only).
- Follow naming conventions: camelCase JSON, plural REST paths, singular table names.

### Library/Framework Requirements

- Next.js App Router + TypeScript.
- Auth.js (NextAuth) 4.24.13 JWT sessions with `token.sub`, `token.role`.
- Prisma 7.2.0 + SQLite.
- Zod 4.2.1 for validation.

### File Structure Requirements

- API routes: `travelblogs/src/app/api/trips/[id]/viewers/[userId]/route.ts` (PATCH).
- Entry APIs: `travelblogs/src/app/api/entries/route.ts` and `travelblogs/src/app/api/entries/[id]/route.ts`.
- UI updates: `travelblogs/src/components/trips/trip-detail.tsx`.
- Shared access helpers: `travelblogs/src/utils/trip-access.ts`.
- Tests: `travelblogs/tests/api/trips/` and `travelblogs/tests/api/entries/` plus `travelblogs/tests/components/`.

### Testing Requirements

- API tests for contributor toggle success, unauthorized access, and missing invite.
- API tests that contributors can create and edit entries, but cannot delete.
- Component tests for contributor toggle UI state, error display, and optimistic updates.

### Previous Story Intelligence

- Story 5.4 added `TripAccess` with `canContribute` default false plus invite list/remove APIs and share panel UI. Reuse the same access checks and response formatting. [Source: _bmad-output/implementation-artifacts/5-4-invite-viewers-to-a-trip.md]
- Eligible invitee logic and viewer list live in `trip-detail.tsx`; extend the invited list UI rather than creating a new panel. [Source: travelblogs/src/components/trips/trip-detail.tsx]

### Git Intelligence Summary

- Recent work added user management, viewer invites, and trip access checks; avoid regressions in Auth.js session usage and `{ data, error }` response shape. [Source: git log -5]
- Trip access helper is currently membership-only; extend with a contributor check to minimize repeated queries. [Source: travelblogs/src/utils/trip-access.ts]

### Latest Tech Information

- Web research not performed due to network restrictions; use pinned versions and patterns in `_bmad-output/project-context.md`.

### Project Context Reference

- App Router only, REST endpoints plural, and API responses wrapped `{ data, error }` with `{ error: { code, message } }`.
- Tests live in `tests/` (no co-located tests) and JSON fields are `camelCase`.

### Story Completion Status

- Status: review
- Completion note: Contributor access toggles, contributor entry permissions, and share panel controls implemented and tested.

### Project Structure Notes

- API routes live under `travelblogs/src/app/api` and must be plural.
- Components live under `travelblogs/src/components/<feature>/`.
- Tests live under `travelblogs/tests/` (no co-located tests).

### References

- Epic and acceptance criteria: `_bmad-output/epics.md`
- Architecture and patterns: `_bmad-output/architecture.md`
- Project rules: `_bmad-output/project-context.md`
- Trip access schema: `travelblogs/prisma/schema.prisma`
- Trip viewer APIs: `travelblogs/src/app/api/trips/[id]/viewers/route.ts`
- Trip viewer removal API: `travelblogs/src/app/api/trips/[id]/viewers/[userId]/route.ts`
- Eligible viewers API: `travelblogs/src/app/api/trips/[id]/viewers/eligible/route.ts`
- Entry APIs: `travelblogs/src/app/api/entries/route.ts`, `travelblogs/src/app/api/entries/[id]/route.ts`
- Trip detail UI: `travelblogs/src/components/trips/trip-detail.tsx`

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Drafted contributor toggle API, contributor entry permissions, UI updates, and test coverage expectations.
- Shipped contributor toggle API with Zod validation plus viewer tests for success/invalid/missing invite cases.
- Allowed contributors to create/update entries via shared access helper and covered contributor create/edit/delete gating in entry tests.
- Added contributor status badges and toggle controls to the share panel with optimistic updates and error handling tests.
- Completed contributor API and UI test coverage for toggle, create/edit gating, and share panel behaviors.
- Hardened contributor access checks for inactive users and added defensive UI toggle guards.
- Added trip-only scope copy for contributor access plus tests for inactive contributor blocks.

### File List

- .codex/history.jsonl
- .codex/log/codex-tui.log
- .codex/version.json
- _bmad-output/epics.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- travelblogs/src/app/api/trips/[id]/viewers/[userId]/route.ts
- travelblogs/src/app/api/trips/[id]/viewers/route.ts
- travelblogs/src/app/api/entries/route.ts
- travelblogs/src/app/api/entries/[id]/route.ts
- travelblogs/src/utils/trip-access.ts
- travelblogs/tests/api/trips/viewers.test.ts
- travelblogs/tests/api/entries/create-entry.test.ts
- travelblogs/tests/api/entries/update-entry.test.ts
- travelblogs/tests/api/entries/delete-entry.test.ts
- travelblogs/src/components/trips/trip-detail.tsx
- travelblogs/tests/components/trip-share-panel.test.tsx

## Change Log

- 2025-12-31: Added contributor toggle API, contributor entry permissions, share panel controls, and test coverage.
- 2025-12-31: Guarded contributor toggles, enforced active-user checks, and expanded inactive contributor tests.
- 2025-12-31: Synced sprint-status tracking for story review updates.
