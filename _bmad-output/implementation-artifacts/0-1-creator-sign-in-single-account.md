# Story 0.1: Creator Sign-In (Single Account)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want to sign in with email and password,
so that only I can create and edit trips and entries.

## Acceptance Criteria

1. **Given** the app is configured with a single creator account
   **When** I submit valid credentials
   **Then** I am signed in and can access trip management routes
2. **Given** I submit invalid credentials
   **When** I attempt to sign in
   **Then** I see a clear error and remain signed out
3. **Given** I am not signed in
   **When** I attempt to access trip or entry management routes
   **Then** I am redirected to sign in
4. **Given** I open a shareable trip link
   **When** the trip loads
   **Then** I can view the trip without signing in

## Tasks / Subtasks

- [x] Configure Auth.js single-creator sign-in (AC: 1, 2)
  - [x] Add Auth.js route at `src/app/api/auth/[...nextauth]/route.ts` with Credentials provider and JWT sessions
  - [x] Load creator credentials from `.env` (mirror keys in `.env.example`; do not use `.env.local`)
  - [x] Validate credentials server-side; return a clear error message on failure
  - [x] Do not add Prisma models or DB tables for users in this story
- [x] Add sign-in UI and flow (AC: 1, 2)
  - [x] Create `src/app/sign-in/page.tsx` with email/password form and error state
  - [x] Wire sign-in to Auth.js credentials flow and redirect to trips management on success
- [x] Protect management routes (AC: 3)
  - [x] Add session checks in `src/middleware.ts` for management paths
  - [x] Protect at minimum: `src/app/trips/` (manage), `src/app/entries/` (manage), any create/edit routes for trips/entries
  - [x] Redirect unauthenticated users to sign-in
- [x] Keep shareable links public (AC: 4)
  - [x] Exclude public trip/entry view routes (shareable link pages) from auth gating
  - [x] Treat read-only trip/entry viewers as public until Epic 4 defines a share-link route
- [x] Add tests for auth guard behavior (AC: 1-4)
  - [x] Place tests under `tests/` (e.g., `tests/api/auth`, `tests/components/auth`)
  - [x] Cover: valid sign-in, invalid sign-in, redirect on protected routes, public access to shareable links

## Dev Notes

- Epic 0 goal: enable lightweight creator-only access for trip/entry management while keeping sharing public.
- Cross-story context: Story 1.1 initializes the Next.js project; this auth work assumes the app exists but does not require user tables yet.
- Epic 0 contains only this story; no cross-story dependencies within Epic 0.
- Auth.js (NextAuth) 4.24.13 with JWT sessions is required; keep auth routes under `src/app/api/auth` only.
- MVP is a single creator account; avoid creating a full user table yet and do not add Prisma models in this story.
- Store creator credentials in `.env` and document in `.env.example`; do not introduce `.env.local`.
- Schema note: no database schema changes are required for this story; Auth.js credentials are environment-backed only.
- Shareable trip links must remain public; do not require sign-in for viewer access.
- Follow response wrapper `{ data, error }` and error shape `{ error: { code, message } }` for any custom API responses.
- Use App Router only; components in feature folders; tests in central `tests/`.
- Performance guardrail: avoid heavy client-side auth checks that could impact entry navigation (<1s) or trip switching (2-5s). Use middleware + server checks.
- Regression guardrail: do not block any read-only trip or entry view routes used by shareable links.
- Integration pattern: Auth.js credentials provider + JWT sessions, protected routes enforced via `src/middleware.ts`, and API writes guarded on the server as needed.

### Project Structure Notes

- Auth route: `src/app/api/auth/[...nextauth]/route.ts`
- Sign-in page: `src/app/sign-in/page.tsx`
- Route protection: `src/middleware.ts`
- Feature components: `src/components/auth/` if shared UI is needed
- Protected paths (minimum): `src/app/trips/`, `src/app/entries/` (creator management), `src/app/api/trips/`, `src/app/api/entries/`, `src/app/api/media/upload/`
- Public paths (until share links exist): `src/app/entries/[id]/` entry reader, any read-only trip view routes (do not gate GET-only views)

### Scope Boundaries

- In scope: single creator sign-in, protected management routes, public shareable views.
- Out of scope: multi-user admin flows, trip-level ACL, contributor permissions, password reset, MFA.

### Completion Checklist

- [x] Credentials provider works with `.env` values; invalid credentials show error.
- [x] Unauthenticated access to management routes redirects to sign-in.
- [x] Shareable trip/entry views remain accessible without sign-in.
- [x] No new Prisma models or user tables introduced.
- [x] Tests added under `tests/` for auth and route guards.

### References

- Epic 0 story details and ACs: `_bmad-output/epics.md` (Epic 0, Story 0.1)
- Lightweight auth requirement (MVP scope): `_bmad-output/prd.md` (Functional Requirements: FR0)
- Auth.js, JWT, and route conventions: `_bmad-output/architecture.md` (Authentication & Security, API & Communication Patterns, Project Structure)
- Viewer access without sign-in (anti-patterns to avoid): `_bmad-output/ux-design-specification.md` (Anti-Patterns to Avoid)
- Global implementation rules: `_bmad-output/project-context.md`

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

N/A

### Completion Notes List

- Story created from epics, PRD, architecture, UX, and project-context inputs.
- Web research skipped due to restricted network access.
- Implemented Auth.js credentials route, sign-in UI, and middleware gating with public entry/trip view exceptions.
- Added test coverage for credential validation and middleware behavior (redirect + public access).
- Tests: `npm run test`.
- Hardened middleware to only allow explicit shareable trip routes and added server-side error messaging in auth flow.
- Mapped Auth.js credential errors to clear sign-in messaging, including URL error handling.

### File List

- `_bmad-output/implementation-artifacts/0-1-creator-sign-in-single-account.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `travelblogs/.env.example`
- `travelblogs/package.json`
- `travelblogs/package-lock.json`
- `travelblogs/vitest.config.ts`
- `travelblogs/src/app/api/auth/[...nextauth]/route.ts`
- `travelblogs/src/app/sign-in/page.tsx`
- `travelblogs/src/middleware.ts`
- `travelblogs/src/utils/auth.ts`
- `travelblogs/tests/api/auth/credentials.test.ts`
- `travelblogs/tests/api/auth/middleware.test.ts`
