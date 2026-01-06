# Story 0.3: Deactivate Creator Account

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an administrator,
I want to deactivate or reactivate the default creator account configured in `.env`,
so that access can be suspended or restored without removing the configured credentials.

## Acceptance Criteria

1. **Given** `CREATOR_EMAIL` and `CREATOR_PASSWORD` are set in `.env`  
   **When** I open Manage Users  
   **Then** I see a "Default creator" user row with the configured email, active/inactive status, and a toggle action
2. **Given** I am signed in as an administrator who is not the default creator  
   **When** I deactivate the default creator  
   **Then** the status updates to inactive  
   **And** sign-in with the `.env` credentials is blocked with the standard inactive account error
3. **Given** the default creator is inactive  
   **When** I activate the account from Manage Users  
   **Then** the creator can sign in again using the `.env` credentials
4. **Given** the default creator is the last active admin  
   **When** I attempt to deactivate the account  
   **Then** the action is blocked with a clear error explaining at least one active admin is required
5. **Given** I am signed in as the default creator  
   **When** I view my own row in Manage Users  
   **Then** the deactivate/activate control is disabled to prevent self-deactivation
6. **Given** I am signed in as a creator (non-administrator)  
   **When** I attempt to change the default creator status  
   **Then** the action is forbidden with an admin-only error

## Tasks / Subtasks

- [ ] Ensure the default creator exists as a managed user (AC: 1)
  - [ ] On GET `/api/users`, insert or synthesize a creator row when `.env` is configured
  - [ ] Ensure the creator record uses id `creator`, role `creator`, and tracks `isActive`
- [ ] Restrict status changes to administrator role only (AC: 2, 3, 6)
  - [ ] Enforce admin-only access for creator status changes in the status endpoint
  - [ ] Keep responses wrapped `{ data, error }` with `{ error: { code, message } }`
- [ ] Add activation/deactivation control for the default creator (AC: 1, 2, 3, 5)
  - [ ] Keep the existing status toggle pattern but label the row as "Default creator"
  - [ ] Disable the toggle when the current user is the creator
- [ ] Enforce admin safety guardrails (AC: 4)
  - [ ] Reuse existing "last active admin" protection for deactivation attempts
- [ ] Update auth behavior to respect creator status (AC: 2, 3)
  - [ ] Ensure creator login checks the DB record (by email or id) and blocks if inactive
- [ ] Add tests (AC: 1-6)
  - [ ] API tests for admin-only toggle, creator self-toggle blocked, and last-admin protection
  - [ ] UI test or component test confirming the toggle is disabled for self

## Dev Notes

- **Existing admin surface:** Manage Users lives at `travelblogs/src/app/admin/users/page.tsx` and uses `travelblogs/src/components/admin/users-dashboard.tsx` + `travelblogs/src/components/admin/user-list.tsx` for the status toggle UI.
- **Default creator behavior:** The `.env` creator login is validated in `travelblogs/src/utils/auth.ts`; it already blocks sign-in if a DB creator record exists and `isActive` is false.
- **Admin access patterns:** Admin-only checks are implemented via `travelblogs/src/app/api/users/admin-helpers.ts` and used in `travelblogs/src/app/api/users/route.ts` and `travelblogs/src/app/api/users/[id]/status/route.ts`. Current checks allow `creator` as admin; this story requires **administrator-only** for creator status changes.
- **Creator identity:** The default creator uses id `creator` and should remain role `creator`; role changes and deletes are already blocked in `travelblogs/src/app/api/users/[id]/route.ts`.
- **Error format:** All API responses must remain `{ data, error }` with `{ error: { code, message } }`.

### Library & Framework Requirements

- Next.js App Router only; API routes live under `travelblogs/src/app/api`.
- Auth.js (NextAuth) 4.24.13 with JWT sessions; reuse existing token role checks.
- Prisma 7.2.0 + SQLite; user `isActive` is already in the `User` model.

### Project Structure Notes

- UI: `travelblogs/src/app/admin/users/page.tsx`, `travelblogs/src/components/admin/users-dashboard.tsx`, `travelblogs/src/components/admin/user-list.tsx`
- API: `travelblogs/src/app/api/users/route.ts`, `travelblogs/src/app/api/users/[id]/status/route.ts`, `travelblogs/src/app/api/users/admin-helpers.ts`
- Auth: `travelblogs/src/utils/auth.ts`
- Tests: `travelblogs/tests/` (no co-located tests)

### Testing Requirements

- Add or update tests under `travelblogs/tests/` only (no co-located tests).
- Validate admin-only status change: creator role cannot toggle the default creator; administrators can.
- Ensure error responses assert `{ data, error }` with `{ error: { code, message } }`.

### References

- Admin deactivation requirement: `_bmad-output/epics.md` (Epic 5, Story 5.8/5.9 references to admin deactivation and safeguards)
- Auth + role rules: `_bmad-output/project-context.md` (Critical Implementation Rules, Framework-Specific Rules)
- API patterns + auth stack: `_bmad-output/architecture.md` (Auth.js, REST routes, response shape)

### Project Context Reference

- App Router only; API routes under `src/app/api`.
- REST endpoints are plural; params use `:id`.
- Responses must be wrapped `{ data, error }` with `{ error: { code, message } }`.
- Use `camelCase` for JSON fields and params; no `snake_case`.
- Tests live in `tests/` only.

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Status set to ready-for-dev.
### File List

- `_bmad-output/implementation-artifacts/0-3-deactivate-creator-account.md`
