# Story 1.2: Create Trip

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want to create a new trip with basic details,
so that I can start organizing entries for that trip.

## Acceptance Criteria

1. **Given** I am a creator viewing the trips area
   **When** I submit the create trip form with required fields (title, start date, end date)
   **Then** a new trip is created and I am taken to the trip view
   **And** the trip appears in my trip list
2. **Given** I submit the create trip form with missing or invalid required fields
   **When** I attempt to save
   **Then** I see clear validation errors
   **And** the trip is not created

## Tasks / Subtasks

- [x] Add Trip data model and persistence (AC: 1, 2)
  - [x] Add Prisma (7.2.0) + SQLite setup if not already present
  - [x] Define `Trip` model with required fields (`title`, `startDate`, `endDate`) and optional `coverImageUrl`
  - [x] Include ownership field to associate trip with the creator account (Auth.js session user)
  - [x] Run Prisma migration for new schema
- [x] Implement create-trip API (AC: 1, 2)
  - [x] Add `POST /api/trips` route handler in `src/app/api/trips/route.ts`
  - [x] Validate request with Zod (server-side only)
  - [x] Enforce creator auth + per-trip ACL rules
  - [x] Return `{ data, error }` shape with ISO date strings
- [x] Build create-trip UI and flow (AC: 1, 2)
  - [x] Add create trip page (e.g., `src/app/trips/new/page.tsx`)
  - [x] Form fields: title, startDate, endDate (cover optional, not required)
  - [x] On success, navigate to trip detail view (`/trips/:id`)
  - [x] Surface inline validation errors and preserve user input on error
- [x] Wire trip list refresh (AC: 1)
  - [x] Ensure newly created trip appears in list state (reuse existing store or `src/utils/api.ts` helpers if present)
  - [x] If trip list UI is not yet implemented, add a minimal list state update for later consumption
- [x] Tests (AC: 1, 2)
  - [x] Ensure API validation coverage: add tests under `tests/api/` for success + validation failures
  - [x] If no test harness exists, create a minimal harness setup using Vitest + Testing Library and add the API tests (do not defer)
  - [x] If component testing exists, add form validation test under `tests/components/`

## Dev Notes

### Developer Context

- This story introduces the core Trip entity; keep scope limited to creation and validation.
- Auth is already established in Epic 0; creation must be creator-only.
- Use App Router route handlers and adhere strictly to response and naming conventions.
- Regression guardrail: do not refactor or rename existing auth/session flows or shared utils; changes must be additive.
- Performance guardrail: creation flow must be non-blocking with a visible loading state and no full-page reloads.

### Technical Requirements

- **Prisma/SQLite:** Use Prisma 7.2.0 with SQLite. Add or update schema in `prisma/schema.prisma`.
- **Trip model (minimum):** `id`, `title`, `startDate`, `endDate`, `coverImageUrl?`, `ownerId`, `createdAt`, `updatedAt`.
- **Relationships:** Note expected future relations (`Trip` -> `Entry`, `Trip` -> `ShareLink`, `Trip` -> `TripAccess`) as comments in schema to avoid conflicts later.
- **API:** `POST /api/trips` with Zod validation. Return `{ data, error }` and error format `{ error: { code, message } }`.
- **Dates:** Serialize all dates as ISO 8601 strings in JSON.
- **Auth:** Require creator session in API (`src/app/api/trips/route.ts`) and UI gate at `src/app/trips/new/page.tsx`.
- **Performance:** Show in-form loading/disabled submit while saving; avoid blocking navigation or rendering during submit.
- **Data fetching pattern:** Use server components + `fetch` for initial page data and Redux only for client state (no RTK Query).

### Architecture Compliance

- App Router only; API routes must be under `src/app/api`.
- REST endpoints are plural (`/trips`) with `:id` params.
- Naming: `camelCase` vars/JSON; `PascalCase` components; `kebab-case.tsx` files.
- Tests must live in `tests/` (no co-located tests).
- Do not refactor existing auth/session files or shared utilities in this story.
- Do not refactor shared `src/utils/api.ts` or Redux store setup (`src/store/index.ts`) if already present.

### Library/Framework Requirements

- Next.js App Router + TypeScript (existing).
- Zod 4.2.1 for server-side validation only.
- Redux Toolkit 2.11.2 for state if list state is introduced.
- Auth.js (NextAuth) 4.24.13 with JWT sessions for auth checks.

### File Structure Requirements

- API: `src/app/api/trips/route.ts` (POST) and `src/app/api/trips/[id]/route.ts` for future detail routes.
- UI: `src/app/trips/new/page.tsx`, `src/components/trips/` for form components.
- Store: `src/store/trips/trips-slice.ts` if state management is added/extended.
- Utils: API helper in `src/utils/api.ts` if needed; avoid `lib/`.

### Testing Requirements

- Add API tests in `tests/api/` for success + validation failures (required).
- If no test harness exists, introduce a minimal harness using **Vitest + Testing Library** and add those API tests in this story (required).
- Component tests in `tests/components/` if UI tests are already in place.
- Ensure test expectations use `{ data, error }` and `{ error: { code, message } }`.

### UX Requirements

- Follow UX form patterns: labels above fields, inline validation, clear error text.
- Primary action button only; use destructive styling only when needed.
- Maintain minimum 44x44 touch targets and readable body size (17-18px).

### Project Structure Notes

- The app lives under `travelblogs/` with `src/` directory from story 1.1.
- Keep `.env` and `.env.example` in app root; do not introduce `.env.local`.
- No Docker/TLS proxy in MVP.

### References

- Story source: `_bmad-output/epics.md` (Epic 1, Story 1.2)
- Architecture rules: `_bmad-output/architecture.md` (API patterns, structure, stack)
- UX patterns: `_bmad-output/ux-design-specification.md` (form patterns, accessibility)
- Global rules: `_bmad-output/project-context.md`

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

N/A

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Web research skipped due to restricted network access.
- No git commit history available for analysis (new repo).
- Previous story context applied (App Router, app location, env rules).
- Implemented Prisma SQLite setup with Trip model, migrations, and adapter-backed client.
- Added create-trip API with Zod validation, creator auth, and ISO date responses.
- Built trips list, create form, and trip detail pages with loading state and inline errors.
- Code review fixes: session-based ownership, inline validation + disabled submit, date validation tests, and local DB ignore.
- Tests: `npm test`, `npm run lint`.

### File List

- `_bmad-output/implementation-artifacts/1-2-create-trip.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `travelblogs/.env.example`
- `travelblogs/.gitignore`
- `travelblogs/package.json`
- `travelblogs/package-lock.json`
- `travelblogs/prisma.config.ts`
- `travelblogs/prisma/schema.prisma`
- `travelblogs/prisma/migrations/20251221215929_init/migration.sql`
- `travelblogs/prisma/migrations/migration_lock.toml`
- `travelblogs/src/utils/db.ts`
- `travelblogs/src/utils/auth-options.ts`
- `travelblogs/src/app/api/auth/[...nextauth]/route.ts`
- `travelblogs/src/app/api/trips/route.ts`
- `travelblogs/src/app/api/trips/[id]/route.ts`
- `travelblogs/src/app/trips/new/page.tsx`
- `travelblogs/src/app/trips/page.tsx`
- `travelblogs/src/app/trips/[id]/page.tsx`
- `travelblogs/src/components/trips/create-trip-form.tsx`
- `travelblogs/src/types/next-auth.d.ts`
- `travelblogs/tests/api/trips/trip-model.test.ts`
- `travelblogs/tests/api/trips/create-trip.test.ts`

### Change Log

- 2025-12-21: Implemented trip creation flow with Prisma-backed API, UI pages, and tests.
- 2025-12-21: Code review fixes for ownership scoping, inline validation, and date validation tests.

## Completion Checklist

- [x] Prisma schema updated and migrated
- [x] `POST /api/trips` implements validation + auth and returns `{ data, error }`
- [x] Create-trip UI works end-to-end and navigates to trip detail
- [x] Trip list reflects new trip
- [x] Loading state shown during submit, no full-page reloads
- [x] Tests added or TODO recorded if harness missing
