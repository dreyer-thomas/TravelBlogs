# Story 2.4: Delete Blog Entry

Status: done

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

- [x] Define delete entry request and validation (AC: 1, 2)
  - [x] Ensure entry id param is validated and errors follow standard response wrapper
- [x] Implement delete entry API flow (AC: 1, 2)
  - [x] Add DELETE handler in `src/app/api/entries/[id]/route.ts`
  - [x] Enforce creator-only auth and trip ownership checks
  - [x] Delete entry and associated media in Prisma
- [x] Build creator UI for entry deletion (AC: 1, 2)
  - [x] Add delete CTA in entry detail view
  - [x] Confirmation modal with cancel/confirm paths
  - [x] Redirect back to trip entry list after deletion
- [x] Update trip entries list after deletion (AC: 1)
  - [x] Remove deleted entry from list UI without stale state
- [x] Add tests for delete flow (AC: 1, 2)
  - [x] API tests for delete success, unauthorized access, and not found
  - [x] Component test for delete confirmation behavior

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

- Status set to review.
- Note: Ultimate context engine analysis completed; comprehensive developer guide created.

## Change Log

- 2025-12-28: Implemented entry deletion API + UI, added tests, and refreshed entry list navigation.
- 2025-12-28: Fixed create-entry import path, added delete accessibility tests, and documented operational file changes.

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

 - None

### Completion Notes List

 - Story context generated from epics, PRD, architecture, UX, and project-context sources.
 - Included previous story and git intelligence to align delete flow with existing patterns.
 - Implemented DELETE /api/entries/{id} with id validation, owner checks, and cascade delete behavior.
 - Added delete entry modal to entry detail with confirmation flow and trip list redirect.
 - Added API and component coverage for delete flow; updated update-entry test payload to satisfy validation.
 - Code review fixes: corrected create entry import path, added delete access coverage, and documented operational changes.

### File List

- .codex/history.jsonl
- .codex/log/codex-tui.log
- .codex/sessions/2025/12/28/rollout-2025-12-28T15-49-19-019b656f-6ca3-7981-ac4a-987399172cac.jsonl
- .codex/sessions/2025/12/28/rollout-2025-12-28T16-55-51-019b65ac-5679-79f1-8590-20e1621e840a.jsonl
- .codex/sessions/2025/12/28/rollout-2025-12-28T17-06-14-019b65b5-d71a-7832-bff9-f2984a2d3d50.jsonl
- _bmad-output/implementation-artifacts/2-4-delete-blog-entry.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- travelblogs/src/app/api/entries/[id]/route.ts
- travelblogs/src/app/trips/[tripId]/entries/new/page.tsx
- travelblogs/src/components/entries/delete-entry-modal.tsx
- travelblogs/src/components/entries/entry-detail.tsx
- travelblogs/tests/api/entries/delete-entry.test.ts
- travelblogs/tests/api/entries/update-entry.test.ts
- travelblogs/tests/components/delete-entry-modal.test.tsx
