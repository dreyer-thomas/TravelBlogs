# Story 2.2: Edit Blog Entry

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want to edit an existing blog entry,
so that I can fix mistakes or add more detail.

## Acceptance Criteria

1. **Given** I am a creator viewing an entry I own  
   **When** I update the entry text or media and save  
   **Then** the changes are persisted  
   **And** the updated entry is shown in the entry view
2. **Given** I submit invalid updates (missing required text or invalid media)  
   **When** I attempt to save  
   **Then** I see clear validation errors  
   **And** the changes are not saved

## Tasks / Subtasks

- [ ] Define entry update payload and validation rules (AC: 1, 2)
  - [ ] Require non-empty text body and at least one media item after edits
  - [ ] Reject invalid media references using the same rules as media upload
  - [ ] Return `{ data, error }` with `{ error: { code, message } }` on failures
- [ ] Add Prisma schema + migration updates for entries/media (AC: 1)
  - [ ] Add `Entry` model tied to `Trip` via `tripId`
  - [ ] Add `EntryMedia` (or equivalent) to store media references per entry
  - [ ] Keep table names singular and fields camelCase
- [ ] Implement entry update API flow (AC: 1, 2)
  - [ ] Add `PATCH` handler in `src/app/api/entries/[id]/route.ts`
  - [ ] Enforce creator-only auth and trip ownership checks
  - [ ] Update entry text and media references atomically
- [ ] Implement entry edit UI (AC: 1, 2)
  - [ ] Create an edit form under `src/components/entries/`
  - [ ] Add edit page route `src/app/entries/[id]/edit/page.tsx`
  - [ ] Show inline validation errors and disable submit when invalid
- [ ] Update entry view to reflect edits (AC: 1)
  - [ ] Refresh entry detail data after successful save
- [ ] Add API tests for entry update (AC: 1, 2)
  - [ ] Success update returns updated entry data
  - [ ] Unauthorized/forbidden requests return correct error shape
  - [ ] Validation failures return `VALIDATION_ERROR`

## Dev Notes

- This story edits an existing entry; use the same required fields as entry creation (text + at least one media item). [Source: _bmad-output/epics.md#Story 2.2] [Source: _bmad-output/implementation-artifacts/2-1-add-blog-entry.md#Technical Requirements]
- REST API lives under `src/app/api` only; responses must be `{ data, error }` and error payloads `{ error: { code, message } }`. [Source: _bmad-output/architecture.md#API & Communication Patterns] [Source: _bmad-output/project-context.md#Framework-Specific Rules]
- Use Zod 4.2.1 for server-side validation only; keep JSON fields camelCase and dates as ISO 8601 strings if present in responses. [Source: _bmad-output/architecture.md#Data Architecture] [Source: _bmad-output/project-context.md#Language-Specific Rules]
- Media rendering uses Next.js Image with lazy loading; media files are stored on the NAS filesystem. [Source: _bmad-output/architecture.md#Frontend Architecture]
- Editing an entry must not break chronological ordering or entry navigation expectations. [Source: _bmad-output/prd.md#Performance Targets] [Source: _bmad-output/ux-design-specification.md#Core User Experience]

### Project Structure Notes

- Entry API routes: `src/app/api/entries/route.ts` (create/list) and `src/app/api/entries/[id]/route.ts` (read/update). [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Entry UI components live under `src/components/entries/` and use `kebab-case.tsx`. [Source: _bmad-output/architecture.md#Project Structure & Boundaries] [Source: _bmad-output/project-context.md#Framework-Specific Rules]
- Tests live in `tests/` only; put entry API tests under `tests/api/entries/`. [Source: _bmad-output/project-context.md#Testing Rules]

### References

- _bmad-output/epics.md#Story 2.2
- _bmad-output/prd.md#Entry Management
- _bmad-output/architecture.md#API & Communication Patterns
- _bmad-output/architecture.md#Data Architecture
- _bmad-output/architecture.md#Project Structure & Boundaries
- _bmad-output/project-context.md#Critical Implementation Rules
- _bmad-output/implementation-artifacts/2-1-add-blog-entry.md

## Developer Context

- Use creator-only auth (token sub must be `creator`) for entry update endpoints; follow the same auth pattern as trip routes. [Source: travelblogs/src/app/api/trips/route.ts]
- Reuse `jsonError` response pattern and Zod validation style from trip endpoints. [Source: travelblogs/src/app/api/trips/[id]/route.ts]
- Protect entry edit pages via middleware (already guards `/entries/*`). [Source: travelblogs/src/middleware.ts]

## Technical Requirements

- Entry updates must persist text changes and media changes in one request.
- Required fields: non-empty text body and at least one media item after edits.
- Invalid payloads or media references must return `400` with `VALIDATION_ERROR`.
- Responses must be `{ data, error }` with ISO 8601 date strings in any payloads.

## Architecture Compliance

- App Router only; API routes under `src/app/api`.
- Prisma + SQLite with singular model names and camelCase columns.
- Use Next.js Image for any media rendering and lazy-load by default.

## Library & Framework Requirements

- Next.js App Router + React + TypeScript; Tailwind CSS for UI.
- Prisma 7.2.0 with Prisma Migrate; SQLite datasource.
- Auth.js (NextAuth) 4.24.13 with JWT sessions for creator access.
- Zod 4.2.1 for request validation.

## File Structure Requirements

- API: `src/app/api/entries/[id]/route.ts` for update.
- UI: `src/components/entries/entry-edit-form.tsx` (or similar) and `src/app/entries/[id]/edit/page.tsx`.
- Shared helpers in `src/utils/`; domain types in `src/types/`.

## Testing Requirements

- Add tests under `tests/api/entries/` mirroring trip test patterns (mock `getToken`, use Prisma test DB).
- Test success update, unauthorized, forbidden, not found, and validation error cases.
- Ensure error payloads use `{ data: null, error: { code, message } }`.

## Previous Story Intelligence

- Story 2.1 established required fields (text + at least one media) and that API responses must be wrapped `{ data, error }`. [Source: _bmad-output/implementation-artifacts/2-1-add-blog-entry.md]
- Entry creation is expected to use `src/app/api/entries/route.ts` and media upload under `src/app/api/media/upload/route.ts` (if implemented). [Source: _bmad-output/implementation-artifacts/2-1-add-blog-entry.md]

## Git Intelligence Summary

- No relevant recent commits beyond repository bootstrap; no entry-specific patterns identified.

## Latest Tech Information

- Network-restricted environment; using architecture-specified versions: Next.js (latest create-next-app), Prisma 7.2.0, Auth.js 4.24.13, Redux Toolkit 2.11.2, Zod 4.2.1.

## Project Context Reference

- Follow all rules in `_bmad-output/project-context.md` for naming, API conventions, response format, and testing locations.

## Story Completion Status

- Status set to ready-for-dev.
- Note: Ultimate context engine analysis completed; comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

- None (network-restricted; versions pulled from architecture).

### Completion Notes List

- Story context generated from epics, PRD, architecture, UX, project-context, and existing codebase patterns.

### File List

- _bmad-output/implementation-artifacts/2-2-edit-blog-entry.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
