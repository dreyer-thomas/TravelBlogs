# Story 4.3: Revoke Shareable Link

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want to revoke a trip's shareable link,
so that the trip is no longer accessible via that link.

## Acceptance Criteria

1. **Given** I am a creator viewing a trip I own
   **When** I revoke the shareable link
   **Then** the link is disabled and no longer grants access
2. **Given** I open a revoked link
   **When** the trip is requested
   **Then** I see an access denied or not found message

## Tasks / Subtasks

- [x] Implement revoke API for a trip share link (AC: 1, 2)
  - [x] Choose REST shape under App Router (e.g., `DELETE /api/trips/[id]/share-link` or `PATCH /api/trips/[id]/share-link` with action)
  - [x] Require creator auth + trip ownership checks (reuse existing share-link auth/ownership helpers)
  - [x] Revoke by removing the `TripShareLink` record (preferred) or marking it revoked in a safe, queryable way
  - [x] Return `{ data: { revoked: true, tripId }, error: null }` and keep ISO 8601 dates if included
- [x] Ensure public share endpoints reject revoked links (AC: 2)
  - [x] `GET /api/trips/share/[token]` returns 404/denied for revoked or missing token
  - [x] `GET /api/trips/share/[token]/entries/[entryId]` also rejects revoked tokens
  - [x] Do not leak whether a trip exists when token is invalid
- [x] Update share UI to allow revocation (AC: 1)
  - [x] Add a destructive "Revoke link" action in the share panel with confirm modal
  - [x] Clear displayed link state after revoke and show "Link revoked" status
  - [x] Keep share panel layout consistent with existing trip detail UI
- [x] Tests (AC: 1-2)
  - [x] API test: revoke removes or invalidates token and returns expected response
  - [x] API test: revoked token returns 404/denied on public share routes
  - [x] UI test: share panel shows revoke action + updates state after revoke

## Dev Notes

- Relevant architecture patterns and constraints
  - App Router only; API routes live under `src/app/api` with plural endpoints.
  - Responses must be wrapped `{ data, error }` with `{ error: { code, message } }`.
  - Use Auth.js JWT for creator-only endpoints; public share access stays unauthenticated.
  - Use SQLite + Prisma 7.2.0; table names singular, columns camelCase.
  - Dates in JSON must be ISO 8601 strings.
  - Performance targets: public share resolve must keep entry switching under 1s and trip load 2-5s.
  - Deployment constraints: no Docker or TLS proxy in MVP; `.env` + bare Node process on NAS only.
- Source tree components to touch
  - API: `src/app/api/trips/[id]/share-link/route.ts` (extend with DELETE/PATCH revoke)
  - API (public): `src/app/api/trips/share/[token]/route.ts`
  - API (public entries): `src/app/api/trips/share/[token]/entries/[entryId]/route.ts`
  - UI: `src/components/trips/trip-detail.tsx` (share panel), optional new component under `src/components/trips/`
  - Data: `prisma/schema.prisma` (TripShareLink; no schema change required if deleting row)
  - Middleware: `src/middleware.ts` (keep share routes public; avoid regressions)
- Testing standards summary
  - Tests live under `tests/` (no colocated tests).
  - Use API error format in expectations.

### Developer Context: Share Link Revocation Flow

- Creator clicks "Revoke link" from trip detail share panel.
- Server validates creator auth + ownership, revokes the `TripShareLink` row.
- Public share routes must deny access for revoked or missing tokens.
- UI should show revoked state and allow creating a new link via existing create/regenerate flow.

### Epic Context & Dependencies

- Epic 4 goal: frictionless sharing without accounts; revocation must not require sign-in for public share routes.
- Depends on Story 4.1 (create share link) and Story 4.2 (regenerate link) for shared link model and UI patterns.
- Reuse existing share link resolver and share panel instead of adding parallel flows.

### Technical Requirements

- Data model
  - Prefer deleting `TripShareLink` to revoke; ensure Prisma delete is scoped by tripId and owner.
  - If using a revoke flag instead, keep token unique and ensure public queries ignore revoked tokens.
- Creator API
  - Endpoint must require creator auth + ownership.
  - Response: `{ data: { revoked: true, tripId }, error: null }`.
- Public API
  - `GET /api/trips/share/[token]` must return 404/denied for revoked tokens.
  - `GET /api/trips/share/[token]/entries/[entryId]` must also reject revoked tokens.
  - Do not leak whether a trip exists when token is invalid.
- UI
  - Confirm before revoke (destructive action).
  - Clear link display after revoke and show revoked state.
  - Keep share panel layout consistent with existing trip detail UI.

### Architecture Compliance

- App Router only; API routes under `src/app/api`.
- REST endpoints remain plural; keep error and response wrappers.
- Use Prisma for persistence; no direct DB access bypass.
- Keep public share routes unauthenticated.

### Library/Framework Requirements

- Use Node `crypto.randomBytes` only if a new token is generated in the revoke flow (avoid unnecessary regeneration).
- Use Next.js `fetch` in server components; handle `{ data, error }` wrapper.
- Use Next.js Image for media thumbnails in shared views.

### File Structure Requirements

- API routes under `src/app/api`:
  - `src/app/api/trips/[id]/share-link/route.ts`
  - `src/app/api/trips/share/[token]/route.ts`
  - `src/app/api/trips/share/[token]/entries/[entryId]/route.ts`
- UI components under `src/components/trips/`.

### Testing Requirements

- Tests in `tests/api`:
  - Revoke removes or invalidates token and returns expected response.
  - Revoked token returns 404/denied on public share routes.
- Tests in `tests/components`:
  - Share panel shows revoke action and updates display state.

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
  - API routes under `src/app/api` and tests under `tests/`.
  - Share UI under `src/components/trips`.
- Detected conflicts or variances (with rationale)
  - None expected; extend existing share link flow and public share routes.

### Previous Story Intelligence

- Story 4.2 implemented share link regeneration with token rotation and updated public share guards.
- Share link generation uses `crypto.randomBytes` and returns a full share URL.
- Middleware explicitly allows `/trips/share/[token]` to remain public.
- Recent fixes were made to shared trip view clickability and media gallery rendering; avoid regressions in shared views.

### Git Intelligence Summary

- Recent commits touched shared trip view (`src/app/trips/share/[token]/page.tsx`) and entry reader/media gallery.
- Share link flow and public share API/tests already exist and follow response wrapper conventions.
- Regression risk: changes to share panel or share page should avoid breaking media gallery behavior or click targets.

### Latest Tech Information

- No external web research completed (network access not enabled). Use project-specified versions for Next.js, Prisma, Auth.js, Redux Toolkit, and Zod.

### Project Context Reference

- Follow API response wrapper and error format rules.
- Keep table names singular and JSON keys camelCase.
- Tests must live in `tests/` (no colocated tests).
- Do not introduce Docker/TLS proxy for MVP work.

### References

- Epic 4 story definition and acceptance criteria. [Source: _bmad-output/epics.md#Story 4.3: Revoke Shareable Link]
- Shareable links must be unguessable; public viewing requires no sign-in. [Source: _bmad-output/epics.md#Epic 4: Simple Sharing]
- Architecture constraints: App Router, REST API patterns, auth, Prisma, error format. [Source: _bmad-output/architecture.md#Core Architectural Decisions]
- Global agent rules for API response format, naming, tests, and routes. [Source: _bmad-output/project-context.md#Critical Implementation Rules]

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

- N/A

### Implementation Plan

- Implement DELETE revoke endpoint on share-link route and remove TripShareLink row.
- Add API tests covering revoke response and public route denial after revoke.

### Completion Notes List

- Added DELETE revoke endpoint with creator/ownership checks and { revoked, tripId } response.
- Public share routes already deny access when token is removed; covered in revoke tests.
- Tests: `npm test -- tests/api/trips/share-link.test.ts`
- Added share panel revoke modal with destructive action and revoked status state.
- Tests: `npm test -- tests/components/trip-share-panel.test.tsx`
- Added share-link not-found pages to show a revoked message on direct navigation.
- Added tests for shared not-found pages.
- Note: working tree contains unrelated changes; File List expanded to include story-related share files only.
- Tests: `npm test`
- Tests: `npm test -- tests/api/trips/share-link.test.ts tests/api/trips/share-trip-overview.test.ts tests/api/trips/share-trip-entry.test.ts tests/components/trip-share-panel.test.tsx tests/components/shared-trip-guard.test.tsx tests/components/shared-trip-not-found.test.tsx`

### File List

- _bmad-output/implementation-artifacts/4-3-revoke-shareable-link.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- travelblogs/src/app/api/trips/[id]/share-link/route.ts
- travelblogs/src/components/trips/trip-detail.tsx
- travelblogs/src/components/trips/shared-trip-guard.tsx
- travelblogs/src/app/trips/share/[token]/page.tsx
- travelblogs/src/app/trips/share/[token]/not-found.tsx
- travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx
- travelblogs/src/app/trips/share/[token]/entries/[entryId]/not-found.tsx
- travelblogs/src/app/api/trips/share/[token]/route.ts
- travelblogs/src/app/api/trips/share/[token]/entries/[entryId]/route.ts
- travelblogs/tests/api/trips/share-link.test.ts
- travelblogs/tests/api/trips/share-trip-overview.test.ts
- travelblogs/tests/api/trips/share-trip-entry.test.ts
- travelblogs/tests/components/trip-share-panel.test.tsx
- travelblogs/tests/components/shared-trip-guard.test.tsx
- travelblogs/tests/components/shared-trip-not-found.test.tsx
