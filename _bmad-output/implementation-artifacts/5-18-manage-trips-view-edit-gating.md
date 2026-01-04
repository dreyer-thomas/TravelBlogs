# Story 5.18: Provide Edit Button Only for Editors

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want the Edit button shown only to users who can edit a trip,
so that view-only users cannot access trip edit flows.

## Acceptance Criteria

1. **Given** I view the Manage Trips list for a trip I own  
   **When** the trip row renders  
   **Then** I see the Edit button alongside View
2. **Given** I view the Manage Trips list for a trip where I am a contributor  
   **When** the trip row renders  
   **Then** I see the Edit button alongside View
3. **Given** I view the Manage Trips list for a trip where I am a viewer only  
   **When** the trip row renders  
   **Then** the Edit button is hidden  
   **And** I cannot open the trip edit flow from the list

## Tasks / Subtasks

- [ ] Ensure edit permissions are computed correctly (AC: 1-3)
  - [ ] Confirm list API sets `canEditTrip` for owners and contributors only
  - [ ] Ensure view-only access never sets `canEditTrip` true
- [ ] Update Manage Trips UI gating (AC: 1-3)
  - [ ] Show Edit button only when `canEditTrip === true`
  - [ ] Keep View button available for all with trip access
  - [ ] Prevent any list interaction from opening edit for view-only users
- [ ] Add/adjust tests (AC: 1-3)
  - [ ] Component tests for Edit visibility in trip cards
  - [ ] API test verifying `canEditTrip` mapping for contributors vs viewers

## Dev Notes

- Trip list API already returns `canEditTrip` based on ownership and `TripAccess.canContribute`; verify this remains the source of truth. [Source: travelblogs/src/app/api/trips/route.ts]
- Trip cards render View and Edit buttons; Edit should remain gated by `canEditTrip`. [Source: travelblogs/src/components/trips/trip-card.tsx]
- Manage Trips page passes `canEditTrip` into each card from the list API. [Source: travelblogs/src/app/trips/page.tsx]

### Technical Requirements

- A user can edit a trip if they are the trip owner or have `TripAccess.canContribute === true`.
- View-only users must not see the Edit button and must not be able to open `/trips/[tripId]/edit` from the list.
- API responses must remain `{ data, error }` with `{ error: { code, message } }` and ISO timestamps.

### UX Requirements

- View remains the primary action in trip cards.
- Edit remains secondary and only appears for users with edit rights.

### Architecture Compliance

- App Router only; API routes under `src/app/api`.
- Use Prisma 7.2.0 + SQLite models; no schema changes required.
- Use Zod 4.2.1 for request validation (server-side only).

### Library/Framework Requirements

- Next.js App Router + TypeScript.
- Auth.js (NextAuth) 4.24.13 JWT sessions with `token.sub`, `token.role`.
- Prisma 7.2.0 + SQLite.

### File Structure Requirements

- Trip list API: `travelblogs/src/app/api/trips/route.ts`.
- Manage Trips page: `travelblogs/src/app/trips/page.tsx`.
- Trip card UI: `travelblogs/src/components/trips/trip-card.tsx`.
- Tests: `travelblogs/tests/api/trips/`, `travelblogs/tests/components/`.

### Testing Requirements

- Component tests:
  - Edit button visible for owner and contributor trips.
  - Edit button hidden for view-only trips.
- API tests:
  - `GET /api/trips` returns `canEditTrip` true for owners and contributors.
  - `GET /api/trips` returns `canEditTrip` false for viewers without `canContribute`.

### Previous Story Intelligence

- Story 5.12 introduced View/Edit actions on trip cards; keep View primary and Edit gated by access. [Source: _bmad-output/implementation-artifacts/5-12-shared-view-button.md]
- Story 5.6 established viewer access gating; do not regress read-only protections. [Source: _bmad-output/implementation-artifacts/5-6-viewer-access-to-invited-trips.md]

### Git Intelligence Summary

- Recent commits touched trip list and share-view entry points; verify Edit gating remains consistent with `canEditTrip`. [Source: git log -5]

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

- API routes live under `travelblogs/src/app/api` and must be plural.
- Components live under `travelblogs/src/components/<feature>/`.
- Tests live under `travelblogs/tests/` (no co-located tests).

### References

- Epic and acceptance criteria: `_bmad-output/epics.md`
- Architecture and patterns: `_bmad-output/architecture.md`
- Project rules: `_bmad-output/project-context.md`
- Trip list API: `travelblogs/src/app/api/trips/route.ts`
- Trip card UI: `travelblogs/src/components/trips/trip-card.tsx`
- Manage trips page: `travelblogs/src/app/trips/page.tsx`

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Drafted manage-trips edit gating story with owner/contributor permissions.
- Anchored UI gating to `canEditTrip` from list API and mapped test coverage.
- Referenced existing trip list and card components for implementation scope.

### File List

- _bmad-output/implementation-artifacts/5-18-manage-trips-view-edit-gating.md
