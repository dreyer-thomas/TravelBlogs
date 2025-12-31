# Story 5.10: Refine Viewer Invitations with Custom Selector

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want to select invitees from a themed selector and manage the invited list,
so that inviting viewers is faster and mistakes are easy to undo.

## Acceptance Criteria

1. **Given** I am a creator viewing a trip I own
   **When** I open the invite selector
   **Then** I can choose from all active viewers and creators
   **And** already invited users are not shown in the selector
2. **Given** I am viewing the invited users list
   **When** I remove an invited user
   **Then** the user is removed from the list
   **And** they can no longer access the trip
3. **Given** I am inviting a user
   **When** I interact with the selector
   **Then** the selector matches the application's custom share panel styling

## Tasks / Subtasks

- [x] Add eligible invitees API (AC: 1)
  - [x] Add a creator-only endpoint to list eligible invitees (active viewers + creators)
  - [x] Exclude the trip owner and already invited users from the response
  - [x] Return consistent `{ data, error }` shape with ISO dates
- [x] Update invite API to accept selector choice (AC: 1)
  - [x] Accept `userId` from the selector (keep email-based invites only if still needed)
  - [x] Allow inviting active creators and viewers
  - [x] Preserve idempotent behavior on repeated invites
- [x] Add removal API endpoint (AC: 2)
  - [x] Implement `DELETE /api/trips/:id/viewers/:userId` for trip owners
  - [x] Return `404` for missing invites and `403` for unauthorized access
- [x] Update trip detail share panel UI (AC: 1, 2, 3)
  - [x] Replace email input with a themed custom select matching existing share panel styles
  - [x] Show invitee name + email in the selector
  - [x] Filter out already invited users from selector options
  - [x] Add remove actions in the invited users list with confirmable affordance
- [x] Add tests (AC: 1, 2)
  - [x] API tests for eligible invitee list, invite by userId, and removal
  - [x] Component tests for selector filtering and invited-user removal

## Dev Notes

### Developer Context

- Story 5.4 added viewer invites with email input and a list of invited viewers; this story upgrades that flow.
- Creator-only gating and ownership checks should stay consistent with existing trip invite endpoints.
- Existing access checks for invited viewers should remain unchanged after invite removal.

### Epic Context (Epic 5)

- Objective: complete Phase 2 account + role management, including viewer access and contributor permissions.
- Related stories: 5.4 Invite viewers to a trip; 5.5 Enable contributor access; 5.6 Viewer access to invited trips.
- Business value: faster invite management with fewer errors and easier cleanup.

### Cross-Story Dependencies & Prerequisites

- Requires TripAccess model and invite endpoints from Story 5.4.
- Requires active users from Story 5.1 and role assignments from Story 5.3.

### Reuse Guidance (Avoid Reinvention)

- Reuse share panel layout and typography patterns in `travelblogs/src/components/trips/trip-detail.tsx`.
- Reuse API error formatting and Auth.js token gating used in `travelblogs/src/app/api/trips/[id]/viewers/route.ts`.
- Reuse existing list item styling for invited viewers to keep the UI consistent.

### Project Structure Notes

- API routes live under `travelblogs/src/app/api` only; keep trip viewer endpoints together.
- UI changes should remain in `travelblogs/src/components/trips/`.
- Tests belong under `travelblogs/tests/` (no co-located tests).

### References

- Epic requirements and acceptance criteria: `_bmad-output/epics.md`
- UX and visual language guidance: `_bmad-output/ux-design-specification.md`
- Project-wide rules: `_bmad-output/project-context.md`
- Trip share UI: `travelblogs/src/components/trips/trip-detail.tsx`
- Invite API: `travelblogs/src/app/api/trips/[id]/viewers/route.ts`
- Prisma schema: `travelblogs/prisma/schema.prisma`

### Technical Requirements

- Eligible invitees must include active users with `viewer` or `creator` roles.
- The trip owner should never be included in the eligible invitee list.
- The invite selector must exclude already invited users without relying on manual filtering by the user.
- Invite removal must revoke access immediately for removed users.
- Responses must keep `{ data, error }` format with `{ error: { code, message } }` on failure.

### Architecture Compliance

- App Router only; API routes under `src/app/api`.
- Use Prisma 7.2.0 + SQLite via existing `prisma` client.
- Use Zod 4.2.1 for request validation.
- JSON fields are `camelCase`.

### Library/Framework Requirements

- Next.js App Router + TypeScript.
- Auth.js (NextAuth) 4.24.13 JWT sessions with `token.sub`, `token.role`.
- Prisma 7.2.0 + SQLite.
- Zod 4.2.1 for server-side validation only.

### File Structure Requirements

- API routes: `travelblogs/src/app/api/trips/[id]/viewers/route.ts` (extend) and a new removal endpoint.
- Trip UI updates: `travelblogs/src/components/trips/trip-detail.tsx`.
- Tests under `travelblogs/tests/api/trips/` and `travelblogs/tests/components/`.

### Testing Requirements

- API tests for eligible invitee listing, creator+viewer invites, and removal permissions.
- Component tests for selector filtering and remove action.

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

 - Implementation plan: add eligible invitees endpoint listing active creators/viewers, excluding owner + existing invites.
 - Tests: `npm test -- --run tests/api/trips/viewers.test.ts`.
 - Tests: `npm test`.
 - Tests: `npm run lint`.
 - Implementation plan: accept `userId` on invites and allow creator/viewer roles.
 - Tests: `npm test -- --run tests/api/trips/viewers.test.ts`.
 - Tests: `npm test`.
 - Tests: `npm run lint`.
 - Implementation plan: add removal endpoint for trip owner invites.
 - Tests: `npm test -- --run tests/api/trips/viewers.test.ts`.
 - Tests: `npm test`.
 - Tests: `npm run lint`.
 - Implementation plan: refresh share panel with invitee selector and remove affordance.
 - Tests: `npm test -- --run tests/components/trip-share-panel.test.tsx`.
 - Tests: `npm test`.
 - Tests: `npm run lint`.
 - Tests: `npm test`.
 - Tests: `npm run lint`.
 - Updated invite selector to custom dropdown styling.
 - Tests: `npm test -- --run tests/components/trip-share-panel.test.tsx`.

### Completion Notes List

 - Added eligible invitees endpoint for active creators/viewers, excluding owners and existing invites.
 - Added API coverage for eligible invitees listing.
 - Added invite support for userId-based selection and creator roles while keeping idempotency.
 - Added invite removal endpoint with authorization and missing-invite handling.
 - Updated share panel to use invitee selector, filter already invited users, and add remove confirmations.
 - Verified API and component test coverage for invite selection and removal flows.
 - Replaced native select with custom invitee dropdown matching share panel styling.
 - Hardened creator checks to use token role and owner id for invite operations.
 - Prevented stale invite selections and added tests for userId invite errors and eligible auth.
 - Noted unrelated working tree changes outside this story scope during review.

### File List

 - _bmad-output/implementation-artifacts/5-10-refine-viewer-invitations-with-custom-selector.md
 - _bmad-output/implementation-artifacts/sprint-status.yaml
 - travelblogs/src/app/api/trips/[id]/viewers/eligible/route.ts
 - travelblogs/src/app/api/trips/[id]/viewers/route.ts
 - travelblogs/src/app/api/trips/[id]/viewers/[userId]/route.ts
 - travelblogs/src/components/trips/trip-detail.tsx
 - travelblogs/tests/api/trips/viewers.test.ts
 - travelblogs/tests/components/trip-share-panel.test.tsx

## Change Log

- 2025-02-14: Added eligible invitee listing, selector-driven invites, removal endpoint, and share panel updates with tests.
- 2025-12-31: Hardened invite access checks, selector validation, and added review test coverage.
