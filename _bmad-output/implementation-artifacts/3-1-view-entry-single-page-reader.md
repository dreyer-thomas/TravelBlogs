# Story 3.1: View Entry (Single-Page Reader)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want to open an entry in a single-page reader with a media-first layout,
so that I can consume the day's story quickly.

## Acceptance Criteria

1. Given I have access to a trip, when I open an entry, then I see the entry on a single page with media displayed prominently.
2. Given I have access to a trip, when I open an entry, then the entry text is readable without navigating to another page.
3. Given the entry includes multiple media files, when the entry loads, then media is displayed in the entry view in a gallery or carousel.

## Tasks / Subtasks

- [x] Build single-page entry reader layout (AC: 1, 2, 3)
  - [x] Create/extend `EntryReader` component with media-first layout and readable body typography
  - [x] Implement media gallery/carousel UI for multiple files
  - [x] Ensure entry content renders in one page (no secondary routes)
- [x] Fetch and render entry data (AC: 1, 2)
  - [x] Load entry by `id` via App Router `page.tsx` (server component + `fetch`)
  - [x] Map API response into `EntryReader` props with `camelCase` fields
- [x] Accessibility and performance pass (AC: 1, 2, 3)
  - [x] Ensure focus states, keyboard navigation, and 44x44 targets
  - [x] Use `next/image` with lazy loading; avoid layout shifts
  - [x] Verify entry switching stays under 1s in typical media sizes

## Dev Notes

### Developer Context (Purpose + UX Intent)
- Media-first, single-page reading experience; no navigation between entries in this story (that is Story 3.2).
- Prioritize immersion and readability: large media presence, clear text flow, minimal chrome.
- UX targets: body text 17-18px, line length 55-75 chars, Fraunces headings + Source Serif 4 body.
- Accessibility: WCAG AA, visible focus, 44x44 targets, strong contrast.

### Epic Context and Dependencies
- Epic 3 goal: fast, media-first entry reading with clear navigation; this story covers the single-page reader only.
- Depends on existing entry data and media upload flows from Epic 2 (entries/media must already exist).
- Do not implement entry-to-entry navigation or trip overview here; those are Stories 3.2 and 3.3.

### Technical Requirements
- Entry data must render in a single App Router page without secondary navigation.
- Media-first definition: first media item renders as full-width hero above the text; remaining media render in a horizontal carousel below the hero.
- Use `next/image` with lazy loading for media, and avoid layout shift.
- Error responses and UI must use `{ data, error }` response shape and `{ error: { code, message } }`.

### Architecture Compliance
- App Router only; entry view lives under `src/app/entries/[id]/page.tsx`.
- REST API read via `src/app/api/entries/[id]/route.ts` and `fetch`.
- Use server components for data fetching; client components only if interactivity requires it.
- Validation is server-side only (Zod).
- Access control must be enforced server-side (viewer access via shareable link or authenticated role/ACL).
- Deployment/Env: No special deployment steps required for this story; use existing `.env` conventions and App Router build defaults.

### Library / Framework Requirements
- Next.js App Router + React + TypeScript; Tailwind CSS styling.
- Redux Toolkit patterns if client state needed (avoid RTK Query).
- Zod for server validation if request params are validated.
- Latest-version verification not performed; use pinned versions from architecture and project context.

### Latest Tech Verification (Explicitly Deferred)
- No web research performed in this story. Do not change library versions; follow pinned versions in `/_bmad-output/architecture.md` and `/_bmad-output/project-context.md`.

### Versioned Stack (Authoritative for This Story)
- Prisma 7.2.0 (ORM + migrations)
- SQLite (primary DB)
- Auth.js (NextAuth) 4.24.13 (JWT sessions)
- Redux Toolkit 2.11.2 (state)
- Zod 4.2.1 (validation)

### Data Model and API Contract Notes
- Expect entry to include: `id`, `tripId`, `title` (or date/title), `body`, `media[]`, `createdAt` (ISO 8601).
- Media items should include at minimum: `id`, `url`, `type` (image/video), `width`, `height`, `alt` (if available).
- API response must remain `{ data, error }`; on not found or unauthorized, return `{ data: null, error: { code, message } }`.
- Align field names and types with `prisma/schema.prisma`; do not invent fields not present in the schema.

### File Structure Requirements
- Entry reader UI: `src/components/entries/entry-reader.tsx`.
- Media gallery UI: `src/components/media/media-gallery.tsx`.
- Shared UI atoms in `src/components/ui/`.
- Utilities in `src/utils/`; avoid creating new `lib/`.

### Reuse / Anti-Pattern Guidance
- Do not create duplicate reader or gallery components; extend `EntryReader` and `media-gallery` if they exist.
- Reuse shared UI atoms (buttons, modals) instead of new bespoke variants.
- Avoid embedding API calls inside presentational components; keep data loading in `page.tsx`.

### Testing Requirements
- Tests live in `tests/` (no co-located tests).
- If component tests exist, add/extend `tests/components/entries/*`.
- API tests (if added) go under `tests/api/` and must assert `{ data, error }` shape.

### Scope Boundaries (Prevent Creep)
- Do not implement entry navigation, trip overview, map/timeline, or sharing UI in this story.
- Do not add new auth flows; rely on existing access control at API level.

### Project Structure Notes

- Aligns with defined structure: `src/app/entries/[id]/page.tsx`, `src/components/entries/`, `src/components/media/`.
- No new structure conflicts anticipated; keep files `kebab-case.tsx`, components `PascalCase`.

### References

- [Source: _bmad-output/epics.md#Story 3.1: View Entry (Single-Page Reader)]
- [Source: _bmad-output/ux-design-specification.md#Entry Reader]
- [Source: _bmad-output/ux-design-specification.md#Visual Design Foundation]
- [Source: _bmad-output/architecture.md#Frontend Architecture]
- [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
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

- Create `src/app/entries/[id]/page.tsx` server component to fetch `/api/entries/:id`
- Normalize API response to `EntryReader` props via `src/utils/entry-reader.ts`
- Surface load errors in-page and reuse `EntryReader` for rendering

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- Built `EntryReader` with media-first hero layout and readable body typography
- Added `MediaGallery` carousel for additional media items
- Tests: `npm test`
- Added App Router entry reader page with server-side fetch and mapping util
- Tests: `npm test`
- Verified gallery controls and image loading attributes; ensured hero uses explicit dimensions
- Tests: `npm test`
- Enabled public entry viewing flow; ordered media responses and inferred media types for reader mapping
- Rendered inline images in reader body and added coverage for public entry access
- Tests: `npm test`

### File List

- travelblogs/src/components/entries/entry-reader.tsx
- travelblogs/src/components/media/media-gallery.tsx
- travelblogs/tests/components/entry-reader.test.tsx
- travelblogs/tests/components/media-gallery.test.tsx
- travelblogs/src/app/entries/[id]/page.tsx
- travelblogs/src/app/api/entries/[id]/route.ts
- travelblogs/src/utils/entry-reader.ts
- travelblogs/tests/utils/entry-reader-mapper.test.ts
- travelblogs/tests/api/entries/get-entry.test.ts

### Change Log

- 2025-12-28: Added single-page entry reader, media gallery, entry mapping, and coverage for reader/gallery behavior.

### Story Completion Status

Status: done
