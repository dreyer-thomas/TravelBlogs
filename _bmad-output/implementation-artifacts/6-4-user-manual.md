# Story 6.4: User Manual

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want a user manual that explains navigation and actions by role and trip permissions,
so that I can understand how to use the app based on my access.

## Acceptance Criteria

1. **Given** I am signed in as any role
   **When** I open the user manual
   **Then** I see sections tailored to my role (creator, viewer)
2. **Given** I view the manual as a viewer without contributor access
   **When** I read the permissions section
   **Then** I see only read-only actions and navigation options
3. **Given** I view the manual as a contributor
   **When** I read the permissions section
   **Then** I see entry create/edit actions and their navigation paths
4. **Given** I view the manual as a creator
   **When** I read the manual
   **Then** I see admin, trip management, sharing, and contributor controls

## Tasks / Subtasks

- [x] Define manual content structure (AC: 1-4)
  - [x] Outline role-based sections (viewer, contributor, creator)
  - [x] List permitted actions per role and navigation paths
- [x] Add manual UI page (AC: 1-4)
  - [x] Create `/manual` page with role-aware sections
  - [x] Use warm palette + typography tokens and readable layout
- [x] Wire access context (AC: 1-4)
  - [x] Use session role to show appropriate sections
  - [x] Use trip access info to show contributor vs viewer content
- [x] Add/adjust tests (AC: 1-4)
  - [x] Component tests for role-specific content rendering

## Dev Notes

- The app already has role-based access control in Auth.js sessions; use `session.user.role` as the primary role indicator. [Source: travelblogs/src/utils/auth-options.ts]
- Trip permissions (viewer vs contributor) are modeled via `TripAccess.canContribute`; use existing access helper or props to determine contributor content. [Source: travelblogs/src/utils/trip-access.ts]
- Follow existing page layout style for centered panels and warm palette. [Source: travelblogs/src/app/sign-in/page.tsx]

### Technical Requirements

- The manual page must be accessible to authenticated users and reflect their role and trip permissions.
- The manual must clearly document navigation and actions for each role without exposing actions the user cannot perform.
- Responses must remain `{ data, error }` with `{ error: { code, message } }` where API data is used.

### UX Requirements

- Use the established typography system and warm palette; keep line lengths readable (55-75 chars). [Source: _bmad-output/ux-design-specification.md]
- Manual content should be scannable with headings, short paragraphs, and action lists.

### Architecture Compliance

- App Router only; page under `src/app`.
- Use Prisma 7.2.0 + SQLite models; no schema changes required.
- Use Zod 4.2.1 for request validation only if needed (server-side only).

### Library/Framework Requirements

- Next.js App Router + TypeScript.
- Auth.js (NextAuth) 4.24.13 JWT sessions with `token.sub`, `token.role`.
- Prisma 7.2.0 + SQLite.

### File Structure Requirements

- Manual UI: `travelblogs/src/app/manual/page.tsx`.
- Tests: `travelblogs/tests/components/`.

### Testing Requirements

- Component tests:
  - Viewer role sees viewer-only actions.
  - Contributor sees contributor actions.
  - Creator sees admin/trip management actions.

### Previous Story Intelligence

- Epic 5 stories established role-based access and contributor permissions; reuse those rules for manual content. [Source: _bmad-output/implementation-artifacts/5-5-enable-contributor-access-for-a-viewer.md]
- Viewer access rules are defined in Story 5.6; do not advertise contributor actions to view-only users. [Source: _bmad-output/implementation-artifacts/5-6-viewer-access-to-invited-trips.md]

### Git Intelligence Summary

- Recent commits added viewer invites and contributor access; avoid regressions in Auth.js role checks and `{ data, error }` response shape. [Source: git log -5]

### Latest Tech Information

- Web research not performed due to network restrictions; use pinned versions and patterns in `_bmad-output/project-context.md`.

### Project Context Reference

- App Router only; REST endpoints plural; API responses wrapped `{ data, error }` with `{ error: { code, message } }`.
- Tests live in `tests/` (no co-located tests) and JSON fields are `camelCase`.
- Do not introduce Docker/TLS proxy in MVP tasks.

### Story Completion Status

- Status: ready-for-dev
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Components live under `travelblogs/src/components/<feature>/`.
- Tests live under `travelblogs/tests/` (no co-located tests).

### References

- Epic and acceptance criteria: `_bmad-output/epics.md`
- Architecture and patterns: `_bmad-output/architecture.md`
- Project rules: `_bmad-output/project-context.md`
- UX design system: `_bmad-output/ux-design-specification.md`
- Auth options: `travelblogs/src/utils/auth-options.ts`
- Trip access helper: `travelblogs/src/utils/trip-access.ts`

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Drafted role-based manual content requirements and UI page scope.
- Added test coverage expectations for role-specific manual content.
- ✅ Implemented role-based user manual page at /manual with sections for viewer, contributor, creator, and administrator roles.
- ✅ Manual page uses session.user.role to conditionally render role-specific content and navigation guidance.
- ✅ Created comprehensive component tests (10 test cases) verifying role-specific content rendering for all roles.
- ✅ All tests pass (350/350) with no regressions across 60 test files.
- ✅ Code review fixes applied: Corrected role visibility logic, clarified contributor access is trip-specific, updated tests to match implementation.

### File List

- _bmad-output/epics.md
- _bmad-output/architecture.md
- _bmad-output/project-context.md
- _bmad-output/ux-design-specification.md
- travelblogs/src/utils/auth-options.ts
- travelblogs/src/utils/trip-access.ts
- travelblogs/src/app/manual/page.tsx (NEW - role-based manual page with auth guard)
- travelblogs/tests/components/manual-page.test.tsx (NEW - 10 test cases for role-specific rendering)
- travelblogs/src/components/account/user-menu.tsx (modified - added "User Manual" menu item)

## Change Log

- 2026-01-09: Implemented role-based user manual with sections for viewer, contributor, creator, and administrator roles. Added comprehensive component tests (10 test cases). All 350 tests pass with no regressions. Code review applied fixes for role visibility logic and contributor section clarity.
