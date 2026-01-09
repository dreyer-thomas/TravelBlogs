# Story 5.20: Add Back to Trips Navigation from Trip Views

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want a way to navigate back to the Manage Trips page from trip views,
so that I can return to my trips list without relying on the browser back button.

## Acceptance Criteria

1. **Given** I am viewing a shared trip overview at `/trips/share/[token]`
   **When** I look for navigation options
   **Then** I see a "Back to trips" or "My trips" link that navigates to `/trips`
2. **Given** I am viewing an authenticated trip overview (future stories)
   **When** I look for navigation options
   **Then** I see a "Back to trips" or "My trips" link that navigates to `/trips`
3. **Given** I click the "Back to trips" navigation
   **When** the `/trips` page loads
   **Then** I see my complete trips list as expected

## Tasks / Subtasks

- [x] Add back-to-trips navigation to shared trip overview (AC: 1, 3)
  - [x] Identify shared trip overview component/page location
  - [x] Add "Back to trips" link or button with appropriate styling
  - [x] Ensure link navigates to `/trips` route
  - [x] Position navigation consistently with existing UI patterns
- [x] Add back-to-trips navigation to authenticated trip views (AC: 2, 3)
  - [x] Identify authenticated trip overview locations (if implemented)
  - [x] Add consistent "Back to trips" navigation
  - [x] Ensure navigation works for all user roles (viewer, creator, admin)
- [x] Add/adjust tests (AC: 1, 2, 3)
  - [x] Component test for shared trip overview back navigation presence
  - [x] Component test for correct `/trips` link target
  - [x] Integration test verifying navigation flow works end-to-end

## Dev Notes

- Story 5-17 added "Back to trip" navigation from shared **entries** to shared **overview**. This story completes the navigation hierarchy by adding "Back to trips" from **overview** to **trips list**. [Source: _bmad-output/implementation-artifacts/5-17-shared-view-back-to-overview.md]
- Shared trip overview lives at `/trips/share/[token]` and likely has a component in `src/app/trips/share/[token]/page.tsx` or uses a shared component. [Context: Recent story 5-17]
- Keep navigation styling consistent with existing shared view UI patterns (likely using Next.js Link with teal/primary color scheme). [Context: Story 5-17 patterns]
- Consider whether navigation should be:
  - Top-left breadcrumb style
  - Header link alongside user menu
  - Prominent button near trip title
  - Mobile-friendly placement

### Technical Requirements

- Navigation must use Next.js `<Link>` component pointing to `/trips`
- Should work for all authenticated users (viewer, contributor, owner, admin)
- Must be accessible with proper aria-labels
- Should maintain consistent styling with existing navigation patterns

### UX Requirements

- Navigation should be discoverable without being intrusive
- Placement should work on both desktop and mobile viewports
- Should use clear, concise label ("Back to trips", "My trips", or similar)
- Icon optional but should match existing navigation iconography if used

### Architecture Compliance

- App Router only; use existing Next.js routing
- No API changes or database schema modifications required
- Use existing component patterns and Tailwind CSS styling

### Library/Framework Requirements

- Next.js App Router + TypeScript
- Next.js Link component for navigation
- Tailwind CSS for styling
- Auth.js (NextAuth) 4.24.13 for session context (if role-based display needed)

### File Structure Requirements

- Shared trip overview: `travelblogs/src/app/trips/share/[token]/page.tsx` (likely location)
- Shared trip components: `travelblogs/src/components/trips/` (check for shared components)
- Tests: `travelblogs/tests/components/` (no co-located tests)

### Testing Requirements

- Component tests:
  - "Back to trips" link renders in shared trip overview
  - Link href points to `/trips`
  - Link accessible with appropriate aria-label
- Integration tests (optional but recommended):
  - User can navigate: trips list → shared view → back to trips list
  - Navigation preserves authentication state

### Previous Story Intelligence

- Story 5-17 established pattern for "Back to trip" navigation from shared entries → shared overview. This story extends that pattern one level up. [Source: _bmad-output/implementation-artifacts/5-17-shared-view-back-to-overview.md]
- Story 5-12 introduced shared view button on trip cards, establishing the entry point to shared views. [Context: sprint-status.yaml history]
- Recent stories (5-15, 5-17, 5-18) have been refining shared view UX and navigation patterns. This story completes the navigation hierarchy.

### Git Intelligence Summary

- Recent commit "Story 5.17 Shared view back to overview" added entry→overview navigation. [Source: git log]
- Recent commits show focus on shared view UX refinements and navigation improvements.
- Examine 5-17 implementation files for established navigation patterns to maintain consistency.

### Latest Tech Information

- Web research not performed due to network restrictions; use pinned versions and patterns in `_bmad-output/project-context.md`.

### Project Context Reference

- App Router only; REST endpoints plural; API responses wrapped `{ data, error }` with `{ error: { code, message } }`.
- Tests live in `tests/` (no co-located tests) and JSON fields are `camelCase`.
- Do not introduce Docker/TLS proxy in MVP tasks.

### Story Completion Status

- Status: done
- Completion note: Code review complete. All acceptance criteria satisfied. All tests passing (339/339).

### Project Structure Notes

- API routes live under `travelblogs/src/app/api` and must be plural.
- Components live under `travelblogs/src/components/<feature>/`.
- Tests live under `travelblogs/tests/` (no co-located tests).

### References

- Epic and acceptance criteria: `_bmad-output/epics.md` (if exists)
- Architecture and patterns: `_bmad-output/architecture.md` (if exists)
- Project rules: `_bmad-output/project-context.md`
- Previous navigation story: `_bmad-output/implementation-artifacts/5-17-shared-view-back-to-overview.md`
- Shared trip overview: `travelblogs/src/app/trips/share/[token]/page.tsx`

## Dev Agent Record

### Agent Model Used

Bob (Scrum Master) - Story Creation Agent
Amelia (Dev Agent) - Story Implementation

### Debug Log References

- User identified navigation gap: Users can enter shared trip views but have no way back to `/trips` page without browser back button
- Story 5-17 scope verified: Only covers entry→overview navigation, not overview→trips-list
- Story 5-19 scope verified: Only covers Edit button routing fixes, not back navigation

### Implementation Plan

- Added optional `backToTripsHref` prop to TripOverview component following pattern from story 5-17 (backToTripHref in EntryReader)
- Wired shared trip overview page to pass `/trips` href
- Wired authenticated trip overview page to pass `/trips` href
- TripDetail component already has back navigation (no changes needed)
- Added component tests for both presence and absence of back link
- Added integration tests for shared trip page navigation
- All 339 tests passing

### Completion Notes List

- Created story 5-20 to address missing "Back to trips" navigation from trip overview pages
- Based on user-identified gap and analysis of existing story 5-17 scope
- Story provides comprehensive context for navigation hierarchy completion
- ✅ Added `backToTripsHref` prop to TripOverview component (travelblogs/src/components/trips/trip-overview.tsx:26)
- ✅ Implemented "← Back to trips" link rendering when prop provided (travelblogs/src/components/trips/trip-overview.tsx:56-63)
- ✅ Wired shared trip overview page (travelblogs/src/app/trips/share/[token]/page.tsx:119)
- ✅ Wired authenticated trip overview page (travelblogs/src/app/trips/[tripId]/overview/page.tsx:118)
- ✅ Added component tests (travelblogs/tests/components/trip-overview.test.tsx:111-148)
- ✅ Added integration tests (travelblogs/tests/components/shared-trip-page.test.tsx)
- ✅ All tests passing (339/339)

### File List

- _bmad-output/implementation-artifacts/5-20-back-to-trips-navigation.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- travelblogs/src/components/trips/trip-overview.tsx
- travelblogs/src/app/trips/share/[token]/page.tsx
- travelblogs/src/app/trips/[tripId]/overview/page.tsx
- travelblogs/tests/components/trip-overview.test.tsx
- travelblogs/tests/components/shared-trip-page.test.tsx

### Change Log

- 2026-01-09: Implemented back-to-trips navigation for shared and authenticated trip overviews, added comprehensive tests, marked story ready for review.
