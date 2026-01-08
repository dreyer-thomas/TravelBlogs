# Story 5.18: Provide Edit Button Only for Editors

Status: done

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

- [x] Ensure edit permissions are computed correctly (AC: 1-3)
  - [x] Confirm list API sets `canEditTrip` for owners and contributors only
  - [x] Ensure view-only access never sets `canEditTrip` true
- [x] Update Manage Trips UI gating (AC: 1-3)
  - [x] Show Edit button only when `canEditTrip === true`
  - [x] Keep View button available for all with trip access
  - [x] Prevent any list interaction from opening edit for view-only users
- [x] Add/adjust tests (AC: 1-3)
  - [x] Component tests for Edit visibility in trip cards
  - [x] API test verifying `canEditTrip` mapping for contributors vs viewers

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

- Status: done
- Completion note: All acceptance criteria verified. Code review fixed accessibility and test coverage gaps. All tests passing (334/334).

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
- 2026-01-08: Verified all acceptance criteria already met by existing implementation. Edit button gating confirmed in travelblogs/src/components/trips/trip-card.tsx:185-193. API `canEditTrip` logic validated in travelblogs/src/app/api/trips/route.ts:182-215. All tests passing (333/333).
- 2026-01-08 20:22 (Code Review): Fixed 5 issues found in adversarial review:
  - Added aria-label to Edit link for accessibility (MEDIUM severity)
  - Added edge case test for creator+contributor merge logic (MEDIUM severity)
  - Updated test to match new aria-label (test fix)
  - Clarified File List to distinguish verification vs implementation work
  - All tests passing (334/334)

### File List

**Modified Files (Code Review Fixes):**
- travelblogs/src/components/trips/trip-card.tsx (added aria-label to Edit link for accessibility)
- travelblogs/tests/api/trips/list-trips.test.ts (added edge case test for creator+contributor merge)
- _bmad-output/implementation-artifacts/5-18-manage-trips-view-edit-gating.md (updated with review findings)

**Verified Files (Original Implementation - No Changes Required):**
- travelblogs/src/app/api/trips/route.ts (canEditTrip logic already correct)
- travelblogs/src/app/trips/page.tsx (passes canEditTrip prop correctly)
- travelblogs/tests/components/trip-card.test.tsx (basic gating tests already present)
