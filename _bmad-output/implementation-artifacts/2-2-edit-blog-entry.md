# Story 2.2: Edit Blog Entry

Status: done

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

- [x] Define edit entry payload and validation (AC: 1, 2)
  - [x] Zod schema requiring text and at least one photo (mediaUrls or inline image markdown)
  - [x] Validate media URLs are non-empty strings; reject invalid payloads with standard error wrapper
- [x] Implement update entry API flow (AC: 1, 2)
  - [x] Add PUT (or PATCH) handler in `src/app/api/entries/[id]/route.ts`
  - [x] Enforce creator-only auth and trip ownership checks
  - [x] Update entry text and media set; refresh updatedAt
- [x] Build creator UI for entry editing (AC: 1, 2)
  - [x] Edit form with text + media (reuse entry-media utilities and inline image helpers)
  - [x] Preload existing entry text and media; allow removal and re-upload
  - [x] Inline validation errors; disable submit while invalid or uploading
- [x] Update entry detail view to surface edit action (AC: 1)
  - [x] Add edit CTA in entry view
  - [x] Navigate to edit screen or inline edit mode
- [x] Add tests for edit flow (AC: 1, 2)
  - [x] API tests for update success, validation error, and unauthorized access
  - [x] Component test for edit form validation and submit states

## Dev Notes

- Edit entry updates text and media for an existing entry; keep media-first UX and show updated content in the entry view. [Source: _bmad-output/epics.md#Story 2.2] [Source: _bmad-output/ux-design-specification.md#Entry Reader]
- API routes must stay in App Router under `src/app/api` with plural endpoints and `{ data, error }` response wrapper. [Source: _bmad-output/architecture.md#API & Communication Patterns] [Source: _bmad-output/project-context.md#Framework-Specific Rules]
- Validation is server-side only with Zod 4.2.1; require text and at least one photo (mediaUrls or inline image markdown). [Source: _bmad-output/architecture.md#Data Architecture] [Source: _bmad-output/epics.md#Story 2.2]
- Use Prisma 7.2.0 + SQLite with singular models and camelCase fields; update Entry + EntryMedia records accordingly. [Source: _bmad-output/architecture.md#Data Architecture] [Source: _bmad-output/project-context.md#Language-Specific Rules]
- Media upload uses the existing `/api/media/upload` and entry media utilities; keep Next.js Image for previews. [Source: _bmad-output/architecture.md#Integration Points] [Source: _bmad-output/project-context.md#Framework-Specific Rules]
- Maintain chronological ordering and keep the entry reader responsive after edits. [Source: _bmad-output/prd.md#Navigation & Viewing] [Source: _bmad-output/architecture.md#Frontend Architecture]

### Project Structure Notes

- Update entry API: `src/app/api/entries/[id]/route.ts` (add PUT/PATCH). [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Edit UI in `src/components/entries/` (new `edit-entry-form.tsx` or extend `create-entry-form.tsx`); file names in kebab-case. [Source: _bmad-output/project-context.md#Framework-Specific Rules]
- Page route for edit (if separate): `src/app/trips/[tripId]/entries/[entryId]/edit/page.tsx`. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Tests remain under `tests/` with `tests/api/entries` and `tests/components`. [Source: _bmad-output/project-context.md#Testing Rules]

### References

- _bmad-output/epics.md#Story 2.2
- _bmad-output/prd.md#Entry Management
- _bmad-output/architecture.md#API & Communication Patterns
- _bmad-output/architecture.md#Data Architecture
- _bmad-output/architecture.md#Project Structure & Boundaries
- _bmad-output/ux-design-specification.md#Entry Reader
- _bmad-output/project-context.md#Critical Implementation Rules

## Technical Requirements

- Update an existing entry's text and media; reject invalid updates with clear validation errors. [Source: _bmad-output/epics.md#Story 2.2]
- Require text and at least one photo (either mediaUrls or inline image markdown). [Source: _bmad-output/epics.md#Story 2.2]
- Preserve `{ data, error }` response wrapper with `{ error: { code, message } }` on failures. [Source: _bmad-output/architecture.md#API & Communication Patterns]
- Enforce creator-only access and trip ownership checks for updates. [Source: _bmad-output/architecture.md#Authentication & Security]
- Return ISO 8601 timestamps in API responses. [Source: _bmad-output/project-context.md#Language-Specific Rules]

## Architecture Compliance

- App Router only; REST routes live under `src/app/api` with plural endpoints. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Prisma + SQLite with singular models and camelCase fields. [Source: _bmad-output/architecture.md#Data Architecture]
- Use Next.js Image with lazy loading for media previews and gallery. [Source: _bmad-output/architecture.md#Frontend Architecture]

## Library & Framework Requirements

- Next.js App Router + React + TypeScript; Tailwind CSS for UI. [Source: _bmad-output/architecture.md#Frontend Architecture]
- Prisma 7.2.0; SQLite datasource. [Source: _bmad-output/architecture.md#Data Architecture]
- Auth.js (NextAuth) 4.24.13 with JWT sessions; creator-only access for updates. [Source: _bmad-output/architecture.md#Authentication & Security]
- Zod 4.2.1 for validation. [Source: _bmad-output/architecture.md#Data Architecture]
- Typography uses `next/font` with Fraunces + Source Serif 4 for entry editing UI. [Source: _bmad-output/ux-design-specification.md#Typography System]

## File Structure Requirements

- Update handler: `src/app/api/entries/[id]/route.ts` (PUT/PATCH). [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Edit UI: `src/components/entries/` (kebab-case file names). [Source: _bmad-output/project-context.md#Framework-Specific Rules]
- Optional page route: `src/app/trips/[tripId]/entries/[entryId]/edit/page.tsx`. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Shared helpers in `src/utils/` (reuse `entry-content` and `entry-media`). [Source: _bmad-output/architecture.md#Project Structure & Boundaries]

## Testing Requirements

- Tests live in `tests/` only. [Source: _bmad-output/project-context.md#Testing Rules]
- Add API tests under `tests/api/entries` for update success, validation errors, and unauthorized access. [Source: _bmad-output/project-context.md#Testing Rules]
- Add component test for edit form validation and submit behavior. [Source: _bmad-output/project-context.md#Testing Rules]

## Previous Story Intelligence

- Story 2.1 already implemented: entry creation uses `/api/entries` POST with Zod validation and media requirement. Mirror the same validation logic for updates to keep behavior consistent. [Source: _bmad-output/implementation-artifacts/2-1-add-blog-entry.md#Technical Requirements]
- Media uploads use `/api/media/upload` via `src/utils/entry-media.ts` and inline image markdown parsing in `src/utils/entry-content.ts`. Reuse these utilities for edit flow. [Source: _bmad-output/implementation-artifacts/2-1-add-blog-entry.md#Dev Notes]
- Entry detail UI renders inline images and a gallery; edits should refresh both text and media display. [Source: _bmad-output/implementation-artifacts/2-1-add-blog-entry.md#Dev Notes]

## Git Intelligence Summary

- Recent commit patterns show API handlers returning `{ data, error }` with a shared `jsonError` helper and auth via `getToken` with creator checks. Follow the same pattern for update endpoint. [Source: git log -5]
- Tests use Vitest + PrismaBetterSqlite3 with `npx prisma migrate deploy` in `beforeAll`. Match this setup for edit tests. [Source: travelblogs/tests/api/entries/create-entry.test.ts]

## Project Context Reference

- Follow `_bmad-output/project-context.md` for naming, API conventions, response format, and testing locations.

## Story Completion Status

- Status set to done.
- Note: Ultimate context engine analysis completed; comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Implementation Plan

- Add PATCH /api/entries/[id] with edit validation and ownership checks.
- Build edit entry UI with preloaded text/media and submission flow.
- Add API and component tests for edit validations and updates.

### Debug Log References

 - None

### Completion Notes List

 - Story context generated from epics, PRD, architecture, UX, and project-context sources.
 - Included previous story and git intelligence to align edit flow with existing patterns.
 - Implemented entry update validation and PATCH API with media replacement and ownership checks.
 - Added edit entry UI with preloaded content, media management, and edit CTA in entry detail.
 - Tests: `npm test`.
 - Lint: `npm run lint` fails on pre-existing issues in `src/components/trips/trip-detail.tsx` and warnings in trip forms.
 - Code review fixes: preserve existing media on text-only edits, map validation errors to fields, add update tests, and improve entry detail navigation.

### File List

- _bmad-output/implementation-artifacts/2-2-edit-blog-entry.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- travelblogs/src/app/api/entries/[id]/route.ts
- travelblogs/src/app/trips/[tripId]/entries/[entryId]/edit/page.tsx
- travelblogs/src/components/entries/edit-entry-form.tsx
- travelblogs/src/components/entries/entry-detail.tsx
- travelblogs/tests/api/entries/update-entry.test.ts
- travelblogs/tests/components/edit-entry-form.test.tsx

### Change Log

- 2025-12-28: Implemented entry edit API, UI, and tests; updated entry detail CTA.
- 2025-12-28: Code review fixes for edit validation, API behavior, tests, and navigation.
