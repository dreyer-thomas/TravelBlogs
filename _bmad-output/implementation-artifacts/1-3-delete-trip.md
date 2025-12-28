# Story 1.3: Delete Trip

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want to delete a trip,
so that I can remove trips I no longer want to keep.

## Acceptance Criteria

1. **Given** I am a creator viewing a trip I own  
   **When** I choose delete and confirm the action  
   **Then** the trip is removed from my trip list  
   **And** I can no longer access its entries
2. **Given** I initiate delete and cancel the confirmation  
   **When** I return to the trip view  
   **Then** the trip remains unchanged

## Tasks / Subtasks

- [x] Add delete-trip API endpoint (AC: 1)
  - [x] Implement `DELETE /api/trips/[id]` in `src/app/api/trips/[id]/route.ts`
  - [x] Require creator session and enforce ownership (per-trip ACL)
  - [x] Return `{ data, error }` with `{ error: { code, message } }` on failures
  - [x] If related data exists (entries/share links), delete via cascade or transaction-safe cleanup
- [x] Add delete flow in trip UI (AC: 1, 2)
  - [x] Add a destructive "Delete trip" button on `src/app/trips/[id]/page.tsx`
  - [x] Show confirmation modal with clear cancel/confirm actions
  - [x] On confirm, call delete API and redirect to `/trips`
  - [x] On cancel, close modal with no data changes
- [x] Update trip list state after deletion (AC: 1)
  - [x] Ensure the deleted trip is removed from list state (Redux or local fetch revalidation)
- [x] Tests (AC: 1, 2)
  - [x] API tests under `tests/api/` for success, unauthorized, not-owner, not-found
  - [x] Component test for confirmation modal behavior if component test harness exists

## Dev Notes

### Developer Context

- Trip creation and list views are already implemented in Epic 1.2; deletion must integrate without refactors.
- Deletion is creator-only; viewers should never see delete controls.
- Ensure delete is a destructive action with a clear confirmation step (UX rule).
- Regression guardrail: do not rename or restructure existing trip routes or auth/session utilities.

### Technical Requirements

- **API:** `DELETE /api/trips/[id]` using App Router route handlers.
- **Auth:** Require creator session; verify ownership using session user id.
- **Data:** Use Prisma to delete by id + ownerId; if related rows exist, delete in a transaction or rely on `onDelete: Cascade`.
- **Error format:** `{ data: null, error: { code, message } }` on failures (e.g., `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`).
- **Dates:** If returned, serialize as ISO 8601 strings.

### Architecture Compliance

- REST endpoints are plural (`/trips`) with `:id` params.
- Responses always wrapped `{ data, error }`.
- Naming: `camelCase` vars/JSON, `PascalCase` components, `kebab-case.tsx` files.
- Tests live under `tests/` only (no co-located tests).
- Use `src/utils/` for shared helpers; avoid adding `lib/`.

### Library/Framework Requirements

- Next.js App Router + TypeScript (existing).
- Prisma 7.2.0 with SQLite (existing).
- Zod 4.2.1 for any request validation (server-side only).
- Auth.js (NextAuth) 4.24.13 with JWT sessions for auth checks.
- Redux Toolkit 2.11.2 if updating list state via store.

### File Structure Requirements

- API: `src/app/api/trips/[id]/route.ts` (DELETE handler).
- UI: `src/app/trips/[id]/page.tsx` plus `src/components/trips/` for any modal wrapper.
- Store: `src/store/trips/trips-slice.ts` if list state updates are required.
- Tests: `tests/api/trips/delete-trip.test.ts`, `tests/components/trips/delete-trip-modal.test.tsx` (if applicable).

### Testing Requirements

- API tests for success, unauthorized, forbidden (not owner), not found.
- If a component test harness exists, validate modal confirm/cancel behavior.
- Ensure tests assert `{ data, error }` and `{ error: { code, message } }`.

### UX Requirements

- Destructive action styling (clay red) with confirmation modal.
- Cancel should be safe and primary action should be clearly labeled.
- Maintain 44x44 touch targets and visible focus states.

### Project Structure Notes

- App lives under `travelblogs/` with `src/` directory.
- Keep `.env` and `.env.example` in app root; do not introduce `.env.local`.
- No Docker/TLS proxy changes in MVP.

### References

- Story source: `_bmad-output/epics.md` (Epic 1, Story 1.3)
- Architecture rules: `_bmad-output/architecture.md` (API patterns, structure, stack)
- UX patterns: `_bmad-output/ux-design-specification.md` (destructive actions, modals, accessibility)
- Previous story context: `_bmad-output/implementation-artifacts/1-2-create-trip.md`
- Global rules: `_bmad-output/project-context.md`

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

N/A

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Web research skipped due to restricted network access.
- Git history unavailable (no commits yet).
- Previous story intelligence applied from 1.2 (Trip model, API patterns, UI routes).
- Implemented DELETE trip endpoint with auth, ownership checks, and standardized error responses.
- Added delete trip modal and wired redirect to `/trips` after confirmation.
- Added API delete-trip coverage; component test skipped because no component harness exists.
- Tests run: `npx vitest run tests/api/trips/delete-trip.test.ts`, `npm test`.
- Lint run: `npm run lint`.
- Review fixes: added transaction-safe cleanup hooks, standardized 500 error response, and reset modal state on cancel/open.

### File List

- `_bmad-output/implementation-artifacts/1-3-delete-trip.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `travelblogs/src/app/api/trips/[id]/route.ts`
- `travelblogs/src/app/trips/[id]/page.tsx`
- `travelblogs/src/components/trips/delete-trip-modal.tsx`
- `travelblogs/tests/api/trips/delete-trip.test.ts`

### Change Log

- 2025-12-21: Implemented trip deletion API, UI confirmation modal, and API tests.
- 2025-12-22: Review fixes for delete trip cleanup, error handling, and modal state.

## Completion Checklist

- [ ] `DELETE /api/trips/[id]` implements auth + ownership checks
- [ ] Trip delete confirmation modal works with cancel/confirm flows
- [ ] Deleted trip no longer appears in list and is inaccessible
- [ ] Tests added for API and UI as applicable
