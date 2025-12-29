# Story 5.4: Invite Viewers to a Trip

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want to invite specific users to a trip as viewers,
so that only chosen people can access it.

## Acceptance Criteria

1. **Given** I am a creator viewing a trip I own
   **When** I invite an existing user as a viewer
   **Then** the user is added to the trip's viewer list
   **And** they can access the trip once signed in
2. **Given** I invite a user who does not exist
   **When** I submit the invite
   **Then** I see a clear error
   **And** the invite is not created

## Tasks / Subtasks

- [x] Add trip viewer access model (AC: 1)
  - [x] Add a join model for trip access (e.g., `TripAccess`) with `tripId`, `userId`, `canContribute` (default false), `createdAt`
  - [x] Enforce unique constraint on `tripId + userId`
  - [x] Create Prisma migration and update schema
- [x] Create invite API endpoints (AC: 1, 2)
  - [x] Add `GET /api/trips/:id/viewers` to list invited viewers for the trip (creator-only, owner-only)
  - [x] Add `POST /api/trips/:id/viewers` to invite a viewer by email
  - [x] Validate request with Zod (email required, normalized to lowercase)
  - [x] Return `{ data, error }` with `{ error: { code, message } }` on failures
  - [x] If user not found or inactive, return `404 NOT_FOUND` with a clear message
  - [x] If user exists but is not a viewer, return `400 VALIDATION_ERROR`
  - [x] If viewer already invited, return existing entry (idempotent) rather than creating duplicates
- [x] Allow invited viewers to access the trip content (AC: 1)
  - [x] Update trip detail and entries access checks to allow invited viewers
  - [x] Keep creator-only behavior for write actions
- [x] Add invite UI to trip detail (AC: 1, 2)
  - [x] Extend `src/components/trips/trip-detail.tsx` share panel to include an "Invite viewers" section
  - [x] Display current invited viewers (name + email)
  - [x] Provide email input + invite button
  - [x] Show validation errors inline, consistent with existing share panel styling
- [x] Add tests (AC: 1, 2)
  - [x] API tests: invite success, invite unknown user, invite non-viewer, idempotent invite, access list gated to creator + trip owner
  - [x] API tests: viewer access allowed for invited trip detail and entries
  - [x] Component tests: invite panel renders, sends invite, shows errors, and lists invited viewers

## Dev Notes

### Developer Context

- Epic 5 introduces user accounts, roles, and per-trip access control. This story is the first piece of per-trip access (viewer invites).
- Current access checks are creator-only for trip CRUD and entries write; viewer read access must be gated by trip membership.
- Creator account is still the admin gate (`token.sub === "creator"`). Viewer accounts use their Prisma `User.id` as `token.sub`.
- Trip sharing via token already exists; invited viewers are separate from public share links.

### Epic Context (Epic 5)

- Objective: complete Phase 2 account + role management, including viewer access and contributor permissions.
- Related stories: 5.1 Admin creates users; 5.2 User sign-in; 5.3 Admin changes user role; 5.5 Enable contributor access; 5.6 Viewer access to invited trips; 5.7 Contributor adds/edits entries; 5.8 Admin deactivates user.
- Business value: creators can safely share trips with known viewers without public links.

### Cross-Story Dependencies & Prerequisites

- Requires user accounts from 5.1 and sign-in from 5.2 (viewer users already exist in DB).
- Builds the data model needed for 5.5 (contributor flag) and 5.6 (viewer trip list).

### Reuse Guidance (Avoid Reinvention)

- Reuse JSON error shape and Zod validation patterns from `src/app/api/trips/[id]/route.ts` and `src/app/api/users/[id]/route.ts`.
- Reuse admin/creator gating pattern (`token.sub === "creator"`) from existing admin APIs.
- Reuse share panel layout, button styling, and inline error treatment in `src/components/trips/trip-detail.tsx`.

### Project Structure Notes

- API routes live under `src/app/api` only; use plural paths like `/trips/:id/viewers`.
- Components live under `src/components/<feature>/` (trip UI in `src/components/trips/`).
- Tests live under `tests/` (no co-located tests).
- Shared helpers belong in `src/utils/`; avoid adding `lib/`.

### References

- Epic requirements and acceptance criteria: `_bmad-output/epics.md`
- Architecture decisions and patterns: `_bmad-output/architecture.md`
- UX specs for share/invite behavior and hierarchy: `_bmad-output/ux-design-specification.md`
- Project-wide rules: `_bmad-output/project-context.md`
- Trip detail + share UI: `travelblogs/src/components/trips/trip-detail.tsx`
- Trip API patterns: `travelblogs/src/app/api/trips/route.ts`, `travelblogs/src/app/api/trips/[id]/route.ts`
- Share link API patterns: `travelblogs/src/app/api/trips/[id]/share-link/route.ts`
- User role validation patterns: `travelblogs/src/app/api/users/[id]/route.ts`
- Prisma schema: `travelblogs/prisma/schema.prisma`

### Technical Requirements

- Add a `TripAccess` (or equivalent) model that maps a `User` to a `Trip` with `canContribute` boolean.
- Enforce unique membership per user per trip; treat repeated invites as idempotent.
- Invite request body shape: `{ email: string }` (lowercase + trimmed).
- Only the trip owner (creator) can invite; return `403 FORBIDDEN` otherwise.
- Response format must be `{ data, error }` with `{ error: { code, message } }`.
- Viewer access should be read-only; keep creator-only checks for create/update/delete endpoints.
- Dates returned from API must be ISO 8601 strings.

### Architecture Compliance

- App Router only; API routes under `src/app/api`.
- Use Prisma 7.2.0 + SQLite via existing `prisma` client.
- Use Zod 4.2.1 for request validation.
- Use async/await (no raw Promise chains).
- JSON fields are `camelCase`.

### Library/Framework Requirements

- Next.js App Router + TypeScript.
- Auth.js (NextAuth) 4.24.13 JWT sessions with `token.sub`, `token.role`.
- Prisma 7.2.0 + SQLite.
- Zod 4.2.1 for server-side validation only.

### File Structure Requirements

- Prisma schema update: `travelblogs/prisma/schema.prisma`.
- New API routes: `travelblogs/src/app/api/trips/[id]/viewers/route.ts` (and any subroutes if needed).
- Trip UI updates: `travelblogs/src/components/trips/trip-detail.tsx`.
- Tests under `travelblogs/tests/api/trips/` and `travelblogs/tests/components/`.

### Testing Requirements

- API tests for invite creation, unknown user, non-viewer user, and idempotent invites.
- API tests that invited viewers can read trip details and entries while non-invited viewers are blocked.
- Component tests for invite panel interaction and error display.

### Previous Story Intelligence

- Admin gating remains `token.sub === "creator"`; keep this consistent for invite endpoints.
- User creation and role changes are already implemented; do not change user creation flow.
- Admin UI styling patterns (small caps, muted text) should guide invite UI styling for consistency.

### Git Intelligence Summary

- Recent commits added admin user management and sign-in (Auth.js + Prisma user model).
- Avoid regressions in admin dashboard layout and auth callbacks that set `session.user.role`.
- Tests are Vitest-based and use Prisma test databases with `prisma migrate deploy` in setup.

### Latest Tech Information

- Web research not performed (network restricted); use versions pinned in `_bmad-output/project-context.md`.

### Project Context Reference

- Follow `_bmad-output/project-context.md` for naming conventions, response formats, API routing, and test location rules.

### Story Completion Status

- Status: review
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

 - Added TripAccess schema + migration; verified unique trip+user constraint via model test.
 - Tests: `npm test`.
 - Added trip viewer invite/list API; validated auth, ownership, and idempotency.
 - Tests: `npm test`.
 - Enabled invited viewer read access for trip detail and entries; tightened unauthenticated entry access.
 - Tests: `npm test`.
 - Added invite viewers UI in trip share panel with list + inline errors.
 - Tests: `npm test`.
 - Added tests for invite API, invited viewer access, and invite UI.
 - Tests: `npm test`.
 - Swapped invite email input for viewer selector fed by active viewer list.
 - Tests: `npm test`.
 - Allowed creators to be invited; viewer list includes all active users.
 - Tests: `npm test`.
 - Added viewer removal API + UI with per-user remove action.
 - Tests: `npm test`.
 - Filtered invite selector to hide already invited users.
 - Tests: `npm test`.
 - Restored viewer-only invite validation and removed creator invites.
 - Tests: not run.
 - Replaced viewer selector with email invite input; removed viewer removal API/UI.
 - Tests: not run.

### Completion Notes List

 - Added TripAccess join model with unique constraint and default canContribute=false; added model test and migration.
 - Added trip viewers API endpoints with validation, idempotent invites, and viewer list responses.
 - Allowed invited viewers to read trip detail and entries; updated access checks and tests.
 - Added invite viewer UI section in trip detail share panel.
 - Added API and component coverage for viewer invites and access.
 - Updated invite UI to use active viewer selection list (name + email).
 - Expanded invite support to include creators.
 - Added ability to remove invited users from a trip.
 - Filtered invite dropdown to exclude already invited users.
 - Enforced viewer-only invites and reverted invite UI to email input; removed viewer removal.

### File List

- travelblogs/prisma/schema.prisma
- travelblogs/prisma/migrations/20251229204603_add_trip_access/migration.sql
- travelblogs/tests/api/trips/trip-access-model.test.ts
- travelblogs/src/app/api/trips/[id]/viewers/route.ts
- travelblogs/tests/api/trips/viewers.test.ts
- travelblogs/src/utils/trip-access.ts
- travelblogs/src/app/api/trips/[id]/route.ts
- travelblogs/src/app/api/entries/route.ts
- travelblogs/src/app/api/entries/[id]/route.ts
- travelblogs/src/app/api/trips/[id]/overview/route.ts
- travelblogs/tests/api/entries/list-entries.test.ts
- travelblogs/tests/api/entries/get-entry.test.ts
- travelblogs/tests/api/trips/trip-overview.test.ts
- travelblogs/tests/api/trips/trip-detail-access.test.ts
- travelblogs/src/components/trips/trip-detail.tsx
- travelblogs/tests/components/trip-share-panel.test.tsx
- travelblogs/src/app/api/trips/[id]/viewers/[userId]/route.ts

## Change Log

- 2025-12-29: Added trip viewer invites, access checks, UI updates, and tests.
- 2025-12-29: Replaced invite email input with active viewer selector.
- 2025-12-29: Allow inviting creators and show all active users.
- 2025-12-29: Added invited user removal (API + UI).
- 2025-12-29: Filter invite selector to exclude already invited users.
