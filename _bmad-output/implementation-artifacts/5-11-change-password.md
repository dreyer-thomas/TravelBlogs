# Story 5.11: Change Password

Status: done

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

- [x] Add first-login password change tracking (AC: 3, 4)
  - [x] Add `mustChangePassword` boolean to `User` (default `false` in migration)
  - [x] Set `mustChangePassword = true` when admin creates a user
- [x] Expose must-change state in auth session (AC: 3, 4)
  - [x] Extend `validateCredentials` to include `mustChangePassword` for DB users
  - [x] Add `mustChangePassword` to JWT + session callbacks and NextAuth typings
- [x] Add change password API (AC: 1, 2, 4)
  - [x] Add `PATCH /api/users/[id]/password` (self-service only)
  - [x] Validate payload with Zod: `{ currentPassword, newPassword }`
  - [x] Verify current password with bcryptjs; hash new password with cost 12
  - [x] On success, update `passwordHash` and set `mustChangePassword = false`
- [x] Enforce first-login flow (AC: 3, 4)
  - [x] Update middleware to redirect users with `mustChangePassword` to `/account/password`
  - [x] Allow access to `/account/password`, `/sign-in`, and auth APIs while gated
- [x] Add change password UI (AC: 1, 2, 4)
  - [x] Create `/account/password` page with current + new password fields
  - [x] Use warm palette + typography tokens; show clear validation messages
  - [x] On success, route to `callbackUrl` (default `/trips`)
- [x] Add/adjust tests (AC: 1-4)
  - [x] API tests for change password success/failure and `mustChangePassword` clearing
  - [x] Auth tests for `validateCredentials` returning `mustChangePassword`
  - [x] Middleware tests for forced redirect to `/account/password`

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

- Status: review
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

### Implementation Plan

- Add `mustChangePassword` to the User model with a default false migration.
- Set `mustChangePassword` to true when admin creates users.
- Extend the user creation test to assert the must-change flag.
- Return `mustChangePassword` from credential validation and propagate it to JWT/session payloads.
- Create a change-password page with a client form that validates input and routes to the callback URL.

### Debug Log References

### Completion Notes List

- Drafted change-password flow with forced first-login change and middleware gating.
- Added API, schema, auth callback, and UI requirements plus test coverage expectations.
- Added `mustChangePassword` field + migration, set admin-created users to require change, updated user creation test, ran `npx vitest run tests/api/users/create-user.test.ts`.
- Added `mustChangePassword` to credentials auth results and NextAuth session/JWT, updated auth test, ran `npx vitest run tests/api/auth/credentials.test.ts`.
- Added self-service change-password API with bcrypt validation and payload checks, plus API tests; ran `npx vitest run tests/api/users/change-password.test.ts`.
- Added middleware gating for must-change users with redirect and allowlist, updated middleware tests, ran `npx vitest run tests/api/auth/middleware.test.ts`.
- Added change password page + form with callback redirect and validation, plus component tests; ran `npx vitest run tests/components/change-password-form.test.tsx`.
- Ran full regression suite with `npm test`.
- Added user avatar menu with change password + check out actions.
- Ran `npx vitest run tests/components/user-menu.test.tsx`.
- Moved the avatar menu beside Manage users/Create trip actions and removed the global layout placement.
- Guarded legacy creator account from change-password API with a clear error.
- Tightened must-change middleware allowlist to only auth/password APIs and preserved callbackUrl query params; updated middleware tests.

### File List

- .codex/history.jsonl
- .codex/log/codex-tui.log
- .codex/sessions/2026/01/03/rollout-2026-01-03T13-54-09-019b83ec-22c4-7073-bbed-758a085c5209.jsonl
- .codex/sessions/2026/01/03/rollout-2026-01-03T13-54-37-019b83ec-91a5-7cf2-ac97-53d7ea2c87b4.jsonl
- .codex/sessions/2026/01/03/rollout-2026-01-03T14-27-13-019b840a-6b1a-7f82-a376-6e8ca97592a0.jsonl
- _bmad-output/implementation-artifacts/5-11-change-password.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- travelblogs/prisma/schema.prisma
- travelblogs/prisma/migrations/20260104120000_add_user_must_change_password/migration.sql
- travelblogs/src/app/api/users/route.ts
- travelblogs/tests/api/users/create-user.test.ts
- travelblogs/src/app/api/users/[id]/password/route.ts
- travelblogs/tests/api/users/change-password.test.ts
- travelblogs/src/middleware.ts
- travelblogs/tests/api/auth/middleware.test.ts
- travelblogs/src/components/account/change-password-form.tsx
- travelblogs/src/app/account/password/page.tsx
- travelblogs/tests/components/change-password-form.test.tsx
- travelblogs/src/app/trips/page.tsx
- travelblogs/src/app/layout.tsx
- travelblogs/src/components/account/user-menu.tsx
- travelblogs/tests/components/user-menu.test.tsx
- travelblogs/src/utils/auth.ts
- travelblogs/src/utils/auth-options.ts
- travelblogs/src/types/next-auth.d.ts
- travelblogs/tests/api/auth/credentials.test.ts

## Change Log

- 2026-01-03: Added change-password enforcement, API + UI flow, and tests for must-change behavior.
- 2026-01-03: Added avatar menu with change password + check out actions in the app header.
- 2026-01-03: Moved avatar menu into the Trips header action group.
- 2026-01-03: Blocked legacy creator password changes with explicit error messaging.
