# Story 5.8: Admin Deactivates or Deletes User

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to deactivate or delete a user account,
so that removed users can no longer access the system and I can permanently remove users when needed.

## Acceptance Criteria

1. **Given** I am signed in as an admin  
   **When** I deactivate a user  
   **Then** the user is marked inactive and cannot sign in
2. **Given** a deactivated user attempts to sign in  
   **When** they submit valid credentials  
   **Then** access is denied with a clear error
3. **Given** I am signed in as an admin  
   **When** I delete a user  
   **Then** the user account is removed from the system  
   **And** the user no longer appears in the user list
4. **Given** I delete a user  
   **When** they attempt to sign in  
   **Then** access is denied with a clear error

## Tasks / Subtasks

- [x] Add admin API for user activation status (AC: 1, 2)
  - [x] Create `PATCH /api/users/[id]/status` to set `isActive` true/false
  - [x] Reuse admin auth gate and JSON error format
  - [x] Block updates for `creator` admin account
- [x] Add admin API for deleting users (AC: 3, 4)
  - [x] Implement `DELETE /api/users/[id]` in the existing user route
  - [x] Block deletion for `creator` admin account
  - [x] Block deletion when user owns trips (require reassignment first)
- [ ] Update admin UI to manage status and deletion (AC: 1, 3)
- [x] Update admin UI to manage status and deletion (AC: 1, 3)
  - [x] Add Activate/Deactivate control in `UserList` edit panel
  - [x] Add Delete action with confirmation and safe error handling
  - [x] Disable destructive actions for the current admin user
- [x] Add/adjust tests (AC: 1-4)
  - [x] API tests for status toggle (admin only, invalid payload, not found)
  - [x] API tests for delete (admin only, blocked for creator, blocked for owner)
  - [x] Component tests for status toggle and delete confirmation handling

## Dev Notes

- Admin auth is enforced by checking `token.sub === "creator"`; reuse the existing admin guard logic for new routes. [Source: travelblogs/src/app/api/users/route.ts] [Source: travelblogs/src/app/api/users/[id]/route.ts]
- Inactive users are already blocked from signing in via credential validation; keep this behavior unchanged. [Source: travelblogs/src/utils/auth.ts]
- The Manage Users UI lives in the admin dashboard and `UserList` component; add actions there rather than creating a new page. [Source: travelblogs/src/app/admin/users/page.tsx] [Source: travelblogs/src/components/admin/user-list.tsx]
- User deletion should not orphan trips; guard against deleting users who own trips (Trip.ownerId). [Source: travelblogs/prisma/schema.prisma]

### Technical Requirements

- Deactivation sets `User.isActive` to `false` and reactivation sets it to `true`.
- `PATCH /api/users/[id]/status` must return `{ data, error }` with `{ error: { code, message } }` on failures.
- `DELETE /api/users/[id]` must remove the user record and cascade `TripAccess` rows.
- Reject delete/deactivate requests for the `creator` admin account with `403 FORBIDDEN`.
- Reject delete if the user owns any trips; return a clear `409` or `403` error with guidance.
- All timestamps in responses must remain ISO strings.

### UX Requirements

- Deactivate/Activate controls should sit alongside role editing in the existing edit panel styling. [Source: travelblogs/src/components/admin/user-list.tsx]
- Delete must require explicit confirmation and surface errors inline without losing list state.

### Architecture Compliance

- App Router only; API routes under `src/app/api`.
- Use Prisma 7.2.0 + SQLite models; no schema changes required.
- Use Zod 4.2.1 for request validation (server-side only).

### Library/Framework Requirements

- Next.js App Router + TypeScript.
- Auth.js (NextAuth) 4.24.13 JWT sessions with `token.sub`, `token.role`.
- Prisma 7.2.0 + SQLite.

### File Structure Requirements

- User list UI: `travelblogs/src/components/admin/user-list.tsx`.
- Admin users page: `travelblogs/src/app/admin/users/page.tsx`.
- User API routes: `travelblogs/src/app/api/users/route.ts`, `travelblogs/src/app/api/users/[id]/route.ts`, `travelblogs/src/app/api/users/[id]/status/route.ts`.
- Tests: `travelblogs/tests/api/users/` and `travelblogs/tests/components/admin/`.

### Testing Requirements

- API tests:
  - Admin can deactivate and reactivate a user.
  - Deactivated user cannot authenticate (mocked credentials flow).
  - Admin can delete a user who owns no trips.
  - Deleting a trip owner is blocked with clear error.
  - Non-admin users receive `403 FORBIDDEN` on status/delete.
- Component tests:
  - Status toggle updates badge and handles API errors.
  - Delete action prompts confirmation and handles API error state.

### Previous Story Intelligence

- Story 5.1 introduced the user management endpoints and admin gate; reuse the same auth checks and response shapes. [Source: _bmad-output/implementation-artifacts/5-1-admin-creates-user-accounts.md]
- Story 5.11 added user password change flows; keep admin actions separate from password management. [Source: _bmad-output/implementation-artifacts/5-11-change-password.md]

### Git Intelligence Summary

- Recent commits touched user management and auth flows; avoid regressions in admin-only checks and `{ data, error }` response shape. [Source: git log -5]

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
- UX design system: `_bmad-output/ux-design-specification.md`
- User list UI: `travelblogs/src/components/admin/user-list.tsx`
- User APIs: `travelblogs/src/app/api/users/route.ts`, `travelblogs/src/app/api/users/[id]/route.ts`
- Auth validation: `travelblogs/src/utils/auth.ts`
- Prisma schema: `travelblogs/prisma/schema.prisma`

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Drafted admin deactivation/delete story with API, UI, and testing guardrails.
- Mapped user management routes and admin dashboard components for targeted edits.
- Documented constraints for creator admin and trip owner deletion safety.
- Implemented admin status toggle API with validation, admin guard, and creator protection.
- Added API coverage for status toggling and error cases.
- Implemented admin user deletion endpoint with creator and owner safeguards.
- Added API coverage for delete authorization, owner blocking, and cascade cleanup.
- Added status toggle and delete controls to the admin user list with confirmations.
- Added component coverage for status toggle and delete error handling.
- Validated API and UI test coverage for deactivation and deletion flows.
- Full test suite run: `npm test`.
- Clarified sign-in errors for inactive or deleted accounts and wired them to NextAuth error codes.
- Added auth credential and sign-in UI tests covering inactive/deleted account messaging.

### File List

- _bmad-output/implementation-artifacts/5-8-admin-deactivates-user.md
- travelblogs/src/app/api/users/[id]/status/route.ts
- travelblogs/src/app/api/users/[id]/route.ts
- travelblogs/tests/api/users/update-user-status.test.ts
- travelblogs/tests/api/users/delete-user.test.ts
- travelblogs/src/components/admin/user-list.tsx
- travelblogs/tests/components/admin/user-list.test.tsx
- travelblogs/src/utils/auth.ts
- travelblogs/src/utils/auth-options.ts
- travelblogs/src/app/sign-in/page.tsx
- travelblogs/tests/api/auth/credentials.test.ts
- travelblogs/tests/components/sign-in-page.test.tsx
