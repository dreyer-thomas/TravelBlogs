# Story 5.3: Admin Changes User Role

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to change a user's role between creator and viewer,
so that access aligns with their responsibilities.

## Acceptance Criteria

1. **Given** I am signed in as an admin
   **When** I update a user's role
   **Then** the new role is saved and shown in the user list
2. **Given** I attempt to change the role with invalid input
   **When** I save
   **Then** I see a clear validation error
   **And** the role is not updated

## Tasks / Subtasks

- [x] Add role update API (AC: 1, 2)
  - [x] Create a `PATCH /api/users/:id` route handler under `src/app/api/users/[id]/route.ts`
  - [x] Validate payload with Zod (`role` required; enum: `creator | viewer`)
  - [x] Enforce admin access using existing Auth.js token checks (`token.sub === "creator"`)
  - [x] Update Prisma `User` record and return `{ data, error }` response shape
  - [x] Return validation/authorization errors in `{ error: { code, message } }` format
- [x] Add admin UI for role change (AC: 1, 2)
  - [x] Add role selector and save action in `src/components/admin/user-list.tsx`
  - [x] Update UI state optimistically on success; surface errors on failure
  - [x] Prevent role updates for the current admin if needed (confirm behavior)
- [x] Add tests (AC: 1, 2)
  - [x] API tests for role update success, invalid role, and unauthorized access
  - [x] Component test for role change UI + error handling
- [x] Update admin UI to use Edit User panel (AC: 1, 2)
  - [x] Replace inline role controls with single "Edit User" button in `src/components/admin/user-list.tsx`
  - [x] Open a compact edit panel to change role and save/cancel
  - [x] Ensure errors are shown inside the panel and optimistic update still applies

## Dev Notes

### Developer Context

- Epic 5 introduces accounts, roles, and authenticated access; this story adds role switching for existing users.
- Admin access currently relies on the legacy creator account (`token.sub === "creator"`).
- The admin users dashboard already lists users and shows a role badge, but has no edit controls yet.
- `/api/users` supports `GET` and `POST` only; there is no update route for user roles.
- Prisma `User` model stores `role` as `UserRole` enum (`creator`, `viewer`).

### Epic Context (Epic 5)

- Objective: Complete Phase 2 account and role management, including admin management, sign-in, and per-trip access control.
- Related stories: 5.1 Admin creates user accounts; 5.2 User sign-in; 5.4 Invite viewers to a trip; 5.5 Enable contributor access; 5.6 Viewer access to invited trips; 5.7 Contributor adds/edits entries; 5.8 Admin deactivates user.
- Business value: Admins can maintain correct access roles so creator-only actions and viewer-only access remain secure and predictable.

### Cross-Story Dependencies & Prerequisites

- Requires 5.1 user creation flow and `User` model (role already persisted).
- Assumes 5.2 sign-in flow sets `token.sub`, `token.role`, `token.email` for admin gating and downstream UI.
- Upcoming stories 5.4–5.7 depend on accurate user roles for access enforcement.

### Reuse Guidance (Avoid Reinvention)

- Reuse admin gating logic used in `travelblogs/src/app/api/users/route.ts` (token-based admin check).
- Reuse UI styling and layout patterns from `travelblogs/src/components/admin/user-list.tsx` and `travelblogs/src/components/admin/user-form.tsx` to keep admin UI consistent.
- Reuse API response helpers and error formatting patterns from existing admin endpoints; do not introduce a new response shape.

### Project Structure Notes

- API route handlers live under `travelblogs/src/app/api`; new role update route should be `travelblogs/src/app/api/users/[id]/route.ts`.
- Admin UI components live in `travelblogs/src/components/admin/` (update `user-list.tsx` and related components as needed).
- Admin page fetches users server-side in `travelblogs/src/app/admin/users/page.tsx` and passes data into `UsersDashboard`.
- Shared helpers should remain in `travelblogs/src/utils/`; avoid adding `lib/`.

### References

- Epic requirements (Story 5.3) and Epic 5 context: `_bmad-output/epics.md`
- Architecture decisions, versions, and structure: `_bmad-output/architecture.md`
- UX and visual language guidance: `_bmad-output/ux-design-specification.md`
- Project-wide agent rules: `_bmad-output/project-context.md`
- Current admin users API: `travelblogs/src/app/api/users/route.ts`
- Admin UI components: `travelblogs/src/components/admin/user-list.tsx`, `travelblogs/src/components/admin/user-form.tsx`, `travelblogs/src/components/admin/users-dashboard.tsx`
- Admin users page: `travelblogs/src/app/admin/users/page.tsx`
- User model: `travelblogs/prisma/schema.prisma`

### Technical Requirements

- Add `PATCH` handler at `travelblogs/src/app/api/users/[id]/route.ts` with Zod validation for `role`.
- Keep API response shape `{ data, error }` and error payload `{ error: { code, message } }`.
- Use async/await; do not introduce raw Promise chains.
- Preserve generic error messaging for unauthorized access (no user enumeration).
- Do not allow role changes to modify password or activation status.

### Architecture Compliance

- App Router only; API routes live under `travelblogs/src/app/api`.
- JSON fields are `camelCase`; dates returned from API must be ISO 8601 strings.
- Use `travelblogs/src/utils/` for shared helpers; do not add `lib/`.
 - Performance/deployment/integration constraints: no special requirements for this story beyond existing app standards (admin-only UI + API).

### Library/Framework Requirements

- Auth.js (NextAuth) 4.24.13 with JWT sessions for admin gating.
- Prisma 7.2.0 + SQLite for user updates.
- Zod 4.2.1 for server-side validation.
- Next.js App Router + TypeScript; Redux Toolkit 2.11.2 (no RTK Query).

### File Structure Requirements

- API route: `travelblogs/src/app/api/users/[id]/route.ts`.
- Admin UI updates: `travelblogs/src/components/admin/user-list.tsx` and related admin components.
- Tests under `travelblogs/tests/` only (no co-located tests).

### Testing Requirements

- API tests: role update success, invalid role payload, unauthorized or non-admin access.
- Component tests: role selector interaction, success state update, error messaging.
- Add a regression test that ensures creator-only admin gating still blocks non-admin users.

### Previous Story Intelligence

- Story 5.2 moved credential validation to Prisma + bcrypt and expanded session typing in `travelblogs/src/types/next-auth.d.ts`.
- Admin access remains tied to `token.sub === "creator"`; keep this gating consistent in the new PATCH route.
- User creation uses `bcryptjs` with cost 12 in `travelblogs/src/app/api/users/route.ts`; role updates must not touch `passwordHash`.
- Admin UI patterns: the user list cards and form styles in `travelblogs/src/components/admin/user-list.tsx` and `travelblogs/src/components/admin/user-form.tsx` set the visual baseline to follow.

### Git Intelligence Summary

- Recent commits added: admin users API/UI (`travelblogs/src/app/api/users/route.ts`, `travelblogs/src/components/admin/*`), user model (`travelblogs/prisma/schema.prisma`), and sign-in updates (`travelblogs/src/utils/auth.ts`, `travelblogs/src/utils/auth-options.ts`).
- Avoid regressions in admin dashboard layout and Auth.js callbacks that set `session.user.role`.

### Latest Tech Information

- Web research not performed (network restricted); project already pins versions in `_bmad-output/project-context.md`.

### UX Notes (Admin UI)

- Keep admin actions secondary in visual hierarchy; follow existing admin dashboard look and spacing.
- Role selector should be compact, inline with the role badge styling, and use the existing color tokens.
- Use inline validation/error messaging consistent with the user creation form.

### Verification & Completion Guardrails

- Verify PATCH response returns updated user role and preserves existing fields.
- Confirm list updates show the new role immediately (refresh or optimistic UI).
- Ensure non-admins receive a 403 and do not see role change controls.

### Scope Boundaries

- Do not add new roles beyond `creator` and `viewer`.
- Do not change authentication flows or user creation behavior.
- Do not add or modify trip invite or contributor logic (covered in later stories).

### Project Context Reference

- Follow `_bmad-output/project-context.md` for naming conventions, response formats, API routing, and test location rules.

### Story Completion Status

- Status: review
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

- 2025-12-29: Added role update API/UI/tests; ran npm test.

### Implementation Plan

- Add PATCH `/api/users/:id` with Zod validation, admin gate, and `{ data, error }` response.
- Extend admin user list with role selector + optimistic save flow and error surfacing.
- Cover API and UI paths with targeted tests and run full suite.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- Added PATCH user role endpoint with admin enforcement and validation.
- Added admin user list role controls with optimistic updates and self-lockout.
- Tests: `npm test`.
- Swapped to "Edit User" panel for role changes and updated tests.
- Code review fixes: block self-role changes in PATCH handler; add auth/invalid JSON/self-update tests.
- Note: `.codex/` artifacts are tooling logs and are intentionally excluded from File List.

### File List

- `_bmad-output/implementation-artifacts/5-3-admin-changes-user-role.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `travelblogs/src/app/admin/users/page.tsx`
- `travelblogs/src/app/api/users/[id]/route.ts`
- `travelblogs/src/components/admin/user-list.tsx`
- `travelblogs/src/components/admin/users-dashboard.tsx`
- `travelblogs/tests/api/users/update-user-role.test.ts`
- `travelblogs/tests/components/admin/user-list.test.tsx`

## Change Log

- 2025-12-29: Added admin role update API + UI controls with tests; ran full suite.
- 2025-12-29: Switched role update UI to an Edit User panel with updated tests.
- 2025-12-29: Code review fixes for role update guard and expanded API test coverage.
