# Story 4.2: Regenerate Shareable Link

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want to regenerate a trip's shareable link,
so that I can invalidate an old link if it was shared too broadly.

## Acceptance Criteria

1. **Given** I am a creator viewing a trip I own  
   **When** I regenerate the shareable link  
   **Then** a new unique, unguessable URL is created  
   **And** the previous link no longer grants access
2. **Given** I open the new shareable link  
   **When** the trip loads  
   **Then** I can view the trip without signing in
3. **Given** I open the previous shareable link after regeneration  
   **When** the trip is requested  
   **Then** I see an access denied or not found message

## Tasks / Subtasks

- [x] Add API support to regenerate an existing share link (AC: 1, 3)
  - [x] Decide on route shape (e.g., `POST /api/trips/[id]/share-link/regenerate` or `PATCH /api/trips/[id]/share-link`) and keep REST plural
  - [x] Require creator auth and trip ownership checks (reuse existing share-link auth pattern)
  - [x] Rotate token with `crypto.randomBytes`, update `TripShareLink` record, update `createdAt`
  - [x] Return `{ data: { shareUrl, token, tripId }, error: null }` with ISO date strings if included
- [x] Update share link UI to allow regeneration (AC: 1)
  - [x] Add a "Regenerate link" action in share panel with confirmation
  - [x] Replace displayed link and copy-to-clipboard state after regeneration
- [x] Ensure old links are invalidated (AC: 1, 3)
  - [x] Public share resolver must fail for the old token (404 or access denied)
  - [x] Add regression coverage to ensure old token no longer resolves
- [x] Tests (AC: 1-3)
  - [x] API test: regenerate link rotates token and returns new URL
  - [x] API test: old token returns 404/denied on public share route
  - [x] UI test: share panel shows regeneration state + new link

## Dev Notes

- Relevant architecture patterns and constraints
  - App Router only; API routes live under `src/app/api` with plural endpoints.
  - Responses must be wrapped `{ data, error }` with `{ error: { code, message } }`.
  - Use Auth.js JWT for creator-only endpoints; public share access stays unauthenticated.
  - Use SQLite + Prisma 7.2.0; table names singular, columns camelCase.
  - Dates in JSON must be ISO 8601 strings.
  - Performance targets: share link regeneration should be fast; public share resolve must keep entry switching under 1s and trip load 2-5s.
  - Deployment constraints: no Docker or TLS proxy in MVP; `.env` + bare Node process on NAS only.
  - Integration patterns: public share uses existing trip overview resolver and media gallery patterns; avoid introducing new external services.
- Source tree components to touch
  - API: `src/app/api/trips/[id]/share-link/route.ts` (extend or add regenerate route)
  - API (public): `src/app/api/trips/share/[token]/route.ts` (ensure invalid old token fails)
  - UI: `src/components/trips/trip-detail.tsx` (share panel), optional new component under `src/components/trips/`
  - Data: `prisma/schema.prisma` (TripShareLink already exists)
  - Middleware: `src/middleware.ts` (share route already allowed; avoid regressions)
- Testing standards summary
  - Tests live under `tests/` (no colocated tests).
  - Use API error format in expectations.

### Developer Context: Share Link Rotation Flow

- Creator requests regeneration from trip detail (authenticated).
- Server rotates token on the single `TripShareLink` row for the trip.
- Old token must no longer resolve; public route returns 404/denied.
- New token resolves to the same public trip overview (read-only).

### Epic Context & Dependencies

- Epic 4 goal: enable frictionless sharing without accounts; share links must remain unguessable and public-view friendly.
- Dependencies: Story 4.1 share link generation and public share page already exist and must be extended, not replaced.
- Do not introduce any new auth gates for `/trips/share/[token]`.

### Technical Requirements

- Data model
  - Reuse `TripShareLink` with unique `tripId` and `token`.
  - Regeneration updates `token` and `createdAt` (or add `updatedAt` if present).
- Creator API
  - Endpoint must require creator auth + ownership.
  - If no share link exists, either create then rotate, or return a clear error (align with UI behavior).
  - Response: `{ data: { shareUrl, token, tripId }, error: null }`.
- Public API
  - `GET /api/trips/share/[token]` must return 404/denied for revoked tokens.
  - Do not leak whether a trip exists when token is invalid.
- UI
  - Confirm before regeneration (destructive action).
  - Update the displayed link and copy state immediately after success.
  - Keep share panel layout consistent with existing trip detail UI.

### Architecture Compliance

- App Router only; API routes under `src/app/api`.
- REST endpoints remain plural; keep error and response wrappers.
- Use Prisma for persistence; no direct DB access bypass.
- Keep public share routes unauthenticated.

### Library/Framework Requirements

- Use Node `crypto.randomBytes` for token generation.
- Use Next.js `fetch` in server components; handle `{ data, error }`.
- Use Next.js Image for media thumbnails in shared views.

### File Structure Requirements

- API routes under `src/app/api`:
  - `src/app/api/trips/[id]/share-link/route.ts` or `src/app/api/trips/[id]/share-link/regenerate/route.ts`
  - `src/app/api/trips/share/[token]/route.ts`
- UI components under `src/components/trips/`.

### Testing Requirements

- Tests in `tests/api`:
  - Regenerate rotates token and returns new URL.
  - Old token resolves to 404/denied.
- Tests in `tests/components`:
  - Share panel shows regenerate action and updates displayed URL.

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
  - API routes under `src/app/api`.
  - New share UI under `src/components/trips`.
- Detected conflicts or variances (with rationale)
  - None expected; reuse existing share link flow and public share route.

### Previous Story Intelligence

- Story 4.1 already introduced `TripShareLink` and the public share page.
- Share link generation uses `crypto.randomBytes` and returns a full share URL.
- Middleware explicitly allows `/trips/share/[token]` to remain public.
- Recent bugs fixed in shared view: ensure entry media/gallery and clickability remain intact.

### Git Intelligence Summary

- Recent commits touched shared trip view (`src/app/trips/share/[token]/page.tsx`) and entry reader/media gallery.
- Share link flow and public share API/tests already exist and follow response wrapper conventions.
- Regression risk: changes to share panel or share page should avoid breaking media gallery behavior or click targets.

### Latest Tech Information

- No external web research completed (network access not enabled). If needed, confirm library changes for Auth.js, Prisma, or Next.js before implementation.

### Project Context Reference

- Follow API response wrapper and error format rules.
- Keep table names singular and JSON keys camelCase.
- Tests must live in `tests/` (no colocated tests).
- Do not introduce Docker/TLS proxy for MVP work.

### References

- Epic 4 story definition and acceptance criteria. [Source: _bmad-output/epics.md#Epic 4: Simple Sharing]
- Shareable links must be unguessable; public viewing requires no sign-in. [Source: _bmad-output/epics.md#Story 4.2: Regenerate Shareable Link]
- Architecture constraints: App Router, REST API patterns, auth, Prisma, error format. [Source: _bmad-output/architecture.md#Core Architectural Decisions]
- Global agent rules for API response format, naming, tests, and routes. [Source: _bmad-output/project-context.md#Critical Implementation Rules]

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

- N/A

### Implementation Plan

- Add PATCH regeneration path to rotate share tokens with retries and updated `createdAt`.
- Update trip share panel to confirm regeneration and refresh link state.
- Extend API/UI tests to cover regeneration and invalidation.

### Completion Notes List

- Implemented PATCH share-link regeneration with token rotation and `createdAt` update.
- Added share panel regeneration flow with confirmation and link refresh.
- Added API/UI tests for regeneration and invalidation; ran `npm test`.
- Added no-store caching headers for public share API to prevent stale tokens.
- Added client-side share-link guard to invalidate already-open shared pages.
- Routed shared entry views through token-scoped pages and APIs to enforce revocation.
- Tightened middleware so creator-only entry routes require auth.
- Stopped shared link polling once a link is invalidated.
- Added coverage for old share tokens on shared entry routes.

### File List

- .codex/history.jsonl
- .codex/log/codex-tui.log
- .codex/sessions/2025/12/29/rollout-2025-12-29T01-05-53-019b676c-fac9-7a10-bd17-41105d67d0ac.jsonl
- .codex/sessions/2025/12/29/rollout-2025-12-29T14-38-32-019b6a54-f896-7e91-a12a-deb24825aed9.jsonl
- .codex/sessions/2025/12/29/rollout-2025-12-29T14-45-42-019b6a5b-8954-71e3-a70a-ced0eb0ff21d.jsonl
- .codex/sessions/2025/12/29/rollout-2025-12-29T15-08-48-019b6a70-b00a-77c2-a31f-9d492a8ec50c.jsonl
- .codex/version.json
- _bmad-output/implementation-artifacts/4-2-regenerate-shareable-link.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/validation-report-20251229T134244Z.md
- travelblogs/src/app/api/trips/[id]/share-link/route.ts
- travelblogs/src/app/api/trips/share/[token]/route.ts
- travelblogs/src/app/api/trips/share/[token]/entries/[entryId]/route.ts
- travelblogs/src/app/trips/share/[token]/page.tsx
- travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx
- travelblogs/src/components/trips/trip-detail.tsx
- travelblogs/src/components/trips/shared-trip-guard.tsx
- travelblogs/src/components/trips/trip-overview.tsx
- travelblogs/src/components/entries/entry-reader.tsx
- travelblogs/src/middleware.ts
- travelblogs/tests/api/trips/share-link.test.ts
- travelblogs/tests/api/trips/share-trip-overview.test.ts
- travelblogs/tests/api/trips/share-trip-entry.test.ts
- travelblogs/tests/components/trip-share-panel.test.tsx
- travelblogs/tests/components/shared-trip-guard.test.tsx
- travelblogs/tests/components/trip-overview.test.tsx
- travelblogs/tests/components/entry-reader.test.tsx

### Change Log

- 2025-12-29: Story 4.2 drafted with regeneration workflow, tests, and constraints.
- 2025-12-29: Implemented share-link regeneration API/UI and added tests.
- 2025-12-29: Prevented caching of public share API responses after regeneration.
- 2025-12-29: Added client-side share token validation for open tabs.
- 2025-12-29: Enforced shared entry access via token-scoped routes and APIs.
- 2025-12-29: Closed review findings for auth, share guard polling, and old token entry coverage.
