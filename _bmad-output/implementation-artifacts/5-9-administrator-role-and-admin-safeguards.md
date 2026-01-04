# Story 5.9: Administrator Role and Admin Safeguards

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to grant Administrator privileges with safeguards,
so that trusted users can manage accounts without risking admin lockouts.

## Acceptance Criteria

1. **Given** a user is assigned the Administrator role  
   **When** they access admin-only areas  
   **Then** they have the same permissions as the default admin
2. **Given** I am signed in as an Administrator  
   **When** I deactivate the default admin in the Manage Users page  
   **Then** the default admin is marked inactive and cannot sign in
3. **Given** there is only one active admin left  
   **When** I attempt to delete that admin  
   **Then** the action is blocked with a clear error
4. **Given** I am signed in as an Administrator  
   **When** I attempt to remove my own admin privilege  
   **Then** the action is blocked with a clear error

## Tasks / Subtasks

- [ ] Add Administrator role support (AC: 1)
  - [ ] Extend Prisma `UserRole` enum to include `administrator`
  - [ ] Update auth/session role checks to treat `administrator` as admin
  - [ ] Ensure admin-only routes accept `creator` or `administrator`
- [ ] Enforce admin safeguard rules (AC: 2-4)
  - [ ] Block admin deactivation/deletion for the last active admin
  - [ ] Prevent administrators from downgrading their own role
  - [ ] Preserve current creator admin protections
- [ ] Update admin UI to show Administrator role (AC: 1)
  - [ ] Add Administrator option in role selector with clear labeling
  - [ ] Show inline errors for blocked self-demotion and last-admin guardrails
- [ ] Add/adjust tests (AC: 1-4)
  - [ ] API tests for role updates to/from Administrator
  - [ ] API tests for last-active-admin guardrails
  - [ ] Component tests for role selector visibility and error messaging

## Dev Notes

- Admin gating currently relies on `token.sub === "creator"`; update checks to allow `administrator` while preserving creator protections. [Source: travelblogs/src/app/api/users/route.ts] [Source: travelblogs/src/app/api/users/[id]/route.ts]
- User role enum lives in Prisma schema; adding Administrator requires migration and updated type usage across auth/session code. [Source: travelblogs/prisma/schema.prisma] [Source: travelblogs/src/utils/auth.ts]
- Manage Users UI uses `UserList` for role changes; extend the selector and error handling there. [Source: travelblogs/src/components/admin/user-list.tsx]
- Safeguards should be enforced server-side first (API), with UI reflecting errors returned in `{ data, error }` format.

### Technical Requirements

- Add `administrator` to `UserRole` enum and update any role comparisons to include it for admin-only access.
- Admin-only API routes must accept `creator` and `administrator`, while keeping the hard-coded `creator` account protections.
- Block role changes that would leave zero active admins (`creator` + `administrator` with `isActive === true`).
- Block self-demotion for `administrator` users.
- Responses must remain `{ data, error }` with `{ error: { code, message } }`; all timestamps ISO 8601 strings.

### UX Requirements

- Role selector lists `creator`, `administrator`, `viewer` with clear labels.
- Safeguard violations show inline errors without losing form state.

### Architecture Compliance

- App Router only; API routes under `src/app/api`.
- Use Prisma 7.2.0 + SQLite models; migrations required for enum change.
- Use Zod 4.2.1 for request validation (server-side only).

### Library/Framework Requirements

- Next.js App Router + TypeScript.
- Auth.js (NextAuth) 4.24.13 JWT sessions with `token.sub`, `token.role`.
- Prisma 7.2.0 + SQLite.

### File Structure Requirements

- Prisma schema: `travelblogs/prisma/schema.prisma`.
- Auth helpers: `travelblogs/src/utils/auth.ts`, `travelblogs/src/utils/auth-options.ts`, `travelblogs/src/types/next-auth.d.ts`.
- User APIs: `travelblogs/src/app/api/users/route.ts`, `travelblogs/src/app/api/users/[id]/route.ts`, `travelblogs/src/app/api/users/[id]/status/route.ts`.
- Admin UI: `travelblogs/src/components/admin/user-list.tsx`, `travelblogs/src/components/admin/users-dashboard.tsx`, `travelblogs/src/app/admin/users/page.tsx`.
- Tests: `travelblogs/tests/api/users/`, `travelblogs/tests/components/admin/`.

### Testing Requirements

- API tests:
  - Admin can assign Administrator role.
  - Administrator can access admin-only endpoints.
  - Self-demotion blocked with `403 FORBIDDEN`.
  - Last active admin cannot be deleted or deactivated.
- Component tests:
  - Administrator option visible in role selector.
  - Guardrail errors rendered inline without losing selection state.

### Previous Story Intelligence

- Story 5.1 established user management and admin gate; reuse existing response formats and validation patterns. [Source: _bmad-output/implementation-artifacts/5-1-admin-creates-user-accounts.md]
- Story 5.8 adds deactivate/delete flows; ensure safeguards extend to those actions. [Source: _bmad-output/implementation-artifacts/5-8-admin-deactivates-user.md]

### Git Intelligence Summary

- Recent commits focused on user management and auth flows; avoid regressions in admin-only checks and `{ data, error }` response shape. [Source: git log -5]

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
- User APIs: `travelblogs/src/app/api/users/route.ts`, `travelblogs/src/app/api/users/[id]/route.ts`
- Admin UI: `travelblogs/src/components/admin/user-list.tsx`
- Auth validation: `travelblogs/src/utils/auth.ts`
- Prisma schema: `travelblogs/prisma/schema.prisma`

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Drafted Administrator role story with server-first guardrails against admin lockout.
- Mapped required schema, auth, API, and UI touchpoints for role expansion.
- Documented testing expectations for last-admin and self-demotion safeguards.

### File List

- _bmad-output/implementation-artifacts/5-9-administrator-role-and-admin-safeguards.md
