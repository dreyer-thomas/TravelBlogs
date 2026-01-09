# Story 5.19: Fix Edit Navigation Targets

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator or contributor,
I want Edit actions to open the correct screen,
so that I can edit trip details without confusing navigation.

## Acceptance Criteria

1. **Given** I am on Manage Trips
   **When** I click Edit for a trip
   **Then** I am taken to the Trip Overview for that trip (not Trip Details)
2. **Given** I am on Trip Overview
   **When** I click Edit
   **Then** I am taken to Edit Trip Details for that trip
3. **Given** I navigate between Manage Trips and Trip Overview
   **When** I use Edit in either context
   **Then** navigation matches AC1 and AC2 consistently across desktop and mobile

## Tasks / Subtasks

- [x] Update Manage Trips edit action to route to Trip Overview (AC: 1)
  - [x] Identify Manage Trips edit button/link source
  - [x] Update route target and any associated tests/labels
- [x] Update Trip Overview edit action to route to Edit Trip Details (AC: 2)
  - [x] Identify Trip Overview edit button/link source
  - [x] Update route target and any associated tests/labels
- [x] Add/adjust tests for both navigation paths (AC: 1, 2, 3)
  - [x] Component test for Manage Trips edit route target
  - [x] Component test for Trip Overview edit route target

## Dev Notes

- Ensure Edit routes remain within App Router patterns. [Source: _bmad-output/project-context.md]
- Confirm existing route paths for Trip Overview and Trip Details/Edit before changing links.
- Keep button labels/placement unchanged; only fix the navigation targets.

### Technical Requirements

- Update only route targets; no schema changes or new endpoints.
- Maintain existing layout and UI structure.

### UX Requirements

- Navigation should feel consistent and predictable in both contexts.

### Architecture Compliance

- App Router only; use existing routes and components.
- Use existing data models and response shapes.

### Library/Framework Requirements

- Next.js App Router + TypeScript.

### File Structure Requirements

- Components live under `travelblogs/src/components/<feature>/`.
- Tests live in `travelblogs/tests/` (no co-located tests).

### Testing Requirements

- Component tests for both navigation paths.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

- N/A

### Completion Notes List

- ✅ Updated TripCard component to route Edit button to `/trips/{id}/overview` instead of `/trips/{id}/edit` (AC1)
- ✅ Updated TripDetail component to route Edit button to `/trips/{trip.id}/edit` instead of `/trips` (AC2)
- ✅ Added component test for TripCard edit navigation to overview
- ✅ Added component test for TripDetail edit navigation to edit page
- ✅ Added backToTripsHref prop to TripOverview component for consistent "Back to trips" navigation
- ✅ Updated trip overview page route to include backToTripsHref="/trips"
- ✅ Updated shared trip page route to include backToTripsHref="/trips"
- ✅ Added tests for backToTripsHref rendering in TripOverview component
- ✅ All 339 tests passing with no regressions

### File List

- travelblogs/src/components/trips/trip-card.tsx
- travelblogs/src/components/trips/trip-detail.tsx
- travelblogs/src/components/trips/trip-overview.tsx
- travelblogs/src/app/trips/[tripId]/overview/page.tsx
- travelblogs/src/app/trips/share/[token]/page.tsx
- travelblogs/tests/components/trip-card.test.tsx
- travelblogs/tests/components/trip-detail.test.tsx
- travelblogs/tests/components/trip-overview.test.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/5-19-fix-edit-navigation.md

### Change Log

- 2026-01-07: Story created.
- 2026-01-08: Navigation targets corrected for Edit buttons in both Manage Trips and Trip Overview contexts. Additionally implemented backToTripsHref prop in TripOverview component and applied to trip overview and shared trip pages for consistent navigation UX.
