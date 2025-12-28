# Story 1.6: Trip Cover Image Upload

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want to upload a cover image file for a trip,
so that each trip feels visually distinct and easy to recognize.

## Acceptance Criteria

1. **Given** I am a creator creating or editing a trip  
   **When** I upload a valid image file (jpg/png/webp, <= 5MB) and save  
   **Then** the image is stored and the trip shows the cover image in trip views
2. **Given** I attempt to upload an invalid image file  
   **When** I try to save  
   **Then** I see a clear validation error  
   **And** the trip is not saved with the invalid cover
3. **Given** a trip already has a cover image  
   **When** I upload a new cover image and save  
   **Then** the cover image is replaced with the new file
4. **Given** I am not authenticated as creator  
   **When** I attempt to upload a cover image  
   **Then** I receive an authorization error and nothing is stored

## Tasks / Subtasks

- [x] Define cover upload constraints and API contract (AC: 1, 2, 3, 4)
  - [x] Allow only image MIME types (jpg/png/webp), max size 5MB
  - [x] Multipart field name: `file`; return `{ data: { url }, error: null }`
- [x] Implement media upload endpoint (AC: 1, 2)
  - [x] Add `src/app/api/media/upload/route.ts` to accept multipart file upload
  - [x] Store file on NAS filesystem and return `{ data: { url }, error: null }`
- [x] Update trip create/edit API to accept uploaded cover (AC: 1, 3)
  - [x] `src/app/api/trips/route.ts` and `src/app/api/trips/[id]/route.ts`
  - [x] Validate cover URL comes from upload endpoint
- [x] Update trip create/edit UI to upload file (AC: 1, 2, 3)
  - [x] Add file input with preview
  - [x] Show upload progress and validation errors
  - [x] Use returned URL when submitting trip form
- [x] Update trip list/detail views to render cover image (AC: 1, 3)
  - [x] Use `next/image` and lazy loading
  - [x] Place cover in trip card thumbnail and trip detail header hero

## Dev Notes

- File uploads store to NAS filesystem; do not introduce cloud storage for MVP. [Source: _bmad-output/architecture.md#Integration Points]
- Use App Router API routes under `src/app/api`; responses must be `{ data, error }` with `{ error: { code, message } }`. [Source: _bmad-output/architecture.md#API & Communication Patterns]
- Authentication: creator-only access for trip management endpoints. [Source: _bmad-output/architecture.md#Authentication & Security]
- Use Next.js Image with lazy loading for cover rendering. [Source: _bmad-output/architecture.md#Frontend Architecture]
- Do not regress existing trip create/edit flows; replace the URL input with file upload and keep validation/error patterns consistent with current trip forms. [Source: travelblogs/src/components/trips/create-trip-form.tsx]
- Reuse existing `coverImageUrl` field on Trip; no new schema field is required. If schema is missing, add `coverImageUrl` as optional string. [Source: travelblogs/prisma/schema.prisma]
- Multipart parsing: avoid adding new dependencies unless required; if needed, use a minimal, well-maintained parser and document it in the API handler.

### Project Structure Notes

- Media upload route lives at `src/app/api/media/upload/route.ts`. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Trip UI components are in `src/components/trips/` with `kebab-case.tsx` files. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Shared helpers go in `src/utils/`; avoid adding `lib/`. [Source: _bmad-output/project-context.md#Code Quality & Style Rules]

### References

- _bmad-output/architecture.md#Integration Points
- _bmad-output/architecture.md#API & Communication Patterns
- _bmad-output/architecture.md#Authentication & Security
- _bmad-output/architecture.md#Project Structure & Boundaries
- _bmad-output/project-context.md#Code Quality & Style Rules

## Technical Requirements

- Accept image files only (jpg/png/webp), max size 5MB; reject invalid uploads with clear errors. [Source: _bmad-output/architecture.md#Implementation Patterns & Consistency Rules]
- Persist cover image URL on Trip records and render in trip list/detail views. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- API responses must be `{ data, error }` with `{ error: { code, message } }`. [Source: _bmad-output/architecture.md#API & Communication Patterns]
 - Upload endpoint must enforce creator auth and sanitize filenames/paths before writing to disk.

## Architecture Compliance

- App Router only; API routes live under `src/app/api`. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Use Next.js Image for cover rendering with lazy loading. [Source: _bmad-output/architecture.md#Frontend Architecture]
- Store media on NAS filesystem; no Docker/TLS proxy changes in MVP. [Source: _bmad-output/architecture.md#Infrastructure & Deployment]

## Library & Framework Requirements

- Next.js App Router + React + TypeScript; Tailwind CSS for UI. [Source: _bmad-output/architecture.md#Frontend Architecture]
- Auth.js (NextAuth) 4.24.13 with JWT sessions for creator-only access. [Source: _bmad-output/architecture.md#Authentication & Security]
- Zod 4.2.1 for validation of upload metadata and trip payloads. [Source: _bmad-output/architecture.md#Data Architecture]

## File Structure Requirements

- Media upload API: `src/app/api/media/upload/route.ts`. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Trip API: `src/app/api/trips/route.ts` and `src/app/api/trips/[id]/route.ts`. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Trip components: `src/components/trips/` (file upload UI, preview, errors). [Source: _bmad-output/architecture.md#Project Structure & Boundaries]

## Testing Requirements

- Tests live in `tests/` only. [Source: _bmad-output/project-context.md#Testing Rules]
- Add API tests for upload success, invalid file type, and size limit failures. [Source: _bmad-output/project-context.md#Testing Rules]
- Add UI tests for upload validation and preview (if applicable). [Source: _bmad-output/project-context.md#Testing Rules]

## Project Context Reference

- Follow `_bmad-output/project-context.md` for naming, response formats, and test locations.

## Story Completion Status

- Status set to ready-for-dev.
- Note: Cover image upload story created from user request.

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

- User provided story key: 1-6-trip-cover-image-upload

### Completion Notes List

- New story created outside epics list per user request.
- Defined cover upload constraints and shared helpers for validation/URLs.
- Implemented media upload API with creator auth, validation, and filesystem storage.
- Restricted trip cover URLs to uploads path and added validation tests.
- Replaced trip cover URL inputs with file upload UI, previews, and progress.
- Added cover hero rendering to trip detail view.
- Restricted cover image URLs to local uploads and added UI/upload auth coverage.
- Tests: `npm test`

## Change Log

- Addressed cover image upload and rendering flow (Date: 2025-12-27)
- Hardened cover image validation and test coverage (Date: 2025-12-28)

### File List

- _bmad-output/implementation-artifacts/1-6-trip-cover-image-upload.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- travelblogs/package.json
- travelblogs/src/utils/media.ts
- travelblogs/src/utils/cover-upload.ts
- travelblogs/src/app/api/media/upload/route.ts
- travelblogs/tests/api/media/upload-cover-image.test.ts
- travelblogs/src/app/api/trips/route.ts
- travelblogs/src/app/api/trips/[id]/route.ts
- travelblogs/tests/api/trips/create-trip.test.ts
- travelblogs/tests/api/trips/update-trip.test.ts
- travelblogs/src/components/trips/create-trip-form.tsx
- travelblogs/src/components/trips/edit-trip-form.tsx
- travelblogs/src/components/trips/trip-card.tsx
- travelblogs/src/components/trips/trip-detail.tsx
- travelblogs/src/components/trips/delete-trip-modal.tsx
- travelblogs/src/app/trips/page.tsx
- travelblogs/src/app/trips/[id]/page.tsx
- travelblogs/src/app/trips/[id]/edit/page.tsx
- travelblogs/src/middleware.ts
- travelblogs/next.config.ts
- travelblogs/tests/components/cover-image-utils.test.ts
- travelblogs/tests/components/cover-image-form.test.tsx
