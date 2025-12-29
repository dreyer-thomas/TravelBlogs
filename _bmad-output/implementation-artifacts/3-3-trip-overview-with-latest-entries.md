# Story 3.3: Trip Overview with Latest Entries

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want to see a trip overview with the latest entries first,
so that I can quickly access the most recent updates.

## Acceptance Criteria

1. Given I open a trip, when the trip overview loads, then I see the latest entries at the top in reverse chronological order (newest to oldest).
2. Given the trip overview loads, then each entry shows its title, date, and a preview image.
3. Given the trip has no entries, when I open the trip overview, then I see a clear empty state.

## Tasks / Subtasks

- [x] Add a public trip overview API response for read-only viewing (AC: 1, 2, 3)
  - [x] Create a public, unauthenticated read endpoint (new route) that returns trip metadata plus entry summaries for a trip
  - [x] Ensure response follows `{ data, error }` and `{ error: { code, message } }` formats
  - [x] Sort entries by `createdAt` descending (newest first) in the API or sort client-side consistently
  - [x] Return minimal fields needed for overview: `id`, `tripId`, `title`, `createdAt`, `coverImageUrl`, `media[]` (if needed for fallback preview)
- [x] Build trip overview UI for viewers (AC: 1, 2, 3)
  - [x] Add a new public trip overview page (do not modify creator-only trip detail page)
  - [x] Render trip header plus entry cards sorted newest-first with title, date, and preview image
  - [x] Clicking an entry navigates to `/entries/:id` (public reader) without introducing new reader UI
  - [x] Render a clear empty state if the trip has no entries
- [x] Add tests (AC: 1, 2, 3)
  - [x] API test: overview returns newest-first ordering and includes required summary fields
  - [x] Component test: overview renders entry cards with title/date/preview and empty state when no entries

## Dev Notes

### Developer Context (Purpose + UX Intent)
- This story introduces a public trip overview so viewers can scan the newest entries first and jump into the latest update quickly.
- UX expectations: media-first previews, clean entry list, and a calm, readable overview that reinforces the Atlas Path direction.

### Epic Context and Dependencies
- Epic 3 focus is fast entry reading with clear navigation; this overview should funnel users into the existing entry reader.
- Story 3.1 provides the public entry reader (`/entries/[id]`); reuse it for navigation targets.
- Story 3.2 added entry navigation; do not recreate navigation logic here.
- Story 4 (shareable links) is not in scope; do not add link-generation or access controls beyond public read.

### UX Requirements
- Latest entry appears at the top of the overview list (reverse chronological order).
- Each entry card shows title, date, and a preview image.
- Empty state should be friendly, clear, and avoid dead-end UI.
- Maintain typography (Fraunces headings, Source Serif 4 body) and warm palette from UX spec.

### Technical Requirements
- Keep the overview read-only and public (no auth required) to align with viewer access.
- Use Next.js Image with lazy loading for entry preview images.
- Preview image selection priority:
  1) `coverImageUrl` (if present),
  2) first media URL,
  3) first inline image from entry text (if already available in summary),
  4) fallback placeholder.
- Do not return full entry text for the overview unless required for preview extraction; prefer summary fields.

### API Contract Notes
- Introduce a public read endpoint separate from creator-only trip/entry APIs.
- Response shape must be `{ data, error }` with errors `{ error: { code, message } }`.
- Suggested response payload:
  - `trip: { id, title, startDate, endDate, coverImageUrl }`
  - `entries: [{ id, tripId, title, createdAt, coverImageUrl, media[] }]`

### Performance & Accessibility Guardrails
- Keep overview payload small; avoid heavy media lists if not needed for previews.
- Ensure list layout is responsive and uses 44x44 touch targets for entry cards.
- Provide clear focus states for keyboard navigation.

### Architecture Compliance
- App Router only; new public overview page should be in `src/app/`.
- REST endpoints are plural and live under `src/app/api`.
- Use feature-based components under `src/components/<feature>/`.
- Tests live in `tests/` only.

### Library / Framework Requirements
- Next.js App Router + React + TypeScript.
- Tailwind CSS styling; reuse existing tokens/palette.
- Prisma 7.2.0 for data access; Zod 4.2.1 for validation if needed.

### File Structure Requirements
- New public overview page: `src/app/...` (create a new route; do not alter `src/app/trips/[tripId]/page.tsx` creator view).
- New UI component: `src/components/trips/` (e.g., `trip-overview.tsx` or `trip-overview-card.tsx`).
- New public API route: `src/app/api/...` (separate from authenticated trip routes).
- Tests: `tests/api/` and `tests/components/` only.

### Testing Requirements
- API: verify response ordering (newest first) and required fields.
- Components: verify entry cards render title/date/preview image and empty state displays.
- Ensure tests assert `{ data, error }` response wrapper.

### Previous Story Intelligence (Story 3.2)
- Public entry reader exists at `src/app/entries/[id]/page.tsx`; link overview cards to this route.
- Preserve media-first reading flow; overview is a gateway, not a new reader.
- Keep response shape and error format consistent with existing API tests.

### Recent Git History Signals
- Recent work focused on entry reader UI and media viewer patterns.
- Reuse existing entry/media utilities (e.g., inline image extraction) instead of duplicating logic.
- Keep styling consistent with entry reader and trip detail components.

### Latest Tech Verification (Deferred)
- No web research performed; use pinned versions from `_bmad-output/architecture.md` and `_bmad-output/project-context.md`.

### Project Context Reference
- App Router only; API routes in `src/app/api`.
- Response shape `{ data, error }`, errors `{ error: { code, message } }`.
- Components `PascalCase`, files `kebab-case.tsx`.
- Tests in central `tests/` only.
- Use `next/image` with lazy loading for media.

### References
- [Source: _bmad-output/epics.md#Story 3.3: Trip Overview with Latest Entries]
- [Source: _bmad-output/ux-design-specification.md#Core User Experience]
- [Source: _bmad-output/ux-design-specification.md#Component Strategy]
- [Source: _bmad-output/architecture.md#Frontend Architecture]
- [Source: _bmad-output/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: travelblogs/src/components/trips/trip-detail.tsx]

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

### Implementation Plan

- Add public overview API (read-only trip + entry summaries) with newest-first ordering.
- Add public trip overview page and entry cards linking to `/entries/:id`.
- Add API/component tests for ordering, summary fields, and empty state.
- Guard public entry reads against non-creator-owned trips.
- Add public overview page UI with entry cards and empty state.

### Completion Notes List

- Added public trip overview API response with newest-first entry summaries.
- Added API test covering overview ordering and required summary fields.
- Guarded public entry reads against non-creator-owned trips to preserve access rules.
- Added public trip overview page UI with newest-first entry cards and empty state.
- Added component test for trip overview cards and empty state.
- Tests: `npm test`.
- Added overview access guard to match public entry rules.
- Removed client-side resorting to preserve API ordering behavior.
- Added API coverage for empty-overview and non-creator trip access.
- Added component coverage for entry card link targets.
- Tests: not run (post-review fixes).

### File List

- src/app/api/trips/[id]/overview/route.ts
- src/app/api/entries/[id]/route.ts
- tests/api/trips/trip-overview.test.ts
- src/app/trips/[tripId]/overview/page.tsx
- src/components/trips/trip-overview.tsx
- tests/components/trip-overview.test.tsx

### Change Log

- 2025-12-29: Story 3.3 created.
- 2025-12-28: Implemented public trip overview API and UI with tests.

### Story Completion Status

Status: done
