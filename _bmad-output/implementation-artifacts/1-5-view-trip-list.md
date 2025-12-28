# Story 1.5: View Trip List

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want to see a list of my trips,
so that I can quickly access and manage them.

## Acceptance Criteria

1. **Given** I am a creator with one or more trips
   **When** I open the trips area
   **Then** I see a list of my trips with basic metadata (title, dates, cover)
2. **Given** I have no trips yet
   **When** I open the trips area
   **Then** I see an empty state with a clear call to create a trip

## Tasks / Subtasks

- [x] Trip list data (AC: 1, 2)
  - [x] Ensure `GET /api/trips` returns creator-owned trips with `id`, `title`, `startDate`, `endDate`, `coverImageUrl`, and `updatedAt`
  - [x] Enforce creator-only access with Auth.js session checks
  - [x] Return `{ data, error }` and ISO 8601 date strings
- [x] Trip list UI (AC: 1)
  - [x] Render the trip list in `src/app/trips/page.tsx` using server-side data fetching
  - [x] Show trip cards with cover image, title, and date range
  - [x] Link each card to `/trips/:id`
- [x] Empty state UX (AC: 2)
  - [x] Show a friendly empty state with a primary CTA to create a trip
- [x] Tests (AC: 1, 2)
  - [x] Add API tests for list success + unauthorized
  - [x] Add component test for list + empty state if component harness exists

## Dev Notes

### Developer Context

- Trip creation, deletion, and metadata edit already exist; reuse their auth, API response, and error patterns.
- The trip detail page already renders metadata and uses owner checks; keep list links consistent with `/trips/:id`.
- Regression guardrail: do not rename or restructure existing trip routes, auth helpers, or response utilities.
- Performance guardrail: avoid loading full trip details; list should only fetch the fields needed for cards.

### Technical Requirements

- **API:** `GET /api/trips` in `src/app/api/trips/route.ts` must return creator-owned trips only.
- **Auth:** Use the same Auth.js session check as existing trip endpoints (`getToken` + creator validation).
- **Data:** Return `id`, `title`, `startDate`, `endDate`, `coverImageUrl`, `updatedAt` at minimum.
- **Dates:** Serialize all dates as ISO 8601 strings in JSON.
- **Ordering:** Preserve any existing ordering; if adding ordering, use `updatedAt` desc for most-recent-first and document it in code.
- **Pagination:** If list size grows, add simple `limit`/`offset` (camelCase) with safe defaults (e.g., `limit=20`).
- **Errors:** Always return `{ data: null, error: { code, message } }` for failures.

### Architecture Compliance

- App Router only; all API routes under `src/app/api`.
- REST endpoints are plural (`/trips`) with `:id` params.
- Response shape must be `{ data, error }` with `{ error: { code, message } }`.
- Naming: `camelCase` vars/JSON, `PascalCase` components, `kebab-case.tsx` files.
- Tests must live under `tests/` (no co-located tests).
- Shared helpers live in `src/utils/`; do not add `lib/`.

### Library/Framework Requirements

- Next.js App Router + TypeScript.
- Prisma 7.2.0 with SQLite for data access.
- Zod 4.2.1 only if validation is needed (server-side only).
- Auth.js (NextAuth) 4.24.13 with JWT sessions for auth checks.
- Redux Toolkit 2.11.2 only if existing list state pattern requires it; prefer server rendering.

### File Structure Requirements

- API: `src/app/api/trips/route.ts` (`GET` list) and `src/app/api/trips/[id]/route.ts` for detail actions.
- UI: `src/app/trips/page.tsx` plus `src/components/trips/trip-card.tsx` or `src/components/trips/trip-list.tsx`.
- Utils: `src/utils/` for shared formatting helpers if required (avoid `lib/`).
- Tests: `tests/api/trips/list-trips.test.ts`, `tests/components/trips/trip-list.test.tsx` (if harness exists).

### Testing Requirements

- API tests: list success, unauthorized, and response shape assertions.
- Component tests if harness exists: list renders metadata, empty state CTA visible when no trips.
- Ensure test expectations use `{ data, error }` and `{ error: { code, message } }`.

### UX Requirements

- Trip cards show cover image (if present), title, and date range in a scannable layout.
- Use Next.js Image with lazy loading for cover images.
- Empty state includes a clear primary CTA to create a trip.
- Empty state copy: “No trips yet. Create your first trip to start capturing your journey.”
- Preserve existing visual language: ivory background, terracotta accents, teal primary, Fraunces headings, Source Serif 4 body.
- Maintain 44x44 touch targets and visible focus states.

### Previous Story Intelligence

- Story 1.4 established `PATCH /api/trips/[id]` with creator-only auth, `{ data, error }` responses, and ISO 8601 dates.
- Trip detail page already loads data server-side and uses owner checks; mirror that pattern for list rendering.
- Validation and error handling patterns should match create/edit/delete trip endpoints to avoid regressions.

### Cross-Story Dependencies

- Relies on Story 1.2 (Create Trip) for Trip model fields and create flow.
- Should align with Story 1.3/1.4 list refresh patterns and auth checks to avoid drift.

### Data Model Notes

- Trip model fields used by list: `id`, `title`, `startDate`, `endDate`, `coverImageUrl`, `updatedAt`, `ownerId`.
- Ownership filter must use `ownerId` from Auth.js session to prevent cross-user data exposure.

### Security Notes

- List endpoint must be creator-only; viewers should never receive trip data.
- Return `UNAUTHORIZED` for missing/invalid sessions and `FORBIDDEN` for non-creator roles.

### Performance Notes

- Fetch only list fields; avoid loading entries or media payloads.
- If you add pagination, default to small limits and document query params.

### Environment & Deployment Notes

- Use `.env` and `.env.example` only; do not introduce `.env.local`.
- No Docker/TLS proxy changes in MVP.

### Integration Notes

- Use Prisma client via existing `src/utils/db.ts`.
- Use Next.js Image for cover rendering (lazy-load).

### Git Intelligence Summary

- Most recent commit: `2025015` "Story 1-4 edit trip metadata".
- Expect recent patterns in `src/app/api/trips/[id]/route.ts`, `src/app/trips/[id]/page.tsx`, and `src/components/trips/`.

### Recent Test Patterns

- Follow existing `tests/api/trips/*.test.ts` conventions for auth + response shape assertions.

### Project Context Reference

- Global rules live in `_bmad-output/project-context.md` (App Router, REST routes under `src/app/api`, `{ data, error }` wrapper, plural endpoints, camelCase JSON, tests in `tests/`).

### References

- Story source: `_bmad-output/epics.md` (Epic 1, Story 1.5)
- Architecture rules: `_bmad-output/architecture.md` (API patterns, structure, stack)
- UX patterns: `_bmad-output/ux-design-specification.md` (cards, typography, accessibility)
- Previous story context: `_bmad-output/implementation-artifacts/1-4-edit-trip-metadata.md`
- Global rules: `_bmad-output/project-context.md`

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

N/A

### Implementation Plan

- Add list endpoint for creator-only trips with ISO date serialization.
- Render server-side trip list with card layout and cover images.
- Provide empty state CTA and validate with API tests.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Web research skipped due to restricted network access.
- Git history reviewed; single recent commit used for pattern alignment.
- Previous story learnings captured for API/auth/response consistency.
- Implemented `GET /api/trips` with creator-only access and ISO date list response.
- Added list API tests and confirmed `npm test` passes.
- Rendered server-side trip list UI with cover-image cards and detail links.
- Added empty state copy and primary CTA for new trips.
- Component test skipped: no component test harness present in `tests/components`.
- Marked story status as review and updated sprint status.
- Allowed external cover images via Next Image remote patterns and stabilized date rendering in UTC.
- Added list API test for non-creator `FORBIDDEN` responses.
- Documented git discrepancies outside this story scope (Codex logs, other story artifacts, config edits).
- Replaced list navigation anchors with Next.js Link for client-side routing.

### File List

- `_bmad-output/implementation-artifacts/1-5-view-trip-list.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `travelblogs/next.config.ts`
- `travelblogs/src/app/api/trips/route.ts`
- `travelblogs/src/app/trips/page.tsx`
- `travelblogs/src/components/trips/trip-card.tsx`
- `travelblogs/tests/api/trips/list-trips.test.ts`

### Change Log

- 2025-12-22: Created ready-for-dev story context for trip list view.
- 2025-12-22: Implemented trip list API, UI, empty state, and tests.
- 2025-12-22: Code review fixes (image config, UTC date display, forbidden test).
- 2025-12-22: Replaced list anchors with Next.js Link.

## Story Completion Status

Status: done

Completion note: Trip list view verified with image config, UTC date display, and expanded API tests.
