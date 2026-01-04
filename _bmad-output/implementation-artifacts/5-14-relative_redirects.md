# Story 5.14: Relative Redirects for Sign-In

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want sign-in redirects to use relative paths,
so that the app works correctly when accessed from other devices on the network.

## Acceptance Criteria

1. **Given** I am unauthenticated and hit a protected route
   **When** I am redirected to sign-in
   **Then** the `callbackUrl` is a relative path (no absolute host)
2. **Given** I sign in successfully
   **When** the app redirects me to my destination
   **Then** it uses the relative `callbackUrl` instead of an absolute URL
3. **Given** I am forced to change my password
   **When** I am redirected to `/account/password`
   **Then** the `callbackUrl` is a relative path

## Tasks / Subtasks

- [ ] Update middleware redirect helpers (AC: 1, 3)
  - [ ] Ensure `callbackUrl` is set to a relative path only
  - [ ] Avoid constructing absolute URLs when setting redirect targets
- [ ] Update sign-in handling (AC: 2)
  - [ ] Ensure sign-in uses relative callbackUrl values for post-login redirect
- [ ] Add/adjust tests (AC: 1-3)
  - [ ] Middleware tests verify relative callbackUrl values
  - [ ] Sign-in tests verify redirect uses relative path

## Dev Notes

- Middleware builds sign-in and password redirects using `new URL(..., request.url)` which yields absolute URLs; update to preserve relative callbackUrl values. [Source: travelblogs/src/middleware.ts]
- The sign-in page already reads `callbackUrl` from query; ensure it remains relative and is passed through unchanged. [Source: travelblogs/src/app/sign-in/page.tsx]

### Technical Requirements

- `callbackUrl` must always be a relative path (e.g., `/trips`, `/trips/abc123`).
- Do not hardcode hostnames or protocol in redirect URLs.
- Preserve query parameters when constructing relative callbackUrl values.

### UX Requirements

- No visible UI changes; behavior-only update.

### Architecture Compliance

- App Router only; keep logic in middleware and existing auth flow.
- Avoid new dependencies.

### Library/Framework Requirements

- Next.js App Router + TypeScript.
- Auth.js (NextAuth) 4.24.13 JWT sessions.

### File Structure Requirements

- Middleware: `travelblogs/src/middleware.ts`.
- Sign-in page: `travelblogs/src/app/sign-in/page.tsx`.
- Tests: `travelblogs/tests/api/auth/` and `travelblogs/tests/components/`.

### Testing Requirements

- Middleware tests:
  - Redirects include `callbackUrl` as relative path only.
  - Password-change redirect uses relative `callbackUrl`.
- Component tests:
  - Sign-in page uses relative callbackUrl for navigation.

### Previous Story Intelligence

- Story 5.11 added password-change redirect handling; keep that flow intact while making callbackUrl relative. [Source: _bmad-output/implementation-artifacts/5-11-change-password.md]

### Git Intelligence Summary

- Recent commits adjusted auth flows; avoid regressions in sign-in redirect behavior. [Source: git log -5]

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

- Components live under `travelblogs/src/components/<feature>/`.
- Tests live under `travelblogs/tests/` (no co-located tests).

### References

- Epic and acceptance criteria: `_bmad-output/epics.md`
- Architecture and patterns: `_bmad-output/architecture.md`
- Project rules: `_bmad-output/project-context.md`
- Middleware: `travelblogs/src/middleware.ts`
- Sign-in page: `travelblogs/src/app/sign-in/page.tsx`

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Drafted relative redirect requirements for middleware and sign-in flow.
- Added test coverage expectations for callbackUrl behavior.

### File List

- _bmad-output/epics.md
- _bmad-output/architecture.md
- _bmad-output/project-context.md
- travelblogs/src/middleware.ts
- travelblogs/src/app/sign-in/page.tsx
