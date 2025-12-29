# Story 3.2: Entry Navigation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want to navigate between entries in a trip,
so that I can move through the story in order.

## Acceptance Criteria

1. Given I am viewing an entry in a trip, when I select next or previous entry, then I am taken to that entry without leaving the entry reader.
2. Given I am viewing an entry in a trip, when I select next or previous entry, then the entry content updates within the single-page view.
3. Given I am on the first or last entry, when I attempt to navigate past the bounds, then the unavailable direction is disabled or clearly indicated.

## Tasks / Subtasks

- [x] Add navigation metadata to the public entry read flow (AC: 1, 2, 3)
  - [x] Extend `GET /api/entries/[id]` to return adjacent entry IDs (and optional titles/dates) in chronological order
  - [x] Ensure navigation respects the same trip ordering used in trip timelines (oldest → newest)
  - [x] Keep `{ data, error }` response shape and error format `{ error: { code, message } }`
- [x] Update entry reader UI to render navigation controls (AC: 1, 2, 3)
  - [x] Add previous/next controls that link to `/entries/:id` and preserve the reader layout
  - [x] Disable or visually indicate unavailable direction at bounds
  - [x] Keep typography, spacing, and palette consistent with the reader layout (Fraunces + Source Serif 4, warm palette)
- [x] Confirm navigation behavior stays in the single-page reader experience (AC: 1, 2)
  - [x] Use App Router route transitions only; no separate pages or dialogs
  - [x] Preserve reader layout and media-first hierarchy during navigation
- [x] Add tests (AC: 1, 2, 3)
  - [x] API test: entry response includes correct prev/next metadata for a trip
  - [x] Component test: navigation controls render and respect disabled bounds

## Dev Notes

### Developer Context (Purpose + UX Intent)
- This story adds entry-to-entry navigation inside the existing single-page reader from Story 3.1.
- Maintain the immersive, media-first reading flow; navigation should feel lightweight and not disrupt the reading context.
- UX expectations: clear directional cues, obvious disabled states at first/last entries, no new page chrome.

### Epic Context and Dependencies
- Epic 3 goal: fast, media-first entry reading with clear navigation.
- Story 3.1 already created the entry reader layout; reuse and extend it.
- Story 3.3 will add trip overview; do not fold overview responsibilities into this story.
- Do not alter the private creator entry detail route (`/trips/[tripId]/entries/[entryId]`) or `EntryDetail` UI; navigation applies to the public reader only.

### Technical Requirements
- Base ordering for navigation is chronological by `createdAt` (oldest → newest).
- Add navigation metadata to the public entry read response (recommended fields):
  - `previousEntryId` and `nextEntryId`
  - Optional: `previousEntryTitle`, `nextEntryTitle`, `previousEntryDate`, `nextEntryDate` if needed for UI labels
- Use a single additional Prisma query to resolve adjacent entries; avoid N+1 patterns.
- Keep entry read path public for shared viewing; do not add auth gating to `/entries/:id` that blocks viewers.
- Preserve error shape `{ data, error }` and `{ error: { code, message } }`.
- Do not return adjacent entries from a different trip; adjacent resolution must be scoped to the current entry's `tripId`.

### Security and Performance Guardrails
- Public entry navigation must not expand access beyond the current trip or entry scope.
- Enforce trip scoping at the query level (adjacent entries filtered by `tripId`).
- Keep the adjacent lookup O(1) queries: a single query per direction with `createdAt` ordering.
- If a composite index on `(tripId, createdAt)` exists, use it implicitly; do not add migrations in this story unless required.

### Architecture Compliance
- App Router only; public entry view stays in `src/app/entries/[id]/page.tsx`.
- REST handlers stay under `src/app/api`.
- Server-side data fetching; client components only for UI interactivity as needed.
- Validation is server-side only (Zod).

### Library / Framework Requirements
- Next.js App Router + React + TypeScript.
- Tailwind CSS styling; match existing palette and layout tokens.
- Prisma 7.2.0 for DB access, Zod 4.2.1 for validation.

### Latest Tech Verification (Explicitly Deferred)
- No web research performed. Follow pinned versions in `_bmad-output/architecture.md` and `_bmad-output/project-context.md`.
- Defer external version checks because this story is a UI + API contract change using existing stack components only.

### Previous Story Intelligence (Story 3.1)
- `EntryReader` already implements media-first layout and body rendering; extend it rather than re-creating the reader.
- Public entry view route already exists: `src/app/entries/[id]/page.tsx` uses `/api/entries/[id]` and maps to `EntryReader`.
- `EntryDetail` and trip-specific entry pages are separate and should remain unchanged.
- Tests exist for entry reader and API shape; align new tests with current patterns in `tests/components/` and `tests/api/`.
- No recorded review corrections from Story 3.1; treat existing reader as the baseline for UI/UX.

### Recent Git History Signals
- Recent commits focused on entry media handling and reader UI (Stories 2.6 and 2.8).
- Reuse existing entry/media component patterns; avoid duplicating gallery or viewer logic.
- Keep API response shapes consistent with current tests expecting `{ data, error }`.

### Data Model and API Contract Notes
- Entries include `id`, `tripId`, `title`, `createdAt`, `media[]`, and `text`.
- Navigation metadata should be derived by `tripId` and `createdAt` ordering.
- Do not change response wrapper or error format.
- Suggested response extension:
  - `navigation: { previousEntryId: string | null, nextEntryId: string | null, previousEntryTitle?: string, nextEntryTitle?: string, previousEntryDate?: string, nextEntryDate?: string }`

### Edge Cases to Cover
- Trip with a single entry: both directions disabled, `previousEntryId` and `nextEntryId` are null.
- First entry in trip: previous disabled; last entry: next disabled.
- Entries with missing title: fall back to date or "Daily entry" label.
- Entry with no media: navigation still renders and does not depend on media presence.

### File Structure Requirements
- Entry reader UI: `src/components/entries/entry-reader.tsx` (extend with navigation controls).
- Public reader route: `src/app/entries/[id]/page.tsx`.
- API handler: `src/app/api/entries/[id]/route.ts` (extend response).
- Tests: `tests/api/` and `tests/components/` only (no co-located tests).

### Reuse / Anti-Pattern Guidance
- Reuse `EntryReader` and existing layout styles; do not create a second reader.
- Avoid introducing new route trees; navigation should use existing `/entries/:id`.
- Do not introduce new state management libraries or RTK Query.

### Testing Requirements
- Tests live in `tests/` (no co-located tests).
- Component tests under `tests/components/entries/`.
- API tests under `tests/api/` and must assert `{ data, error }` shape.
- Test scenarios to include:
  - API: returns correct prev/next IDs for middle entry; nulls for bounds.
  - UI: navigation buttons render with correct hrefs and disabled states at bounds.
  - UI: navigating updates content and keeps reader layout (snapshot or DOM assertions).

### Regression Checklist
- Entry reader layout remains media-first with existing typography and spacing.
- `/entries/:id` stays public for shared viewing.
- `/trips/[tripId]/entries/[entryId]` flow remains creator-only and unchanged.
- Entry list ordering and trip overview behavior remain unaffected.

### Scope Boundaries (Prevent Creep)
- Do not implement trip overview or timeline browsing UI here (Story 3.3).
- Do not add sharing or role management features (Epic 4/5).
- Do not change media upload, entry editing, or trip management flows.

### Project Structure Notes
- Follow `kebab-case.tsx` file naming and `PascalCase` components.
- Keep utilities in `src/utils/` and avoid adding `lib/`.

### Done Criteria
- ACs 1-3 pass, navigation metadata is returned by API, and UI controls render with correct disabled states.
- API and component tests for navigation pass in `tests/`.

### References
- [Source: _bmad-output/epics.md#Story 3.2: Entry Navigation]
- [Source: _bmad-output/ux-design-specification.md#Entry Reader]
- [Source: _bmad-output/ux-design-specification.md#Navigation Patterns]
- [Source: _bmad-output/architecture.md#Frontend Architecture]
- [Source: _bmad-output/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]

### Project Context Reference
- App Router only; API routes in `src/app/api`.
- Response shape `{ data, error }`, errors `{ error: { code, message } }`.
- Components `PascalCase`, files `kebab-case.tsx`.
- Tests in central `tests/` only.
- Use `next/image` and lazy loading for media.

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

### Implementation Plan

- Add adjacent entry lookup (prev/next by createdAt within trip) to `GET /api/entries/[id]`
- Extend API response with navigation metadata for IDs and optional titles/dates
- Add API tests for mid-trip adjacency and bounds nulls

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- Added prev/next navigation metadata to the entry read API response for chronological navigation
- Tests: `npm test`
- Added entry reader navigation controls with disabled bounds styling and mapping support
- Tests: `npm test`
- Added navigation API/component coverage and updated reader mapping defaults
- Removed full-screen viewer position/close UI per latest request
- Tests: `npm test -- tests/components/entry-detail.test.tsx`
- Removed full-screen viewer previous/next buttons per latest request
- Tests: `npm test -- tests/components/entry-detail.test.tsx`
- Removed full-screen viewer arrow key navigation per latest request
- Tests: `npm test -- tests/components/entry-detail.test.tsx`
- Removed slideshow pause control; progress bar always runs
- Tests: `npm test -- tests/components/entry-detail.test.tsx`
- Switched slideshow progress UI to a single bar to avoid dot segments
- Boosted slideshow progress bar contrast/height for visibility
- Moved slideshow progress bar to a fixed bottom overlay for guaranteed visibility
- Increased slideshow progress bar size/contrast for visibility testing
- Forced inline styles for slideshow progress bar to ensure rendering
- Restored segmented slideshow progress bar with one segment per image
- Reverted unrelated full-screen viewer changes to keep EntryDetail unchanged
- Allowed authenticated viewers to access public entry reads
- Added API coverage for authenticated viewer access
- Added reader navigation re-render coverage

### File List

- travelblogs/src/app/api/entries/[id]/route.ts
- travelblogs/src/components/entries/entry-reader.tsx
- travelblogs/src/utils/entry-reader.ts
- travelblogs/tests/api/entries/get-entry.test.ts
- travelblogs/tests/components/entries/entry-reader-navigation.test.tsx
- travelblogs/tests/utils/entry-reader-mapper.test.ts

### Change Log

- 2025-12-28: Added entry navigation metadata, reader navigation controls, and coverage for API/reader navigation behavior.
- 2025-12-28: Removed full-screen viewer position/close UI and updated viewer tests.
- 2025-12-28: Removed full-screen viewer prev/next controls.
- 2025-12-28: Removed full-screen viewer arrow key navigation.
- 2025-12-28: Removed slideshow pause control; kept progress bar visible.
- 2025-12-28: Simplified slideshow progress bar to a single full-width track.
- 2025-12-28: Increased slideshow progress bar contrast and height.
- 2025-12-28: Relocated slideshow progress bar to fixed bottom overlay.
- 2025-12-28: Increased slideshow progress bar size and contrast.
- 2025-12-28: Forced inline styles for slideshow progress bar to ensure visibility.
- 2025-12-28: Restored segmented slideshow progress bar (one segment per image).
- 2025-12-28: Restored public entry reads for authenticated viewers and added navigation re-render coverage.

### Story Completion Status

Status: done
