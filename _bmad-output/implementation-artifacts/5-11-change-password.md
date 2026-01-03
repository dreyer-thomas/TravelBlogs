# Story 5.11: Change Password

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to change my password at any time,
so that I can keep my account secure.

## Acceptance Criteria

1. **Given** I am signed in and provide my current password and a valid new password
   **When** I submit the change password form
   **Then** my password is updated securely
   **And** I remain signed in with access to my trips
2. **Given** I enter an incorrect current password or an invalid new password
   **When** I submit the change password form
   **Then** I see a clear error
   **And** my password remains unchanged
3. **Given** a user account is created by an admin
   **When** that user signs in for the first time
   **Then** they are required to change their password before accessing any trips
4. **Given** I am required to change my password on first login
   **When** I successfully update my password
   **Then** the requirement is cleared
   **And** I am redirected to my intended destination

## Tasks / Subtasks

- [ ] Add first-login password change tracking (AC: 3, 4)
  - [ ] Add `mustChangePassword` boolean to `User` (default `false` in migration)
  - [ ] Set `mustChangePassword = true` when admin creates a user
- [ ] Expose must-change state in auth session (AC: 3, 4)
  - [ ] Extend `validateCredentials` to include `mustChangePassword` for DB users
  - [ ] Add `mustChangePassword` to JWT + session callbacks and NextAuth typings
- [ ] Add change password API (AC: 1, 2, 4)
  - [ ] Add `PATCH /api/users/[id]/password` (self-service only)
  - [ ] Validate payload with Zod: `{ currentPassword, newPassword }`
  - [ ] Verify current password with bcryptjs; hash new password with cost 12
  - [ ] On success, update `passwordHash` and set `mustChangePassword = false`
- [ ] Enforce first-login flow (AC: 3, 4)
  - [ ] Update middleware to redirect users with `mustChangePassword` to `/account/password`
  - [ ] Allow access to `/account/password`, `/sign-in`, and auth APIs while gated
- [ ] Add change password UI (AC: 1, 2, 4)
  - [ ] Create `/account/password` page with current + new password fields
  - [ ] Use warm palette + typography tokens; show clear validation messages
  - [ ] On success, route to `callbackUrl` (default `/trips`)
- [ ] Add/adjust tests (AC: 1-4)
  - [ ] API tests for change password success/failure and `mustChangePassword` clearing
  - [ ] Auth tests for `validateCredentials` returning `mustChangePassword`
  - [ ] Middleware tests for forced redirect to `/account/password`

## Dev Notes

- Admin-created users currently receive a password via `POST /api/users`; extend this to mark `mustChangePassword` true without changing the creator-config flow. [Source: travelblogs/src/app/api/users/route.ts] [Source: travelblogs/src/utils/auth.ts]
- Credentials auth is implemented in `validateCredentials` with bcryptjs compare; keep hashing cost consistent (12). [Source: travelblogs/src/utils/auth.ts]
- The sign-in page already supports `callbackUrl`; reuse that for post-change redirect. [Source: travelblogs/src/app/sign-in/page.tsx]
- Middleware currently only checks for authentication; extend it to gate `mustChangePassword` while allowing share routes and the change-password page. [Source: travelblogs/src/middleware.ts]

### Technical Requirements

- `PATCH /api/users/[id]/password` must only allow the authenticated user to change their own password.
- Reject invalid payloads with `400 VALIDATION_ERROR` and invalid current passwords with `403 FORBIDDEN`.
- Responses must remain `{ data, error }` with `{ error: { code, message } }` and ISO timestamps.
- The legacy creator account defined via `.env` is out of scope for forced change (no `mustChangePassword` field).

### UX Requirements

- Keep the change password page consistent with the existing sign-in visual language (warm palette, rounded panels, focus rings). [Source: travelblogs/src/app/sign-in/page.tsx]
- The forced-change state should clearly explain why the user must update their password and block other routes until complete. [Source: _bmad-output/ux-design-specification.md]

### Architecture Compliance

- App Router only; API routes under `src/app/api`.
- Use Prisma 7.2.0 + SQLite models and Prisma Migrate for the schema update.
- Use Zod 4.2.1 for request validation (server-side only).

### Library/Framework Requirements

- Next.js App Router + TypeScript.
- Auth.js (NextAuth) 4.24.13 JWT sessions with `token.sub`, `token.role`.
- Prisma 7.2.0 + SQLite.
- bcryptjs for password hashing/verification.

### File Structure Requirements

- Prisma schema: `travelblogs/prisma/schema.prisma`.
- API route: `travelblogs/src/app/api/users/[id]/password/route.ts`.
- Auth utils/types: `travelblogs/src/utils/auth.ts`, `travelblogs/src/utils/auth-options.ts`, `travelblogs/src/types/next-auth.d.ts`.
- Middleware: `travelblogs/src/middleware.ts`.
- UI: `travelblogs/src/app/account/password/page.tsx`.
- Tests: `travelblogs/tests/api/users/` and `travelblogs/tests/api/auth/` plus middleware tests.

### Testing Requirements

- API tests:
  - Successful password change updates hash and clears `mustChangePassword`.
  - Incorrect current password returns `403` and does not update hash.
  - Authenticated user cannot change another user's password.
- Auth tests:
  - `validateCredentials` returns `mustChangePassword` for DB users.
- Middleware tests:
  - Users with `mustChangePassword` are redirected to `/account/password` on protected routes.
  - `/account/password` remains accessible while gated.

### Previous Story Intelligence

- Epic 5 stories standardized role-based auth checks and `{ data, error }` responses; follow the same error contract for new auth routes. [Source: _bmad-output/implementation-artifacts/5-10-refine-viewer-invitations-with-custom-selector.md]
- User creation and role updates already use Zod validation and admin gating; reuse that pattern for password change validation. [Source: travelblogs/src/app/api/users/route.ts]

### Git Intelligence Summary

- Recent work focused on user management and invites; avoid regressions in Auth.js session handling and API error formatting. [Source: git log -5]

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
- User API: `travelblogs/src/app/api/users/route.ts`
- Auth utils: `travelblogs/src/utils/auth.ts`
- Sign-in page: `travelblogs/src/app/sign-in/page.tsx`
- Middleware: `travelblogs/src/middleware.ts`

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Drafted change-password flow with forced first-login change and middleware gating.
- Added API, schema, auth callback, and UI requirements plus test coverage expectations.

### File List

- _bmad-output/epics.md
- _bmad-output/architecture.md
- _bmad-output/project-context.md
- _bmad-output/ux-design-specification.md
- travelblogs/prisma/schema.prisma
- travelblogs/src/app/api/users/route.ts
- travelblogs/src/app/api/users/[id]/route.ts
- travelblogs/src/utils/auth.ts
- travelblogs/src/utils/auth-options.ts
- travelblogs/src/types/next-auth.d.ts
- travelblogs/src/app/sign-in/page.tsx
- travelblogs/src/middleware.ts
