# Story 4.1: Create Shareable Trip Link

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want to generate a shareable link for a trip,
so that I can invite others to view it without requiring an account.

## Acceptance Criteria

1. **Given** I am a creator viewing a trip I own  
   **When** I generate a shareable link  
   **Then** I receive a unique, unguessable URL for that trip
2. **Given** I copy the shareable link and open it  
   **When** the trip loads  
   **Then** I can view the trip without signing in

## Tasks / Subtasks

- [x] Add a share link data model and migration for per-trip tokens (AC: 1)
  - [x] Create a singular Prisma model for the trip share link with tripId, token, createdAt
  - [x] Enforce one active share link per trip (unique tripId + token)
- [x] Create API support for generating a share link (AC: 1)
  - [x] Add a protected POST endpoint under `src/app/api/trips/[id]/share-link/route.ts`
  - [x] Generate a cryptographically random token and return a full share URL in `{ data, error }`
- [x] Add a public share view route (AC: 2)
  - [x] Add a read-only route under `src/app/trips/share/[token]/page.tsx`
  - [x] Add a public API route to resolve token → trip overview data
- [x] Surface the share link in the trip UI (AC: 1)
  - [x] Add a Share panel/button in trip detail to create or reveal the link
  - [x] Show copyable share URL with clear helper text

## Dev Notes

- Relevant architecture patterns and constraints
  - App Router only; API routes live under `src/app/api` with plural endpoints.
  - Responses must be wrapped as `{ data, error }` with errors `{ error: { code, message } }`.
  - Use Auth.js JWT for creator-only endpoints; shareable link access must remain public.
  - Use SQLite + Prisma 7.2.0; table names singular, columns camelCase.
  - Dates in JSON must be ISO 8601 strings.
  - Share links must be unguessable; use cryptographically random tokens (at least 32 bytes) and base64url encode.
- Source tree components to touch
  - API: `src/app/api/trips/[id]/share-link/route.ts` (new), `src/app/api/trips/[id]/overview/route.ts` (reference).
  - UI: `src/app/trips/share/[token]/page.tsx` (new), `src/components/trips/trip-detail.tsx` (share control), optional new component under `src/components/trips/`.
  - Data: `prisma/schema.prisma` (new model + migration).
  - Middleware: `src/middleware.ts` (allow public share route).
- Testing standards summary
  - Tests live under `tests/` (no colocated tests).
  - Use API error format in expectations.

### Developer Context: Share Link Flow

- Creator generates link from trip detail (authenticated).
- Server creates or returns the existing share token for the trip.
- Public visitor opens `/trips/share/[token]` and receives a read-only trip overview.
- Public view must not require sign-in and must not expose trip edit actions.

### Technical Requirements

- Data model
  - Add `TripShareLink` model with fields: `id`, `tripId`, `token`, `createdAt`.
  - Enforce one active share link per trip (unique `tripId`).
  - Token must be unique (unique `token`).
- Creator API
  - `POST /api/trips/[id]/share-link` requires creator auth.
  - If a share link exists for the trip, return it; otherwise create one.
  - Response: `{ data: { shareUrl, token, tripId }, error: null }`.
- Public API
  - `GET /api/trips/share/[token]` (or similar) does not require auth.
  - Resolve token to trip + entries for read-only view.
  - Return 404 for invalid token; do not leak whether a trip exists.
- UI
  - Trip detail page shows a Share action.
  - If link exists, show it with copy-to-clipboard.
  - If not, allow creator to generate it.
  - Public share page uses the same Trip Overview UI pattern (latest entries first).

### Architecture Compliance

- App Router only; new public share page lives under `src/app/trips/share/[token]/page.tsx`.
- REST endpoints remain plural; keep error and response wrappers.
- Use `next-auth/jwt` for creator endpoints; no auth for public share route.
- Keep data access through Prisma; do not bypass models.

### Library/Framework Requirements

- Use `crypto` from Node.js for token generation (`crypto.randomBytes`).
- Use Next.js `fetch` in server components; handle `{ data, error }`.
- Use Next.js Image for cover images and media thumbnails.

### File Structure Requirements

- API routes:
  - `src/app/api/trips/[id]/share-link/route.ts` for creator link generation.
  - `src/app/api/trips/share/[token]/route.ts` for public resolution.
- UI routes:
  - `src/app/trips/share/[token]/page.tsx` for public trip view.
- Components:
  - Add any new share UI under `src/components/trips/`.

### Testing Requirements

- Add tests in `tests/api` for:
  - creator share link creation (auth required).
  - public share resolution (no auth).
  - invalid token returns 404 with `{ data: null, error }`.
- Add a UI test in `tests/components` for Share panel (render link + copy).

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
  - API routes under `src/app/api`.
  - New share UI under `src/components/trips`.
- Detected conflicts or variances (with rationale)
  - Current middleware blocks all `/trips/*` paths; must allow `/trips/share/[token]` explicitly.

### Project Context Reference

- Follow API response wrapper and error format rules.
- Keep table names singular and JSON keys camelCase.
- Tests must live in `tests/` (no colocated tests).
- Do not introduce Docker/TLS proxy for MVP work.

### References

- Epic 4 story definition and acceptance criteria. [Source: _bmad-output/epics.md#Epic 4: Simple Sharing]
- Shareable links must be unguessable; public viewing requires no sign-in. [Source: _bmad-output/epics.md#Story 4.1: Create Shareable Trip Link]
- Architecture constraints: App Router, REST API patterns, auth, Prisma, error format. [Source: _bmad-output/architecture.md#Core Architectural Decisions]
- Global agent rules for API response format, naming, tests, and routes. [Source: _bmad-output/project-context.md#Critical Implementation Rules]

## Story Completion Status

- Status: review
- Completion note: Shareable link flow implemented with API, public view, UI, and tests passing.

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

- N/A

### Implementation Plan

- Add TripShareLink Prisma model with one-to-one relation to Trip and unique tripId/token constraints.
- Create migration for TripShareLink table and unique indexes.
- Add model-level tests covering creation and uniqueness enforcement.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added TripShareLink model and migration; enforced unique tripId/token; added model tests; updated entry delete test data for required title.
- Added share link POST API with auth and ownership checks plus tests for creation, reuse, and access control.
- Added public share API + page rendering trip overview without entry links; added public share token tests.
- Added share link panel in trip detail with copy action and UI test coverage.
- Added share link lookup, proxy-safe share URL generation, and token collision retries with test coverage.
- Suppressed default "Entry photo" captions in media gallery for shared entry views.
- Added fullscreen viewer and slideshow controls to shared entry reader via media gallery interactions.

### File List

- travelblogs/prisma/schema.prisma
- travelblogs/prisma/migrations/20251229120000_add_trip_share_link/migration.sql
- travelblogs/tests/api/trips/trip-share-link-model.test.ts
- travelblogs/tests/api/trips/share-link.test.ts
- travelblogs/tests/api/entries/delete-entry.test.ts
- travelblogs/src/app/api/trips/[id]/share-link/route.ts
- travelblogs/src/app/api/trips/share/[token]/route.ts
- travelblogs/src/app/trips/share/[token]/page.tsx
- travelblogs/src/components/trips/trip-overview.tsx
- travelblogs/tests/api/trips/share-trip-overview.test.ts
- travelblogs/src/components/trips/trip-detail.tsx
- travelblogs/tests/components/trip-share-panel.test.tsx
- travelblogs/src/components/media/media-gallery.tsx
- travelblogs/src/components/entries/entry-reader.tsx
- travelblogs/tests/components/entry-reader.test.tsx
- travelblogs/tests/components/media-gallery.test.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/4-1-create-shareable-trip-link.md

### Change Log

- 2025-12-29: Implemented share link API, public view, and trip UI share panel with tests.
- 2025-12-29: Hid default "Entry photo" captions in the media gallery.
- 2025-12-29: Enabled fullscreen viewer + slideshow on shared entry reader.
- 2025-12-29: Fixed share link lookup, proxy-safe URLs, collision retries, and shared overview entry links.
