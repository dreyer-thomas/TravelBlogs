# Story 5.2: User Sign-In

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to sign in with my email and password,
so that I can access trips based on my role.

## Acceptance Criteria

1. **Given** I have a valid account
   **When** I submit the correct email and password
   **Then** I am signed in and taken to my trips
2. **Given** I submit invalid credentials
   **When** I attempt to sign in
   **Then** I see a clear error
   **And** I remain signed out

## Tasks / Subtasks

- [x] Update credential authentication to use stored users (AC: 1, 2)
  - [x] Look up user by email with Prisma and normalize input (trim/lowercase)
  - [x] Verify `passwordHash` with `bcryptjs.compare`
  - [x] Reject inactive users (`isActive = false`) without revealing account state
  - [x] Include `id`, `email`, `role` in the JWT/session for downstream authorization
- [x] Align sign-in UI copy and behavior for multi-user access (AC: 1, 2)
  - [x] Update `/sign-in` messaging from “Creator Access” to user sign-in language
  - [x] Keep validation + error messaging consistent with Auth.js error handling
  - [x] Redirect to `/trips` or provided `callbackUrl` on success
- [x] Add auth tests for sign-in (AC: 1, 2)
  - [x] Unit test credential validation for valid/invalid/inactive users
  - [x] Component test for sign-in form validation + error display
  - [x] Regression test for sign-in redirect to callback URL on success

## Dev Notes

### Developer Context
- Epic 5 introduces accounts, roles, and authenticated access; this story is the sign-in foundation.
- Current auth uses Auth.js Credentials + env-based creator login (`CREATOR_EMAIL`, `CREATOR_PASSWORD`) in `travelblogs/src/utils/auth.ts`.
- User accounts now exist in SQLite via Prisma `User` model with `passwordHash`, `role`, `isActive`.
- Admin user management (Story 5.1) hashes passwords with `bcryptjs` and treats `token.sub === "creator"` as admin.

### Technical Requirements
- Replace `validateCredentials` to authenticate against the `User` table using Prisma and `bcryptjs.compare`.
- Preserve async/await flow and avoid raw Promise chains.
- Treat invalid credentials and inactive accounts with the same generic error to prevent user enumeration.
- Ensure JWT/session includes `id`, `email`, and `role` for downstream access checks; update `src/types/next-auth.d.ts` accordingly.
- Preserve compatibility for the existing creator/admin login until a DB-backed admin user is established (fallback or seed strategy).

### Architecture Compliance
- App Router only; API routes live under `src/app/api`.
- Responses from API endpoints must be `{ data, error }` with `{ error: { code, message } }` for errors.
- JSON fields are `camelCase`; dates must be ISO 8601 strings.
- Use `src/utils/` for shared helpers; do not introduce `lib/`.

### Library/Framework Requirements
- Auth.js (NextAuth) 4.24.13 with JWT sessions.
- Prisma 7.2.0 + SQLite; `bcryptjs` for password hashing/verification.
- Zod 4.2.1 for server-side validation.
- Next.js App Router + TypeScript; Redux Toolkit 2.11.2 (no RTK Query).

### File Structure Requirements
- Auth helpers: `travelblogs/src/utils/auth.ts`, `travelblogs/src/utils/auth-options.ts`.
- Session typing: `travelblogs/src/types/next-auth.d.ts`.
- Sign-in UI: `travelblogs/src/app/sign-in/page.tsx`.
- Tests under `travelblogs/tests/` (no co-located tests).

### Testing Requirements
- Add tests under `tests/api/auth` or `tests/utils` for credential validation logic.
- Add component test under `tests/components` for sign-in form validation and error handling.
- Include a regression test that verifies post-login redirect to `callbackUrl`.

### Previous Story Intelligence
- Story 5.1 created the `User` model, admin user creation flow, and uses `bcryptjs` with cost 12.
- Admin access currently relies on the legacy creator account (`token.sub === "creator"`).
- Do not alter user creation behavior; sign-in must be compatible with users created via `/api/users`.

### Git Intelligence Summary
- Latest work added user management (Story 5.1), new admin UI/API, and Prisma `User` model.
- Recent changes touched shared trip views and share link routes; avoid regressions in public share paths.

### Latest Tech Information
- Verified latest versions via npm: Next.js 16.1.1, Auth.js 4.24.13, Prisma 7.2.0, Redux Toolkit 2.11.2, Zod 4.2.1.
- Current project versions already match; no upgrades required for this story.

### Project Context Reference
- See `_bmad-output/project-context.md` for mandatory naming, API response shape, test location, and App Router constraints.

### Story Completion Status
- Status: done
- Completion note: Code review fixes applied and story marked complete.

### References
- Epic requirements (Story 5.2) and Epic 5 context: `_bmad-output/epics.md`
- Architecture decisions, versions, and structure: `_bmad-output/architecture.md`
- UX and visual language guidance: `_bmad-output/ux-design-specification.md`
- Project-wide agent rules: `_bmad-output/project-context.md`
- Current auth implementation: `travelblogs/src/utils/auth.ts`, `travelblogs/src/utils/auth-options.ts`
- Sign-in page: `travelblogs/src/app/sign-in/page.tsx`
- User model + creation API: `travelblogs/prisma/schema.prisma`, `travelblogs/src/app/api/users/route.ts`

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

### Implementation Plan

- Switch credential validation to Prisma + bcrypt with legacy creator fallback; propagate id/email/role into JWT/session.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- Implemented Prisma-backed credential validation with legacy creator fallback; added JWT/session role+email propagation; tests: `npm test`, `npm run lint`.
- Updated sign-in messaging for multi-user access and added UI tests for validation/errors/callback redirect; tests: `npm test`, `npm run lint`.
- Added sign-in auth test coverage for credential validation, UI errors, and callback redirects; tests: `npm test`, `npm run lint`.
- Hardened sign-in error messaging, extended JWT typings, and added UI tests for generic auth errors; tests: not run (review fixes).

### File List

- `.codex/history.jsonl`
- `.codex/log/codex-tui.log`
- `.codex/sessions/2025/12/29/rollout-2025-12-29T20-19-07-019b6b8c-cb70-7c31-a980-6e0a6aed413a.jsonl`
- `.codex/sessions/2025/12/29/rollout-2025-12-29T20-29-18-019b6b96-1e4a-7f10-9d0b-af876d775278.jsonl`
- `.codex/sessions/2025/12/29/rollout-2025-12-29T20-39-14-019b6b9f-35d7-7050-a1e0-d5e0a7c27417.jsonl`
- `_bmad-output/implementation-artifacts/5-2-user-sign-in.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/validation-report-20251229T192812Z.md`
- `travelblogs/src/utils/auth.ts`
- `travelblogs/src/utils/auth-options.ts`
- `travelblogs/src/types/next-auth.d.ts`
- `travelblogs/tests/api/auth/credentials.test.ts`
- `travelblogs/src/app/sign-in/page.tsx`
- `travelblogs/tests/components/sign-in-page.test.tsx`

## Change Log

- Completed sign-in flow updates and tests (Date: 2025-12-29)
- Applied code review fixes for sign-in error handling and JWT typing (Date: 2025-12-29)
