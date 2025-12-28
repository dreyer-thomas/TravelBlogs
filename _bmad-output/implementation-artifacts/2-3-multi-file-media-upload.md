# Story 2.3: Multi-File Media Upload

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want to upload multiple media files for an entry in one action,
so that I can add a full day's photos efficiently.

## Acceptance Criteria

1. **Given** I am creating or editing an entry  
   **When** I select multiple media files to upload  
   **Then** all selected files are attached to the entry  
   **And** I see upload progress and completion states
2. **Given** one or more files fail to upload  
   **When** the upload completes  
   **Then** I see which files failed  
   **And** successfully uploaded files remain attached

## Tasks / Subtasks

- [x] Define multi-file upload behavior and validation (AC: 1, 2)
  - [x] Allow multiple file selection in create/edit entry forms
  - [x] Validate file types and size per file; show per-file errors
- [x] Implement multi-file upload API handling (AC: 1, 2)
  - [x] Ensure `/api/media/upload` supports sequential or parallel uploads
  - [x] Capture failed uploads without blocking successful ones
- [x] Update entry media utilities for batch uploads (AC: 1, 2)
  - [x] Extend `uploadEntryMedia` to accept arrays or add `uploadEntryMediaBatch`
  - [x] Return success + failed file results for UI feedback
- [x] Enhance UI for progress and failure states (AC: 1, 2)
  - [x] Show per-file progress and completion states
  - [x] Surface failed files with retry/remove actions
- [x] Add tests for multi-file upload behavior (AC: 1, 2)
  - [x] Component test for multi-file selection and error display
  - [x] Utility tests for batch upload results handling

## Dev Notes

- Multi-file media upload supports attaching many photos to an entry in one action with progress and per-file error handling. [Source: _bmad-output/epics.md#Story 2.3]
- Media upload uses `/api/media/upload` and stores files on NAS; keep Next.js Image lazy loading for previews. [Source: _bmad-output/architecture.md#Integration Points] [Source: _bmad-output/architecture.md#Frontend Architecture]
- Validation is server-side only for entry save, but client should validate file type/size per file for better UX. [Source: _bmad-output/architecture.md#Data Architecture] [Source: _bmad-output/ux-design-specification.md#Form Patterns]
- Maintain `{ data, error }` response wrapper in API responses. [Source: _bmad-output/architecture.md#API & Communication Patterns]

### Project Structure Notes

- Entry media utilities live in `src/utils/entry-media.ts` (extend for batch upload). [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Create/edit entry forms live in `src/components/entries/`. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Media upload API in `src/app/api/media/upload/route.ts`. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Tests remain under `tests/` with `tests/components` and `tests/api` as needed. [Source: _bmad-output/project-context.md#Testing Rules]

### References

- _bmad-output/epics.md#Story 2.3
- _bmad-output/prd.md#Media Handling
- _bmad-output/architecture.md#Integration Points
- _bmad-output/architecture.md#Frontend Architecture
- _bmad-output/ux-design-specification.md#Form Patterns
- _bmad-output/project-context.md#Critical Implementation Rules

## Technical Requirements

- Allow selecting multiple media files in one action and attach all successful uploads to the entry. [Source: _bmad-output/epics.md#Story 2.3]
- Show upload progress and completion states for each file. [Source: _bmad-output/epics.md#Story 2.3]
- If some files fail, keep successful files attached and surface failures. [Source: _bmad-output/epics.md#Story 2.3]
- Preserve `{ data, error }` response wrapper for API interactions. [Source: _bmad-output/architecture.md#API & Communication Patterns]

## Architecture Compliance

- App Router only; REST routes live under `src/app/api`. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Use Next.js Image with lazy loading for media previews and gallery. [Source: _bmad-output/architecture.md#Frontend Architecture]

## Library & Framework Requirements

- Next.js App Router + React + TypeScript; Tailwind CSS for UI. [Source: _bmad-output/architecture.md#Frontend Architecture]
- Zod 4.2.1 for server-side validation on entry save. [Source: _bmad-output/architecture.md#Data Architecture]

## File Structure Requirements

- Media upload API: `src/app/api/media/upload/route.ts`. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Media utilities: `src/utils/entry-media.ts`. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Entry forms: `src/components/entries/`. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]

## Testing Requirements

- Tests live in `tests/` only. [Source: _bmad-output/project-context.md#Testing Rules]
- Add component tests for multi-file selection, per-file error display, and retry handling. [Source: _bmad-output/project-context.md#Testing Rules]

## Previous Story Intelligence

- Create entry form already supports multiple file selection but uploads sequentially and only returns a single error state; extend this to per-file status without breaking entry creation. [Source: travelblogs/src/components/entries/create-entry-form.tsx]
- Media upload uses `XMLHttpRequest` with progress callbacks; batch orchestration can wrap existing upload function. [Source: travelblogs/src/utils/entry-media.ts]

## Git Intelligence Summary

- Recent commits use utilities in `src/utils/entry-media.ts` for uploads and show previews via Next.js Image. Keep this pattern for multi-file updates. [Source: git log -5]

## Project Context Reference

- Follow `_bmad-output/project-context.md` for naming, API conventions, response format, and testing locations.

## Story Completion Status

- Status set to review.
- Note: Ultimate context engine analysis completed; comprehensive developer guide created.

## Change Log

- 2025-12-28: Completed multi-file upload behavior, API handling, UI status updates, and tests.
- 2025-12-28: Addressed review fixes for upload previews and form cleanup; updated story file list.

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

 - None

### Completion Notes List

 - Story context generated from epics, PRD, architecture, UX, and project-context sources.
 - Included previous story and git intelligence to align multi-file upload with existing patterns.
 - Plan: add per-file validation lists for entry media inputs and block submission when file errors exist.
 - Implemented per-file validation errors for inline and gallery uploads in create/edit forms.
 - Tests: updated `travelblogs/tests/components/create-entry-form.test.tsx`, `travelblogs/tests/components/edit-entry-form.test.tsx`; `npm test`.
 - Implemented multi-file handling in `/api/media/upload` with per-file uploads/failures response.
 - Tests: updated `travelblogs/tests/api/media/upload-cover-image.test.ts`; `npm test`.
 - Added `uploadEntryMediaBatch` to return uploads/failures and emit per-file progress.
 - Tests: added `travelblogs/tests/components/entry-media-utils.test.ts`; `npm test`.
 - Added per-file upload status lists (progress/success/failure) for entry media and inline uploads with retry/remove.
 - Tests: updated `travelblogs/tests/components/create-entry-form.test.tsx`, `travelblogs/tests/components/edit-entry-form.test.tsx`; `npm test`.
 - Tests: added multi-file status coverage in create/edit entry form component tests; updated `travelblogs/tests/components/entry-media-utils.test.ts`; `npm test`.
 - Review fixes: removed stale progress state calls and removed failed upload previews in create/edit entry forms.
 - Updated story File List to reflect actual changed files; excluded unrelated local tooling artifacts.

### File List

- _bmad-output/implementation-artifacts/2-3-multi-file-media-upload.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- travelblogs/src/app/api/media/upload/route.ts
- travelblogs/src/app/api/entries/route.ts
- travelblogs/src/app/api/entries/[id]/route.ts
- travelblogs/src/app/trips/page.tsx
- travelblogs/src/app/trips/[tripId]/entries/new/page.tsx
- travelblogs/src/app/trips/[tripId]/entries/[entryId]/edit/page.tsx
- travelblogs/src/components/entries/create-entry-form.tsx
- travelblogs/src/components/entries/create-entry-form-wrapper.tsx
- travelblogs/src/components/entries/edit-entry-form.tsx
- travelblogs/src/components/entries/entry-detail.tsx
- travelblogs/src/components/trips/trip-detail.tsx
- travelblogs/src/utils/entry-media.ts
- travelblogs/prisma/schema.prisma
- travelblogs/prisma/migrations/20251228140516_add_entry_title/
- travelblogs/prisma/migrations/20251228142333_add_entry_cover_image/
- travelblogs/tests/api/entries/create-entry.test.ts
- travelblogs/tests/api/entries/update-entry.test.ts
- travelblogs/tests/api/media/upload-cover-image.test.ts
- travelblogs/tests/components/create-entry-form.test.tsx
- travelblogs/tests/components/edit-entry-form.test.tsx
- travelblogs/tests/components/entry-media-utils.test.ts
