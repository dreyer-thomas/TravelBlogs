# Story 2.4: Delete Blog Entry

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want to delete a blog entry,
so that I can remove entries I no longer want to keep.

## Acceptance Criteria

1. **Given** I am a creator viewing an entry I own  
   **When** I choose delete and confirm the action  
   **Then** the entry is removed from the trip's entry list  
   **And** I can no longer access it
2. **Given** I initiate delete and cancel the confirmation  
   **When** I return to the entry view  
   **Then** the entry remains unchanged

## Tasks / Subtasks

- [ ] Define delete entry request and validation (AC: 1, 2)
  - [ ] Ensure entry id param is validated and errors follow standard response wrapper
- [ ] Implement delete entry API flow (AC: 1, 2)
  - [ ] Add DELETE handler in `src/app/api/entries/[id]/route.ts`
  - [ ] Enforce creator-only auth and trip ownership checks
  - [ ] Delete entry and associated media in Prisma
- [ ] Build creator UI for entry deletion (AC: 1, 2)
  - [ ] Add delete CTA in entry detail view
  - [ ] Confirmation modal with cancel/confirm paths
  - [ ] Redirect back to trip entry list after deletion
- [ ] Update trip entries list after deletion (AC: 1)
  - [ ] Remove deleted entry from list UI without stale state
- [ ] Add tests for delete flow (AC: 1, 2)
  - [ ] API tests for delete success, unauthorized access, and not found
  - [ ] Component test for delete confirmation behavior

## Dev Notes

- Delete entry removes it from the trip timeline and makes it inaccessible. [Source: _bmad-output/epics.md#Story 2.4]
- API routes must stay in App Router under `src/app/api` with plural endpoints and `{ data, error }` response wrapper. [Source: _bmad-output/architecture.md#API & Communication Patterns] [Source: _bmad-output/project-context.md#Framework-Specific Rules]
- Use Prisma 7.2.0 + SQLite with singular models and camelCase fields; delete Entry and associated EntryMedia via relation cascade. [Source: _bmad-output/architecture.md#Data Architecture] [Source: _bmad-output/project-context.md#Language-Specific Rules]
- Ensure creator-only access and trip ownership checks before deletion. [Source: _bmad-output/architecture.md#Authentication & Security]
- UI confirmation is required before destructive actions. [Source: _bmad-output/ux-design-specification.md#Button Hierarchy]

### Project Structure Notes

- Delete API: `src/app/api/entries/[id]/route.ts` (add DELETE). [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Delete UI in `src/components/entries/` and shared modal in `src/components/ui/` if needed. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Entry detail view lives in `src/components/entries/entry-detail.tsx`. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Tests remain under `tests/` with `tests/api/entries` and `tests/components`. [Source: _bmad-output/project-context.md#Testing Rules]

### References

- _bmad-output/epics.md#Story 2.4
- _bmad-output/prd.md#Entry Management
- _bmad-output/architecture.md#API & Communication Patterns
- _bmad-output/architecture.md#Data Architecture
- _bmad-output/architecture.md#Project Structure & Boundaries
- _bmad-output/ux-design-specification.md#Button Hierarchy
- _bmad-output/project-context.md#Critical Implementation Rules

## Technical Requirements

- Delete an existing entry; after deletion it must not be accessible. [Source: _bmad-output/epics.md#Story 2.4]
- Use `{ data, error }` response wrapper with `{ error: { code, message } }` on failures. [Source: _bmad-output/architecture.md#API & Communication Patterns]
- Enforce creator-only access and trip ownership checks for delete. [Source: _bmad-output/architecture.md#Authentication & Security]

## Architecture Compliance

- App Router only; REST routes live under `src/app/api` with plural endpoints. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Prisma + SQLite with singular models and camelCase fields. [Source: _bmad-output/architecture.md#Data Architecture]

## Library & Framework Requirements

- Next.js App Router + React + TypeScript; Tailwind CSS for UI. [Source: _bmad-output/architecture.md#Frontend Architecture]
- Prisma 7.2.0; SQLite datasource. [Source: _bmad-output/architecture.md#Data Architecture]
- Auth.js (NextAuth) 4.24.13 with JWT sessions; creator-only access for deletion. [Source: _bmad-output/architecture.md#Authentication & Security]

## File Structure Requirements

- Delete handler: `src/app/api/entries/[id]/route.ts` (DELETE). [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Entry detail UI: `src/components/entries/entry-detail.tsx` (add delete CTA + modal). [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Shared helpers in `src/utils/` for API response handling if needed. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]

## Testing Requirements

- Tests live in `tests/` only. [Source: _bmad-output/project-context.md#Testing Rules]
- Add API tests under `tests/api/entries` for delete success, not found, and unauthorized access. [Source: _bmad-output/project-context.md#Testing Rules]
- Add component test for delete confirmation behavior. [Source: _bmad-output/project-context.md#Testing Rules]

## Previous Story Intelligence

- Entry list and entry detail view already exist; deletion should return to trip view and refresh list state. [Source: _bmad-output/implementation-artifacts/2-1-add-blog-entry.md#Dev Notes]
- API patterns use `jsonError` helper with `{ data, error }` and creator checks via `getToken`. Follow the same pattern for DELETE. [Source: _bmad-output/implementation-artifacts/2-1-add-blog-entry.md#Dev Notes]

## Git Intelligence Summary

- Recent commit patterns use route handlers under `src/app/api/entries/[id]/route.ts` with auth via `getToken` and Prisma queries. Follow this for delete to keep consistency. [Source: git log -5]
- Tests use Vitest + PrismaBetterSqlite3 with `npx prisma migrate deploy` in `beforeAll`. Match this setup for delete tests. [Source: travelblogs/tests/api/entries/create-entry.test.ts]

## Project Context Reference

- Follow `_bmad-output/project-context.md` for naming, API conventions, response format, and testing locations.

## Story Completion Status

- Status set to ready-for-dev.
- Note: Ultimate context engine analysis completed; comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

 - None

### Completion Notes List

 - Story context generated from epics, PRD, architecture, UX, and project-context sources.
 - Included previous story and git intelligence to align delete flow with existing patterns.

### File List

- _bmad-output/implementation-artifacts/2-4-delete-blog-entry.md
- _bmad-output/epics.md
- _bmad-output/prd.md
- _bmad-output/architecture.md
- _bmad-output/ux-design-specification.md
- _bmad-output/project-context.md
