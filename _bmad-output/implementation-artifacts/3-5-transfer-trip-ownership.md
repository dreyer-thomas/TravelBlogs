# Story 3.5: Transfer Trip Ownership

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a trip owner or administrator,
I want to transfer ownership of a trip to another active creator or administrator,
so that trip stewardship can move to the right person.

## Acceptance Criteria

1. **Given** I am the trip owner or an administrator  
   **When** I open Trip Actions  
   **Then** I see a "Transfer ownership" action
2. **Given** I open the transfer action  
   **When** I view the selection list  
   **Then** I can only select active users with role `creator` or `administrator`
3. **Given** I select an eligible user and confirm  
   **When** the transfer completes  
   **Then** the trip owner is updated to the selected user  
   **And** the trip remains accessible to the new owner
4. **Given** I am not the trip owner and not an administrator  
   **When** I attempt to transfer ownership  
   **Then** the action is forbidden with an owner-or-admin error
5. **Given** the target user is inactive or not a creator/administrator  
   **When** I attempt to transfer ownership  
   **Then** the action is blocked with a clear validation error

## Tasks / Subtasks

- [x] Add API endpoint to transfer trip ownership (AC: 3, 4, 5)
  - [x] Add route under `src/app/api/trips/[id]/transfer-ownership/route.ts`
  - [x] Require owner or administrator role
  - [x] Validate target user is active and role is `creator` or `administrator`
  - [x] Update trip ownerId to target user id
  - [x] Return `{ data, error }` with `{ error: { code, message } }`
- [x] Add UI control in Trip Actions (AC: 1, 2, 3)
  - [x] Add "Transfer ownership" action in trip actions area
  - [x] Show list of eligible active creators/administrators only
  - [x] Confirm transfer before saving
- [x] Add tests (AC: 1-5)
  - [x] API tests for owner/admin allowed and others forbidden
  - [x] API tests for inactive/invalid target rejected
  - [x] UI test for selector only showing eligible users

## Dev Notes

- **Trip actions UI:** Use the existing trip actions surface (same area as share/revoke).
- **Auth checks:** Owner-or-admin checks should reuse existing role helpers.
- **Eligibility rules:** Target must be active and role in `creator` or `administrator`.
- **Error format:** All API responses must remain `{ data, error }` with `{ error: { code, message } }`.

### Library & Framework Requirements

- Next.js App Router only; API routes live under `src/app/api`.
- Auth.js (NextAuth) 4.24.13 with JWT sessions; reuse existing token role checks.
- Prisma 7.2.0 + SQLite; `Trip` owner stored as `ownerId`.

### Project Structure Notes

- UI: `travelblogs/src/components/trips/` and trip detail/overview pages.
- API: `travelblogs/src/app/api/trips/[id]/transfer-ownership/route.ts`
- Tests: `travelblogs/tests/` (no co-located tests)

### Testing Requirements

- Add or update tests under `travelblogs/tests/` only (no co-located tests).
- Ensure error responses assert `{ data, error }` with `{ error: { code, message } }`.

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

- N/A

### Completion Notes List

- ✅ Implemented transfer ownership API with eligible-owner listing and validations; added trip actions modal to confirm transfers.
- ✅ Tests: `tests/api/trips/transfer-ownership.test.ts`, `tests/components/trip-detail.test.tsx`.
- ✅ Allowed administrators to access trip detail without invite and blocked inactive sessions before rendering.

### File List

- `.codex/history.jsonl`
- `.codex/log/codex-tui.log`
- `.codex/sessions/2026/01/07/rollout-2026-01-07T21-47-00-019b9a36-7c73-7160-86da-7c99e61067eb.jsonl`
- `.codex/sessions/2026/01/07/rollout-2026-01-07T22-54-21-019b9a74-260d-79e0-94f8-301ed728e43d.jsonl`
- `.codex/sessions/2026/01/07/rollout-2026-01-07T23-16-49-019b9a88-b7e8-71c3-9c8b-8b247e4541c8.jsonl`
- `_bmad-output/implementation-artifacts/3-5-transfer-trip-ownership.md`
- `_bmad-output/epics.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/5-15-shared-view-hero-image.md`
- `travelblogs/src/app/api/trips/[id]/route.ts`
- `travelblogs/src/app/api/trips/[id]/transfer-ownership/route.ts`
- `travelblogs/src/app/trips/[tripId]/page.tsx`
- `travelblogs/src/components/trips/trip-detail.tsx`
- `travelblogs/src/utils/entry-reader.ts`
- `travelblogs/tests/api/trips/transfer-ownership.test.ts`
- `travelblogs/tests/api/trips/trip-detail-access.test.ts`
- `travelblogs/tests/components/shared-entry-page.test.tsx`
- `travelblogs/tests/components/trip-detail.test.tsx`

### Change Log

- 2026-01-07: Story created.
- 2026-01-07: Implemented transfer ownership API/UI with tests; status set to review.
- 2026-01-07: Fixed admin access gating and inactive session guard; status set to done.
