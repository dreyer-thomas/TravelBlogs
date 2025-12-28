# Story 1.4: Edit Trip Metadata

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want to edit a trip's basic details,
so that I can keep the trip information accurate.

## Acceptance Criteria

1. **Given** I am a creator viewing a trip I own  
   **When** I update trip metadata (title, dates, cover) and save  
   **Then** the changes are persisted  
   **And** the updated metadata appears in the trip view and trip list
2. **Given** I submit invalid metadata (missing title or invalid dates)  
   **When** I attempt to save  
   **Then** I see clear validation errors  
   **And** the changes are not saved

## Tasks / Subtasks

- [x] Add update-trip API endpoint (AC: 1, 2)
  - [x] Implement `PATCH /api/trips/[id]` in `src/app/api/trips/[id]/route.ts`
  - [x] Require creator session and enforce ownership (per-trip ACL)
  - [x] Validate title, startDate, endDate, coverImageUrl with Zod (match create-trip rules)
  - [x] Persist updates and return `{ data, error }` with ISO 8601 dates
  - [x] Return `{ error: { code, message } }` for `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`
- [x] Add edit flow in trip UI (AC: 1, 2)
  - [x] Provide an Edit action from the trip detail page (`src/app/trips/[id]/page.tsx`)
  - [x] Build edit form UI (new page or inline form) prefilled with current trip values
  - [x] Submit updates to `/api/trips/[id]`, show success and error states
  - [x] Redirect or re-render so the updated metadata is visible in detail + list views
- [x] Tests (AC: 1, 2)
  - [x] API tests under `tests/api/` for success, unauthorized, forbidden (not owner), not found, validation error
  - [x] Component test for edit form validation + submission if component test harness exists

## Dev Notes

### Developer Context

- Trip creation (`POST /api/trips`) and deletion (`DELETE /api/trips/[id]`) already exist; follow their auth and response patterns.
- Trip detail page already loads the trip server-side and renders metadata plus a delete modal.
- Edit is creator-only; viewers should never see edit controls.
- Regression guardrail: do not rename or restructure existing trip routes or auth/session utilities.

### Technical Requirements

- **API:** Use App Router route handlers in `src/app/api/trips/[id]/route.ts` with a `PATCH` handler.
- **Auth:** `getToken` + creator check (`token.sub === "creator"`) consistent with create/delete.
- **Validation:** Use Zod 4.2.1. Keep rules aligned with create-trip:
  - `title`: non-empty string
  - `startDate`, `endDate`: required ISO strings; `startDate <= endDate`
  - `coverImageUrl`: optional string; allow empty string and trim to `undefined`
- **Data:** Use Prisma to update by `id` + `ownerId`. Return ISO 8601 strings for dates.
- **Errors:** Always return `{ data: null, error: { code, message } }` on failures.
- **Dates:** JSON responses must use ISO 8601 strings.

### Architecture Compliance

- REST endpoints are plural (`/trips`) with `:id` params.
- Responses always wrapped `{ data, error }`.
- Naming: `camelCase` vars/JSON, `PascalCase` components, `kebab-case.tsx` files.
- Tests live under `tests/` only (no co-located tests).
- Use `src/utils/` for shared helpers; avoid adding `lib/`.

### Library/Framework Requirements

- Next.js App Router + TypeScript.
- Prisma 7.2.0 with SQLite.
- Zod 4.2.1 for request validation (server-side only).
- Auth.js (NextAuth) 4.24.13 with JWT sessions for auth checks.
- Redux Toolkit 2.11.2 only if existing state pattern requires it (prefer current server-rendered fetch flow).

### File Structure Requirements

- API: `src/app/api/trips/[id]/route.ts` (add `PATCH`).
- UI: `src/app/trips/[id]/page.tsx` (Edit CTA) + `src/app/trips/[id]/edit/page.tsx` or `src/components/trips/edit-trip-form.tsx`.
- Utils (if needed): `src/utils/` (e.g., shared date formatting or validation helpers).
- Tests: `tests/api/trips/update-trip.test.ts`, `tests/components/trips/edit-trip-form.test.tsx` (if applicable).

### Testing Requirements

- API tests: success, unauthorized, forbidden (not owner), not found, validation error.
- Component test if harness exists: client-side validation, error messaging, submit success path.
- Ensure tests assert `{ data, error }` and `{ error: { code, message } }` shapes.

### UX Requirements

- Follow existing visual language (ivory background, terracotta accents, teal primary).
- Inline validation with clear, human-friendly messaging.
- Destructive actions remain red; edit actions are primary teal.
- Maintain 44x44 touch targets and visible focus states.

### Project Structure Notes

- App lives under `travelblogs/` with `src/` directory.
- Keep `.env` and `.env.example` in app root; do not introduce `.env.local`.
- No Docker/TLS proxy changes in MVP.

### References

- Story source: `_bmad-output/epics.md` (Epic 1, Story 1.4)
- Architecture rules: `_bmad-output/architecture.md` (API patterns, structure, stack)
- UX patterns: `_bmad-output/ux-design-specification.md` (forms, accessibility, color, typography)
- Previous story context: `_bmad-output/implementation-artifacts/1-3-delete-trip.md`
- Global rules: `_bmad-output/project-context.md`

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

N/A

### Implementation Plan

- Add `PATCH /api/trips/[id]` with creator auth + ownership checks and Zod validation aligned to create-trip.
- Update trip metadata via Prisma and return ISO 8601 dates in `{ data, error }` responses.
- Add API coverage for success, auth, ownership, not-found, and validation failures.
- Add edit UI with prefilled form values and PATCH submission to refresh trip details.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Web research skipped due to restricted network access.
- Git history unavailable (no commits yet).
- Implemented PATCH trip endpoint with auth, ownership checks, validation, and ISO 8601 responses.
- Added update-trip API coverage for success and error cases.
- Stabilized trip API tests by isolating update/delete test databases.
- Tests run: `npx vitest run tests/api/trips/update-trip.test.ts`, `npm test`.
- Added edit trip CTA, edit page, and form with inline validation and PATCH submission.
- Component test skipped; no component harness found under `tests/components`.
- Tests run: `npm test`.
- Revalidated full test suite: `npm test`.
- Fixed code review findings: ISO date-only validation, http/https cover URL checks, and cover image clearing support.
- Tests run: `npm test`.
- Git status includes unrelated bootstrap/Codex artifacts; File List scoped to story-specific files.

### File List

- `_bmad-output/implementation-artifacts/1-4-edit-trip-metadata.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `travelblogs/src/app/api/trips/[id]/route.ts`
- `travelblogs/src/app/api/trips/route.ts`
- `travelblogs/src/app/trips/[id]/edit/page.tsx`
- `travelblogs/src/app/trips/[id]/page.tsx`
- `travelblogs/src/components/trips/edit-trip-form.tsx`
- `travelblogs/tests/api/trips/create-trip.test.ts`
- `travelblogs/tests/api/trips/delete-trip.test.ts`
- `travelblogs/tests/api/trips/update-trip.test.ts`

### Change Log

- 2025-12-22: Added trip edit API, UI flow, and tests for metadata updates.
- 2025-12-22: Addressed code review findings (validation, cover URL checks, cover clearing).
