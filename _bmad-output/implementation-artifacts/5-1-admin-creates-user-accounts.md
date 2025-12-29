# Story 5.1: Admin Creates User Accounts

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to create user accounts with email, name, and role,
so that I can onboard creators and viewers with the right access.

## Acceptance Criteria

1. **Given** I am signed in as an admin  
   **When** I create a user with email, name, and role (creator or viewer)  
   **Then** the user account is created and visible in the user list
2. **Given** I submit invalid or duplicate user data  
   **When** I attempt to create the user  
   **Then** I see clear validation errors  
   **And** the user is not created

## Tasks / Subtasks

- [x] Define user account data model (AC: 1, 2)
  - [x] Add Prisma model for user with email, name, role, active status
  - [x] Add validation rules for required fields and role enum
- [x] Build admin user creation flow (AC: 1, 2)
  - [x] Admin UI form with email, name, role inputs and inline errors
  - [x] API route to create users with `{ data, error }` response shape
  - [x] Persist user records and surface in user list
- [x] Add tests for user creation (AC: 1, 2)
  - [x] API tests for validation and duplicate handling
  - [x] Component test for form validation feedback

## Dev Notes

### Developer Context
- Phase 2 story: current auth is single creator via Auth.js Credentials provider and env vars; admin access must be defined (existing creator may act as admin until admin login is implemented).
- User accounts must support roles (creator/viewer) and secure password storage per NFRs.
- API responses must use `{ data, error }` and `{ error: { code, message } }` for errors; JSON fields are `camelCase`.
- Validation is server-side only (Zod); use async/await; dates in JSON must be ISO 8601 strings.
- Scope boundary: this story adds user records and admin creation UX only; do not implement user sign-in or role-based access for those users (Story 5.2+).
- Admin access model for this story: treat the existing single creator account (Auth.js credentials user id `"creator"`) as the admin.
- Epic 5 objective: enable Phase 2 account management (admin creates users, roles, access control) as foundation for signed-in creators/viewers.
- Cross-story context: this story creates the User model and admin creation UI/API; Story 5.2 uses these users for sign-in, and Stories 5.3–5.8 depend on roles and active status.

### Epic Summary (Context)
- Epic 5 scope: admin creates users, assigns roles, manages access; enables viewers/contributors and account lifecycle in later stories.
- This story is the foundation for account data; subsequent stories rely on role values and active status.
- Epic 5 stories overview:
  - 5.2 User sign-in (uses created users)
  - 5.3 Admin changes user role
  - 5.4 Invite viewers to a trip
  - 5.5 Enable contributor access
  - 5.6 Viewer access to invited trips
  - 5.7 Contributor adds/edits entries
  - 5.8 Admin deactivates user

### Architecture Summary (Relevant)
- Stack: Next.js App Router + Prisma/SQLite with REST route handlers and Zod validation.
- Patterns: central `tests/`, feature-based components, `src/app/api` only, and `{ data, error }` responses.
 - Use existing middleware pattern for protected routes; public share routes must remain unauthenticated.

### Technical Requirements
- Add User model with role enum and active status; enforce unique email.
- Store hashed passwords; choose a secure hashing library and document (bcrypt or argon2) with salted hashes.
- Ensure admin-only access on user-creation endpoints (middleware or route-level checks).
- Add a minimal password policy (length + non-empty) and return validation errors using the standard error format.
- Define explicit user fields: `id`, `email`, `name`, `role`, `passwordHash`, `isActive`, `createdAt`, `updatedAt`.
- Relationship notes (Phase 2 prep): do not add Trip/Entry relations yet; future stories will attach ownership/access via join tables or foreign keys.

### Architecture Compliance
- App Router only; API routes live under `src/app/api`.
- REST endpoints are plural; route params use `:id` and query params are `camelCase`.
- Keep Prisma model names singular and columns `camelCase`.
- Use existing Prisma client access via `src/utils/db.ts`; do not introduce alternate DB layers.
- Follow existing request/response patterns in `travelblogs/src/app/api/trips/route.ts` (Zod validation + `{ data, error }` responses).

### Library/Framework Requirements
- Next.js App Router, TypeScript, Prisma 7.2.0, SQLite, Auth.js 4.24.13, Zod 4.2.1.
- Current package versions align with latest patch releases; Next.js 16.1.1 is available (package.json is 16.1.0).
- Auth.js best practice: rely on `getToken`/session for admin gating and avoid storing plaintext credentials; use server-side credential validation only.
- Password hashing best practice: use a strong, slow hash (bcrypt/argon2) with per-user salts; never log or return hash values.
- Latest tech notes: no required upgrades for this story; avoid dependency bumps unless explicitly requested.

### File Structure Requirements
- UI components under `src/components/<feature>/`; avoid introducing `lib/` (use `src/utils/`).
- Tests live under `tests/` (no co-located tests).
- Suggested locations:
  - API: `src/app/api/users/route.ts`
  - Admin UI: `src/app/admin/users/page.tsx`, `src/components/admin/user-form.tsx`, `src/components/admin/user-list.tsx`

### Testing Requirements
- Add API tests for user creation, duplicate email, validation errors.
- Add component test for admin user creation form validation and error states.
- Add a regression test to ensure non-admin requests to `/admin/users` or `/api/users` are blocked.

### Project Context Reference
- Enforce `{ data, error }` API wrapper with `{ error: { code, message } }`.
- Keep routes plural, App Router only, and tests under `tests/`.
- Use `.env` and `.env.example`; avoid Docker/TLS additions in MVP/Phase 2 work.

### UX Requirements
- Admin user creation form uses existing form patterns: labels above fields, inline validation, and clear error messaging.
- Keep layout consistent with existing trips/entries admin pages; avoid adding new navigation paradigms.

### Coding Standards (Reinforce)
- Naming: `camelCase` variables/functions, `PascalCase` components, `kebab-case.tsx` files.
- API params and JSON fields are `camelCase`.
- Use async/await; no raw Promise chains.

### Story Completion Status
- Status set to `ready-for-dev`.
- Completion note recorded for dev handoff.

### Dependencies & Prerequisites
- Prisma migration required for new User model before API work.
- Admin route protections should reuse existing Auth.js session/middleware patterns.

### Regression Safeguards
- Do not change creator sign-in behavior or public share link access.
- Ensure new admin routes do not block existing `/trips/share/*` paths or public viewing.
- Maintain existing API response shapes for trips/entries.

### Reuse Guidance
- Reuse auth/session helpers in `travelblogs/src/utils/auth-options.ts` and `travelblogs/src/middleware.ts`.
- Mirror request/response patterns in `travelblogs/src/app/api/trips/route.ts`.

### Performance Requirements
- Keep admin list queries small and paginatable if list grows; avoid loading unnecessary relations.
- Maintain overall app performance targets (page load 5–10s, trip switch 2–5s, entry switch <1s) by keeping admin UI lightweight.

### Deployment & Environment Notes
- Use existing `.env`/`.env.example` pattern; do not add `.env.local`.
- Use existing `DATABASE_URL`, `NEXTAUTH_SECRET`, and creator credentials; do not introduce new required env vars for this story.

### Integration & Data Flow
- UI → `src/app/api/users/route.ts` → Prisma (`src/utils/db.ts`) → SQLite.
- No external services for this story (no email, no third-party auth changes).

### Definition of Done
- User model added with required fields and Prisma migration applied.
- Admin UI allows creating users with role and shows the new user in the list.
- API returns `{ data, error }` and rejects invalid/duplicate users with correct error format.
- Non-admin access to admin routes blocked and covered by tests.
- Quality gate: new/updated tests pass (`npm test`), and lint passes (`npm run lint`).

### Project Structure Notes

- Align new user management components under `src/components/<feature>/` and new pages in `src/app/` per App Router.
- Keep routes plural and error responses wrapped; avoid new patterns that conflict with existing trips/entries APIs.
- Existing repo is under `travelblogs/` with Prisma already configured; update schema in `travelblogs/prisma/schema.prisma`.

### References

- Epic requirements for Story 5.1 and Phase 2 context: `_bmad-output/epics.md`
- API/error/structure conventions, stack versions, file layout: `_bmad-output/architecture.md`
- Project-wide agent rules and API response shape: `_bmad-output/project-context.md`
- Current auth setup (Credentials provider + JWT): `travelblogs/src/utils/auth-options.ts`
- Current credential validation: `travelblogs/src/utils/auth.ts`
- Middleware protections: `travelblogs/src/middleware.ts`
- Prisma schema baseline: `travelblogs/prisma/schema.prisma`

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Implementation Plan

- Add User model + migration with role enum and active status defaults.
- Add model-level test to verify required fields + defaults.

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- Added User Prisma model, migration, and model test coverage.
- Built admin users page + API with hashed password storage and list rendering.
- Added API validation/duplicate tests, admin page access regression, and form validation test.
- Tests: `npm test`
- Updated admin users page to toggle the creation form from a single button.
- Added a "Back to trips" link on the user management page.
- Improved user creation validation messaging and client email validation.
- Added unauthenticated access regression tests for admin users page and API.
- Repo contains unrelated git changes outside this story scope (see `git status`).

### File List

- `travelblogs/prisma/schema.prisma`
- `travelblogs/prisma/migrations/20251229181957_add_user_model/migration.sql`
- `travelblogs/tests/api/users/user-model.test.ts`
- `travelblogs/src/app/api/users/route.ts`
- `travelblogs/src/app/admin/users/page.tsx`
- `travelblogs/src/components/admin/user-form.tsx`
- `travelblogs/src/components/admin/user-list.tsx`
- `travelblogs/tests/api/users/create-user.test.ts`
- `travelblogs/tests/components/admin/user-form.test.tsx`
- `travelblogs/tests/components/admin/users-page.test.tsx`
- `travelblogs/src/components/admin/users-dashboard.tsx`
- `travelblogs/tests/components/admin/users-dashboard.test.tsx`
- `travelblogs/package.json`
- `travelblogs/package-lock.json`

### Change Log

- Completed user model, admin UI/API, and test coverage for Story 5.1.
- `travelblogs/tests/components/admin/user-form.test.tsx`
- Updated user validation messaging and unauthenticated access tests.
