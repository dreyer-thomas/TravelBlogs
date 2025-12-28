# Story 2.1: Add Blog Entry

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want to add a daily blog entry to a trip with text and media,
so that I can capture the day's story in one place.

## Acceptance Criteria

1. **Given** I am a creator viewing a trip I own  
   **When** I create a new entry with required text and at least one media file  
   **Then** the entry is saved and appears in the trip's entry list in chronological order  
   **And** I can open it immediately in the entry view
2. **Given** I attempt to create an entry without required fields  
   **When** I try to save  
   **Then** I see clear validation errors  
   **And** the entry is not created

## Tasks / Subtasks

- [ ] Define entry create payload and validation (AC: 1, 2)
  - [ ] Zod schema requiring text + at least one media file reference
  - [ ] Ensure API error format `{ data, error }` with `{ error: { code, message } }`
- [ ] Implement create entry API flow (AC: 1, 2)
  - [ ] Create entry + media records via Prisma in `src/app/api/entries/route.ts`
  - [ ] Associate entry with trip using existing trip ownership/ACL checks
- [ ] Build creator UI for entry creation (AC: 1, 2)
  - [ ] Entry form with text field and media selector/uploader
  - [ ] Inline validation errors and disabled submit when invalid
- [ ] Update trip entry list and entry view routing (AC: 1)
  - [ ] Insert new entry in chronological order and open it immediately

## Dev Notes

- This story covers creator entry creation with required text and at least one media file; multi-file upload UX can be incremental, but accept multiple files if available. [Source: _bmad-output/epics.md#Story 2.1] [Source: _bmad-output/prd.md#Entry Management]
- Use App Router API routes only under `src/app/api`; entries endpoint is plural and uses `{ data, error }` response wrapper with `{ error: { code, message } }`. [Source: _bmad-output/architecture.md#API & Communication Patterns] [Source: _bmad-output/project-context.md#Framework-Specific Rules]
- Validation is server-side only with Zod 4.2.1; required fields must fail with clear validation errors. [Source: _bmad-output/architecture.md#Data Architecture] [Source: _bmad-output/project-context.md#Testing Rules]
- Data layer uses Prisma 7.2.0 + SQLite with singular table names and camelCase columns. [Source: _bmad-output/architecture.md#Data Architecture] [Source: _bmad-output/project-context.md#Language-Specific Rules]
- Media handling uses Next.js Image with lazy loading; media stored on NAS filesystem. [Source: _bmad-output/architecture.md#Frontend Architecture] [Source: _bmad-output/architecture.md#Integration Points]
- Ensure entry list stays chronological and the newly created entry is immediately openable in the entry view. [Source: _bmad-output/epics.md#Story 2.1]

### Project Structure Notes

- API route handlers live at `src/app/api/entries/route.ts` and `src/app/api/media/upload/route.ts`; no alternate server folders. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Feature components live under `src/components/entries/` and `src/components/media/`; keep file names `kebab-case.tsx`. [Source: _bmad-output/architecture.md#Project Structure & Boundaries] [Source: _bmad-output/project-context.md#Framework-Specific Rules]
- Redux slices (if needed for entry creation state) live under `src/store/entries/` and follow `status: 'idle' | 'loading' | 'succeeded' | 'failed'`. [Source: _bmad-output/architecture.md#Communication Patterns]

### References

- _bmad-output/epics.md#Story 2.1
- _bmad-output/prd.md#Entry Management
- _bmad-output/architecture.md#API & Communication Patterns
- _bmad-output/architecture.md#Data Architecture
- _bmad-output/architecture.md#Project Structure & Boundaries
- _bmad-output/project-context.md#Critical Implementation Rules

## Technical Requirements

- Entry creation requires text body plus at least one media file reference; reject missing required fields with clear validation errors. [Source: _bmad-output/epics.md#Story 2.1]
- Preserve chronological ordering for trip entry lists and allow immediate navigation to the new entry. [Source: _bmad-output/epics.md#Story 2.1]
- Server-side validation with Zod 4.2.1 only; dates in API payloads/responses are ISO 8601 strings. [Source: _bmad-output/architecture.md#Data Architecture] [Source: _bmad-output/project-context.md#Language-Specific Rules]
- API responses must be `{ data, error }` with `{ error: { code, message } }` on failures. [Source: _bmad-output/architecture.md#API & Communication Patterns]

## Architecture Compliance

- App Router only; REST routes under `src/app/api` and endpoints are plural (`/entries`, `/media`). [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Use Prisma + SQLite with singular models and camelCase fields. [Source: _bmad-output/architecture.md#Data Architecture] [Source: _bmad-output/project-context.md#Language-Specific Rules]
- Media display must use Next.js Image with lazy loading. [Source: _bmad-output/architecture.md#Frontend Architecture]
- If using Redux for entry create state, follow `status: 'idle' | 'loading' | 'succeeded' | 'failed'`. [Source: _bmad-output/architecture.md#Communication Patterns]

## Library & Framework Requirements

- Next.js App Router + React + TypeScript; Tailwind CSS for UI. [Source: _bmad-output/architecture.md#Frontend Architecture]
- Prisma 7.2.0 with Prisma Migrate; SQLite datasource. [Source: _bmad-output/architecture.md#Data Architecture]
- Auth.js (NextAuth) 4.24.13 with JWT sessions; creator-only access for entry creation. [Source: _bmad-output/architecture.md#Authentication & Security]
- Redux Toolkit 2.11.2 for state (if needed). [Source: _bmad-output/architecture.md#Frontend Architecture]
- Zod 4.2.1 for request validation. [Source: _bmad-output/architecture.md#Data Architecture]
- Typography uses `next/font` with Fraunces + Source Serif 4. [Source: _bmad-output/ux-design-specification.md#Typography System]

## File Structure Requirements

- Entry API: `src/app/api/entries/route.ts`; media upload API: `src/app/api/media/upload/route.ts`. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Entry UI components: `src/components/entries/`; media components: `src/components/media/`. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Redux slice (if used): `src/store/entries/`. [Source: _bmad-output/architecture.md#Communication Patterns]
- Shared helpers in `src/utils/`; domain types in `src/types/`. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]

## Testing Requirements

- Tests live in `tests/` only; no co-located tests. [Source: _bmad-output/project-context.md#Testing Rules]
- Add API tests under `tests/api` for entry creation success and validation errors. [Source: _bmad-output/project-context.md#Testing Rules]
- Validate error responses use `{ data, error }` with `{ error: { code, message } }`. [Source: _bmad-output/architecture.md#API & Communication Patterns]

## Latest Tech Information

- Verified latest versions via npm registry: Next.js 16.1.1, Prisma 7.2.0, Auth.js (NextAuth) 4.24.13, Redux Toolkit 2.11.2, Zod 4.2.1. These match the architecture and should be used as specified.

## Project Context Reference

- Follow all rules in `_bmad-output/project-context.md` for naming, API conventions, response format, and testing locations.

## Story Completion Status

- Status set to ready-for-dev.
- Note: Ultimate context engine analysis completed; comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

- npm view prisma/next/next-auth/@reduxjs/toolkit/zod (version verification)

### Completion Notes List

- Story context generated from epics, PRD, architecture, UX, and project-context sources.
- Epic 2 marked in-progress in sprint status on story creation.

### File List

- _bmad-output/implementation-artifacts/2-1-add-blog-entry.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
