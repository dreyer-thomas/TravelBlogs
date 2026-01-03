# Story 5.6: Viewer Access to Invited Trips

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want to see trips I've been invited to,
so that I can view the shared travel story.

## Acceptance Criteria

1. **Given** I am signed in as a viewer with trip invites
   **When** I open my trips list
   **Then** I see the trips I've been invited to
2. **Given** I try to access a trip I have not been invited to
   **When** I open its link or route
   **Then** I am denied access

## Tasks / Subtasks

- [x] Expand trip listing API to support viewer invites (AC: 1, 2)
  - [x] Update `GET /api/trips` to allow viewer access and return invited trips
  - [x] Keep creator behavior unchanged (creator sees owned trips only)
  - [x] Return `403` when role is missing/unknown and `401` when unauthenticated
- [x] Update trips page to reflect viewer access (AC: 1)
  - [x] Use session role to show viewer-friendly header and empty state
  - [x] Hide creator-only actions (create trip, manage users) for viewers
- [x] Ensure read-only access gates remain enforced (AC: 2)
  - [x] Verify trip detail and entry list endpoints deny access without `TripAccess`
  - [x] Keep create/edit/delete actions creator-only or contributor-only
- [x] Add/adjust tests (AC: 1, 2)
  - [x] Extend API list tests for viewer invites and empty list
  - [x] Add/adjust component tests for viewer trips page states

## Dev Notes

- `GET /api/trips` currently rejects non-creator requests; update it to branch on `token.role` and query `TripAccess` for viewer lists. [Source: travelblogs/src/app/api/trips/route.ts]
- `TripAccess` is the single source of truth for invited trips and already enforces active users via access checks. [Source: travelblogs/src/utils/trip-access.ts] [Source: travelblogs/prisma/schema.prisma]
- Trips UI currently assumes creator ownership and always shows create/manage actions; gate by `session.user.role`. [Source: travelblogs/src/app/trips/page.tsx]
- Access denial for uninvited trips is already enforced by `hasTripAccess` in trip and entry APIs; keep that behavior intact. [Source: travelblogs/src/app/api/trips/[id]/route.ts] [Source: travelblogs/src/app/api/entries/route.ts]

### Technical Requirements

- Update `GET /api/trips` to return the same list fields for viewers:
  - `id`, `title`, `startDate`, `endDate`, `coverImageUrl`, `updatedAt`
- Viewer query should pull trips from `TripAccess` for the requesting user, ordered by `trip.updatedAt DESC`.
- Preserve response envelope `{ data, error }` with `{ error: { code, message } }` for failures.
- Reject unauthorized roles or missing role in the token with `403 FORBIDDEN` (do not assume creator).

### UX Requirements

- Keep the trips list layout aligned with the existing warm palette and typography system; do not introduce new layout patterns. [Source: _bmad-output/ux-design-specification.md]
- For viewers, use a read-only trips list with a clear header and empty state copy (no create/manage actions). [Source: travelblogs/src/app/trips/page.tsx]

### Architecture Compliance

- App Router route handlers only; keep API under `src/app/api`.
- Use Prisma 7.2.0 + SQLite models and avoid schema changes for this story.
- Enforce role-based access checks on the server, even if UI hides creator actions.

### Library/Framework Requirements

- Next.js App Router + TypeScript.
- Auth.js (NextAuth) 4.24.13 JWT sessions with `token.sub` and `token.role`.
- Prisma 7.2.0 + SQLite.
- Zod 4.2.1 for request validation (server-side only).

### File Structure Requirements

- API update: `travelblogs/src/app/api/trips/route.ts`.
- Trips page UI updates: `travelblogs/src/app/trips/page.tsx`.
- Tests: `travelblogs/tests/api/trips/list-trips.test.ts` and relevant component tests under `travelblogs/tests/components/`.

### Testing Requirements

- API tests:
  - Viewer sees only invited trips (no creator-owned trips unless invited).
  - Viewer with no invites receives an empty list (200).
  - Missing/unknown role returns 403; unauthenticated returns 401.
- Component tests:
  - Viewer sees invited trips list and no creator actions.
  - Viewer empty state copy renders when no invited trips.

### Previous Story Intelligence

- Trip invites and `TripAccess` records were introduced in Story 5.4; reuse those patterns and avoid new access tables. [Source: _bmad-output/implementation-artifacts/5-4-invite-viewers-to-a-trip.md]
- Story 5.5 added contributor toggles and extended access helpers; keep access checks centralized to prevent duplication. [Source: _bmad-output/implementation-artifacts/5-5-enable-contributor-access-for-a-viewer.md]

### Git Intelligence Summary

- Recent commits added user management, viewer invites, and contributor access; avoid regressions in Auth.js role checks and `{ data, error }` response shape. [Source: git log -5]
- Trip access helper is currently membership-only; use it for access checks, but list queries should pull from `TripAccess` directly for performance. [Source: travelblogs/src/utils/trip-access.ts]

### Latest Tech Information

- Web research not performed due to network restrictions; use pinned versions and patterns in `_bmad-output/project-context.md`.

### Project Context Reference

- App Router only; REST endpoints plural; API responses wrapped `{ data, error }` with `{ error: { code, message } }`.
- Tests live in `tests/` (no co-located tests) and JSON fields are `camelCase`.
- Do not introduce Docker/TLS proxy in MVP tasks.

### Story Completion Status

- Status: done
- Completion note: Viewer trip access is implemented, reviewed, and verified with targeted tests.

### Project Structure Notes

- API routes live under `travelblogs/src/app/api` and must be plural.
- Components live under `travelblogs/src/components/<feature>/`.
- Tests live under `travelblogs/tests/` (no co-located tests).

### References

- Epic and acceptance criteria: `_bmad-output/epics.md`
- Architecture and patterns: `_bmad-output/architecture.md`
- Project rules: `_bmad-output/project-context.md`
- UX design system: `_bmad-output/ux-design-specification.md`
- Trip list API: `travelblogs/src/app/api/trips/route.ts`
- Trips page: `travelblogs/src/app/trips/page.tsx`
- Trip access helper: `travelblogs/src/utils/trip-access.ts`

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Implementation Plan

- Gate trip list API by `token.role` and return viewer lists via `TripAccess`.
- Update trips page header/actions/empty states by session role.
- Add API + component tests for viewer list and empty state coverage.

### Debug Log References

### Completion Notes List

- Implemented viewer-aware list handling in `GET /api/trips`, preserving creator ownership behavior and role-based errors.
- Updated trips page copy/actions for viewer read-only list/empty states.
- Added API and component tests; ran `npm test`.
- Tightened creator role checks for trip mutations and blocked inactive accounts in trip listing.
- Added viewer inactive list guard and unknown-role UI fallback coverage.
- Noted tooling artifacts in git status (`.codex/*`, validation report) as non-story outputs.
- Expanded creator trip list to include trips they are invited to (deduped, ordered by updatedAt).

### File List

- _bmad-output/implementation-artifacts/5-6-viewer-access-to-invited-trips.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- travelblogs/src/app/api/trips/route.ts
- travelblogs/src/app/api/trips/[id]/route.ts
- travelblogs/src/app/trips/page.tsx
- travelblogs/tests/api/trips/list-trips.test.ts
- travelblogs/tests/api/trips/create-trip.test.ts
- travelblogs/tests/api/trips/update-trip.test.ts
- travelblogs/tests/api/trips/delete-trip.test.ts
- travelblogs/tests/components/trips-page.test.tsx

## Change Log

- 2026-01-03: Enabled viewer trip list access + viewer trips UI gating; added tests.
- 2026-01-03: Fixed creator role checks for trip mutations, added inactive-user trip list guard, and updated tests/UI fallback.
- 2026-01-03: Included invited trips in creator list responses.
