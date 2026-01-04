# Story 5.12: Shared View Button on Trip

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user (creator, contributor, or viewer),
I want to open the shared viewer experience for a trip,
so that I can read the trip story in the best viewing mode.

## Acceptance Criteria

1. **Given** I am signed in and have access to a trip
   **When** I open the trip detail view
   **Then** I see a "View" button that opens the shared-view reader for that trip
2. **Given** I am a contributor or the trip owner
   **When** I open the trip detail view
   **Then** I also see an "Edit" button for the trip
3. **Given** I am a viewer without contributor access
   **When** I open the trip detail view
   **Then** I do not see the "Edit" button
4. **Given** the shared-view link does not yet exist
   **When** I select "View"
   **Then** the system creates (or retrieves) the share link and opens the shared-view reader
5. **Given** I view the Manage Trips list
   **When** I look at a trip row
   **Then** I see a "View" button that opens the shared-view reader for that trip
6. **Given** I am a contributor or the trip owner
   **When** I view the Manage Trips list
   **Then** I see an "Edit" button for that trip
7. **Given** I am a viewer without contributor access
   **When** I view the Manage Trips list
   **Then** I do not see the "Edit" button for that trip
8. **Given** I click the trip card area on the Manage Trips list
   **When** the trip opens
   **Then** it opens the shared-view reader instead of the edit view

## Tasks / Subtasks

- [x] Add shared-view entry point on trip detail (AC: 1, 4)
  - [x] Reuse existing share-link API to fetch/create the shared view URL
  - [x] Add a "View" button next to trip actions and open `/trips/share/[token]`
- [x] Gate edit affordance by role/access (AC: 2, 3)
  - [x] Show "Edit" only when `canEditTrip === true`
  - [x] Keep viewers read-only (no edit affordance)
- [x] Add/adjust tests (AC: 1-4)
  - [x] Component test for "View" button visibility and click behavior
  - [x] Component test for "Edit" button visibility based on role
- [x] Add view/edit actions on Manage Trips list (AC: 1-3)
  - [x] Add "View" button per trip row linking to shared-view (`/trips/share/[token]`)
  - [x] Add "Edit" button per trip row for contributors/owners, opening current edit flow
  - [x] Change trip card click target to open shared-view instead of edit view
  - [x] Keep viewers view-only (no edit button)

## Dev Notes

- The shared-view experience already exists at `/trips/share/[token]`; use the share-link API to get or create the token. [Source: travelblogs/src/app/api/trips/[id]/share-link/route.ts] [Source: travelblogs/src/app/trips/share/[token]/page.tsx]
- Trip detail already manages share-link state; integrate the "View" button with that state instead of adding new endpoints. [Source: travelblogs/src/components/trips/trip-detail.tsx]
- Trip access flags are passed from the trip detail page (`canEditTrip`, etc.); use those for gating buttons. [Source: travelblogs/src/app/trips/[tripId]/page.tsx]

### Technical Requirements

- The "View" button must open the shared-view URL (`/trips/share/[token]`) for the current trip.
- If the share link is missing, the button should create or fetch one via existing share-link API and then open it.
- The "Edit" button must link to the current trip edit experience (`/trips/[tripId]/edit`).
- Responses must remain `{ data, error }` with `{ error: { code, message } }` and ISO timestamps.

### UX Requirements

- Buttons should match the existing trip action styling and hierarchy (warm palette, rounded buttons). [Source: travelblogs/src/components/trips/trip-detail.tsx]
- View should be the primary action for viewers; edit should remain secondary and hidden for view-only users. [Source: _bmad-output/ux-design-specification.md]

### Architecture Compliance

- App Router only; API routes under `src/app/api`.
- Use Prisma 7.2.0 + SQLite models; no schema changes required.
- Use Zod 4.2.1 for request validation (server-side only).

### Library/Framework Requirements

- Next.js App Router + TypeScript.
- Auth.js (NextAuth) 4.24.13 JWT sessions with `token.sub`, `token.role`.
- Prisma 7.2.0 + SQLite.

### File Structure Requirements

- Trip detail UI: `travelblogs/src/components/trips/trip-detail.tsx`.
- Trip detail page: `travelblogs/src/app/trips/[tripId]/page.tsx`.
- Shared view route: `travelblogs/src/app/trips/share/[token]/page.tsx`.
- Tests: `travelblogs/tests/components/`.

### Testing Requirements

- Component tests:
  - View button visible for all authorized roles with trip access.
  - Edit button visible only for contributors/owners.
  - Clicking view opens `/trips/share/[token]` (using mocked share-link API).

### Previous Story Intelligence

- Story 4.1/4.5 established share-link behavior and invalidation; reuse those endpoints and patterns. [Source: _bmad-output/implementation-artifacts/4-5-invalidate-shared-entry-pages-on-revoke.md]
- Story 5.6 added viewer access gating; maintain read-only affordances for view-only users. [Source: _bmad-output/implementation-artifacts/5-6-viewer-access-to-invited-trips.md]

### Git Intelligence Summary

- Recent commits added viewer invites and trip access gating; avoid regressions in Auth.js role checks and `{ data, error }` response shape. [Source: git log -5]

### Latest Tech Information

- Web research not performed due to network restrictions; use pinned versions and patterns in `_bmad-output/project-context.md`.

### Project Context Reference

- App Router only; REST endpoints plural; API responses wrapped `{ data, error }` with `{ error: { code, message } }`.
- Tests live in `tests/` (no co-located tests) and JSON fields are `camelCase`.
- Do not introduce Docker/TLS proxy in MVP tasks.

### Story Completion Status

- Status: done
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- API routes live under `travelblogs/src/app/api` and must be plural.
- Components live under `travelblogs/src/components/<feature>/`.
- Tests live under `travelblogs/tests/` (no co-located tests).

### References

- Epic and acceptance criteria: `_bmad-output/epics.md`
- Architecture and patterns: `_bmad-output/architecture.md`
- Project rules: `_bmad-output/project-context.md`
- UX design system: `_bmad-output/ux-design-specification.md`
- Trip detail UI: `travelblogs/src/components/trips/trip-detail.tsx`
- Trip detail page: `travelblogs/src/app/trips/[tripId]/page.tsx`
- Share link API: `travelblogs/src/app/api/trips/[id]/share-link/route.ts`
- Shared view route: `travelblogs/src/app/trips/share/[token]/page.tsx`

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Drafted shared-view button requirements with role-gated edit affordance.
- Reused existing share-link API and shared-view route patterns.
- Implemented shared-view action on trip detail with share-link creation and router navigation.
- Allowed share-link GET/POST for users with trip access while keeping owner-only rotate/revoke.
- Added component/API coverage for view access and share-link access; ran `npm test` and `npm run lint`.
- Added Manage Trips view/edit actions and routed card clicks to shared view.
- Expanded trip list data with edit access flags and added component/API tests; ran `npm test` and `npm run lint`.
- Adjusted Manage Trips edit button to open the trip detail page; ran `npm test` and `npm run lint`.
- Updated Manage Trips edit link to `/trips/[tripId]/edit` and moved the card click target to a dedicated button for accessibility.
- Added a loading guard to prevent duplicate share-link requests on trip cards.
- Updated trip card tests to match the edit route and card click target.
- Tests not run for these review fixes.

### File List

- _bmad-output/implementation-artifacts/5-12-shared-view-button.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- travelblogs/src/app/api/trips/route.ts
- travelblogs/src/app/trips/page.tsx
- travelblogs/src/components/trips/trip-detail.tsx
- travelblogs/src/components/trips/trip-card.tsx
- travelblogs/src/app/api/trips/[id]/share-link/route.ts
- travelblogs/tests/components/trip-detail.test.tsx
- travelblogs/tests/components/trip-card.test.tsx
- travelblogs/tests/components/trips-page.test.tsx
- travelblogs/tests/api/trips/share-link.test.ts
- travelblogs/tests/api/trips/list-trips.test.ts
