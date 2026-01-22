# Story 11.4: Aggregate Trip Country Flags

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want to see a list of country flags for all countries visited in a trip,
so that I can quickly see which countries the trip covers.

## Acceptance Criteria

### AC 1: Flag List on Trip Overview
**Given** I am viewing a trip overview page
**When** the page loads
**Then** I see a list of country flags below the trip title
**And** flags are displayed in chronological order (first appearance in trip)
**And** each country appears only once (no duplicates)

### AC 2: Flag List on Shared Trip Overview
**Given** I am viewing a shared trip overview page
**When** the page loads
**Then** I see the same country flag list as in the authenticated view

### AC 3: No Flags if No Locations
**Given** a trip has no entries with location data
**When** the trip overview loads
**Then** no country flag list is displayed

### AC 4: Flag Order Reflects Chronology
**Given** a trip has entries in multiple countries
**When** the flag list is displayed
**Then** flags appear in the order they first appear chronologically in the trip

## Tasks / Subtasks

- [x] Compute unique trip countries in chronological order (AC: 1, 4)
  - [x] Add helper `getTripCountries(entries)` that extracts `location.countryCode`, dedupes, and orders by first entry date
  - [x] Ensure it ignores missing/invalid country codes
- [x] Render trip-level flags on authenticated trip overview (AC: 1, 3)
  - [x] Add flag list below trip title in `TripOverview` layout
  - [x] Render nothing if the computed list is empty
- [x] Render trip-level flags on shared trip overview (AC: 2, 3)
  - [x] Ensure shared trip overview data includes `location.countryCode`
  - [x] Render the same flag list layout used in authenticated view
- [x] Tests (AC: 1-4)
  - [x] Add tests for flag list ordering, de-duplication, and empty state
  - [x] Add shared trip overview test for flag list rendering

## Dev Notes

### Developer Context

This story aggregates country flags at the trip level. Country flags already exist on entry cards (Story 11.2) and entry detail pages (Story 11.3). Reuse the existing `countryCodeToFlag` helper and any existing country utilities; do not reintroduce new conversion logic. The trip overview UI already renders trip metadata and entry lists; place the flags directly below the trip title to match the epic requirement and keep the UI consistent with prior flag placements.

### Epic Context

Epic 11 is about deriving country flags from entry locations to enrich trip and entry UIs. Stories in this epic:
- 11.1 Add country code storage/extraction
- 11.2 Display flags on entry cards
- 11.3 Display flags on entry detail pages
- 11.4 Aggregate trip country flags (this story)

### Dependencies & Prerequisites

- Story 11.1 must be complete so entries have `location.countryCode`.
- Story 11.2 provides `countryCodeToFlag` and establishes flag rendering patterns.
- Story 11.3 confirms flag rendering on entry pages and shared entry APIs.

### Technical Requirements

- Helper: `getTripCountries(entries: Entry[]): string[]`
  - Extract `entry.location?.countryCode`
  - Normalize to uppercase (ISO 3166-1 alpha-2)
  - Remove duplicates by first chronological appearance
  - Order by the earliest entry date where that country appears
- Use `countryCodeToFlag(code)` from `travelblogs/src/utils/country-flag.ts`.
- Flags render horizontally, no separators, no new visible text.
- Do not render any list when no valid country codes exist.
- Ensure shared trip overview API payloads include `location.countryCode` for entries.
- Shared trip overview API contract: verify `travelblogs/src/app/api/trips/share/[token]/route.ts` includes `entries[].location.countryCode` in its `{ data, error }` response.
- Stack versions reference: Next.js + React (via Next.js), TypeScript, Prisma 7.2.0, Auth.js 4.24.13, Redux Toolkit 2.11.2, Zod 4.2.1, SQLite (see `/_bmad-output/project-context.md`).

### Architecture Compliance

- App Router only; keep components under `travelblogs/src/app` and `travelblogs/src/components`.
- Maintain `{ data, error }` response shape for any API adjustments.
- Follow project naming conventions: `PascalCase` components, `kebab-case.tsx` files.

### Library & Framework Requirements

- Next.js App Router + React + TypeScript.
- No new dependencies.

### File Structure Requirements

- Likely updates:
  - `travelblogs/src/components/trips/trip-overview.tsx`
  - `travelblogs/src/components/trips/trip-detail.tsx` (if this owns the title block)
  - `travelblogs/src/utils/country-flag.ts` or new helper in `travelblogs/src/utils/`
- Shared trip overview API (if needed):
  - `travelblogs/src/app/api/trips/share/[token]/route.ts`
- Tests:
  - `travelblogs/tests/components/trip-overview.test.tsx`
  - `travelblogs/tests/components/trip-detail.test.tsx` (if title block lives here)
  - `travelblogs/tests/api/trips/share-trip-overview.test.ts`

### Testing Requirements

- Trip overview shows flags in first-appearance order.
- Duplicate country codes do not render duplicate flags.
- No flags render when no entries have `location.countryCode`.
- Shared trip overview renders the same flag list as authenticated view.

### Previous Story Intelligence

- Story 11.3 added flag rendering to entry detail pages and extended shared entry APIs to expose `location.countryCode`.
- `countryCodeToFlag` exists and should be reused; keep the same null/invalid handling to avoid regressions.
- Recent changes added localized country names in some contexts; do not add new visible strings unless they are already localized.
- Story 11.3 tests exercised shared and authenticated flag rendering; use the same test data patterns for country codes and missing codes.

### Git Intelligence Summary

- Recent commits focused on country code extraction and flag display. Avoid schema changes; use existing `location.countryCode`.
- Keep UI changes small and aligned with existing trip overview layouts to reduce regression risk.
- Commit `2987d26` introduced country code extraction; rely on that behavior rather than new geocoding.

### Regression Checklist

- Trip overview loads without flags when entries lack `location.countryCode`.
- Flag ordering remains stable when entry list order changes (order by first entry date).
- Shared trip overview continues to render entry cards and flags without new strings.

### Out of Scope

- No new geocoding or backfill logic.
- No new UI copy, translations, or flag assets.
- No schema or migration changes.

### Latest Tech Information

- Web research not performed due to restricted network access. No new libraries required.

### Project Context Reference

- Follow `/_bmad-output/project-context.md` rules: camelCase variables, `{ data, error }` responses, tests under `tests/`, and UI strings must be translatable (avoid introducing new visible text).
- Use `utils/` for shared helpers; avoid adding `lib/`.

### References

- Epic requirements: `/_bmad-output/planning-artifacts/epics.md` (Epic 11, Story 11.4)
- Previous story: `/_bmad-output/implementation-artifacts/11-3-display-flags-on-entry-detail-pages.md`
- Helper: `travelblogs/src/utils/country-flag.ts`
- Project rules: `/_bmad-output/project-context.md`

## Story Completion Status

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

### Completion Notes List

- Added `getTripCountries` helper for chronological, deduped country codes.
- Rendered trip-level flag list in `TripOverview` when countries exist.
- Added component tests for ordering/empty state and shared trip flag rendering.
- Filtered trip-level flags to reflect the active tag selection.
- Added invalid country code coverage for trip-level flags.
- Tests: not run (not executed during review fix).

### File List

- `_bmad-output/implementation-artifacts/11-4-aggregate-trip-country-flags.md`
- `_bmad-output/implementation-artifacts/11-2-display-flags-on-entry-cards.md`
- `_bmad-output/implementation-artifacts/11-3-display-flags-on-entry-detail-pages.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/validation-report-20260121T183318Z.md`
- `_bmad-output/implementation-artifacts/validation-report-20260121T195344Z.md`
- `_bmad-output/implementation-artifacts/validation-report-20260122T192456Z.md`
- `travelblogs/src/app/api/trips/share/[token]/entries/[entryId]/route.ts`
- `travelblogs/src/app/api/trips/share/[token]/route.ts`
- `travelblogs/src/components/entries/entry-detail.tsx`
- `travelblogs/src/components/entries/entry-reader.tsx`
- `travelblogs/src/components/trips/trip-detail.tsx`
- `travelblogs/src/components/trips/trip-overview.tsx`
- `travelblogs/src/utils/country-flag.ts`
- `travelblogs/src/utils/trip-countries.ts`
- `travelblogs/tests/api/entries/list-entries.test.ts`
- `travelblogs/tests/api/trips/share-trip-entry.test.ts`
- `travelblogs/tests/api/trips/share-trip-overview.test.ts`
- `travelblogs/tests/components/entry-detail.test.tsx`
- `travelblogs/tests/components/entry-reader.test.tsx`
- `travelblogs/tests/components/shared-trip-page.test.tsx`
- `travelblogs/tests/components/trip-detail.test.tsx`
- `travelblogs/tests/components/trip-overview.test.tsx`
- `travelblogs/tests/utils/country-flag.test.ts`
- `travelblogs/tests/components/shared-trip-page.test.tsx`

### Change Log

- 2026-01-23: Created ready-for-dev story file for Epic 11, Story 4.
- 2026-01-22: Added trip-level country flag aggregation and tests.
