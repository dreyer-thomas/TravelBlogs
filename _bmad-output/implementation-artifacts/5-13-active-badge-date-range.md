# Story 5.13: Active Badge Date Range

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want the "Active" badge to appear only when today's date falls within a trip's start and end dates,
so that past and future trips are not labeled active.

## Acceptance Criteria

1. **Given** a trip's start and end dates are in the past
   **When** I view the Manage Trips list
   **Then** the trip does not show the "Active" badge
2. **Given** a trip's start and end dates are in the future
   **When** I view the Manage Trips list
   **Then** the trip does not show the "Active" badge
3. **Given** today's date is between the trip's start and end dates (inclusive)
   **When** I view the Manage Trips list
   **Then** the trip shows the "Active" badge

## Tasks / Subtasks

- [ ] Add date-range logic to trip card badge (AC: 1-3)
  - [ ] Compare current date (UTC) to trip start/end dates (UTC)
  - [ ] Render "Active" badge only when `startDate <= today <= endDate`
- [ ] Add/adjust tests (AC: 1-3)
  - [ ] Component tests for past, current, and future trip badge visibility

## Dev Notes

- Trip list cards are rendered in `TripCard`; the badge is currently always shown. [Source: travelblogs/src/components/trips/trip-card.tsx]
- Trip dates are displayed using `toLocaleDateString` with `timeZone: "UTC"`; align active range checks with the same UTC basis. [Source: travelblogs/src/components/trips/trip-card.tsx]
- Trips list is rendered on the Manage Trips page; no API changes required. [Source: travelblogs/src/app/trips/page.tsx]

### Technical Requirements

- Date comparison must be done in UTC to match existing display logic.
- A trip is active if the current date is on or after `startDate` and on or before `endDate`.
- No API changes required; keep existing trip list response shape.

### UX Requirements

- The "Active" badge styling must remain unchanged when shown.
- Do not show any placeholder when inactive; simply omit the badge.

### Architecture Compliance

- App Router only; no new API routes required.
- Use existing component structure and utility patterns.

### Library/Framework Requirements

- Next.js App Router + TypeScript.
- Use standard Date APIs (no new date libraries unless approved).

### File Structure Requirements

- Component update: `travelblogs/src/components/trips/trip-card.tsx`.
- Tests: `travelblogs/tests/components/`.

### Testing Requirements

- Component tests:
  - Past trip: no badge.
  - Future trip: no badge.
  - Current trip (inclusive): badge visible.

### Previous Story Intelligence

- Trip list UI already uses the warm palette and typography tokens; preserve existing visuals. [Source: travelblogs/src/app/trips/page.tsx]

### Git Intelligence Summary

- Recent commits added viewer access and trip list changes; avoid regressions in trips page rendering. [Source: git log -5]

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
- Trip card component: `travelblogs/src/components/trips/trip-card.tsx`
- Trips page: `travelblogs/src/app/trips/page.tsx`

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Drafted date-range active badge behavior aligned to UTC date display.
- Added test coverage expectations for past/current/future trips.

### File List

- _bmad-output/epics.md
- _bmad-output/architecture.md
- _bmad-output/project-context.md
- travelblogs/src/components/trips/trip-card.tsx
- travelblogs/src/app/trips/page.tsx
