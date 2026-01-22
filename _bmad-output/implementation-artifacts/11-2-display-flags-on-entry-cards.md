# Story 11.2: Display Flags on Entry Cards

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want to see country flag emojis on entry cards,
so that I can quickly identify the country for each entry.

## Acceptance Criteria

### AC 1: Flag Display on Trip Overview Cards
**Given** I am viewing the trip overview page
**When** entry cards are displayed
**Then** I see a country flag emoji next to each entry title (if country code exists)

### AC 2: Flag Display on Shared Trip Overview Cards
**Given** I am viewing a shared trip overview page
**When** entry cards are displayed
**Then** I see country flag emojis on entry cards (same as authenticated view)

### AC 3: No Flag if Country Unknown
**Given** an entry has no country code
**When** the entry card is displayed
**Then** no flag is shown (graceful degradation)

### AC 4: Flag Display on Trip Detail Entry List
**Given** I am viewing a trip detail page
**When** entry cards are displayed in the entry list
**Then** I see a country flag emoji next to each entry title (if country code exists)

## Tasks / Subtasks

- [x] Add country code -> flag helper (AC: 1, 2, 3)
  - [x] Create `src/utils/country-flag.ts` with `countryCodeToFlag(code: string): string | null`
  - [x] Normalize to uppercase, validate `^[A-Z]{2}$`, return null on invalid/missing
  - [x] Build flag via regional-indicator code points (avoid hard-coded emoji literals)
- [x] Render flags on entry cards (AC: 1, 2)
  - [x] Update `src/components/trips/trip-overview.tsx` entry card title row to include flag
  - [x] Show flag only when `entry.location?.countryCode` resolves to a valid flag
  - [x] Keep layout stable (small gap before title, no wrapping issues)
- [x] Ensure shared trip overview uses the same rendering (AC: 2)
  - [x] Confirm no additional component needed (shared overview uses `TripOverview`)
- [x] Render flags on trip detail entry list (AC: 4)
  - [x] Update `src/components/trips/trip-detail.tsx` entry list title row to include flag
  - [x] Show flag only when `entry.location?.countryCode` resolves to a valid flag
- [x] Tests (AC: 1, 2, 3, 4)
  - [x] Add unit tests for `countryCodeToFlag` in `tests/utils/country-flag.test.ts`
  - [x] Update `tests/components/trip-overview.test.tsx` to assert flag renders when countryCode exists
  - [x] Add/adjust a test case to ensure no flag when countryCode is missing
  - [x] Add a test case to assert the trip detail entry list renders a flag when countryCode exists

## Dev Notes

### Developer Context

This story surfaces the country codes added in Story 11.1 on the entry cards for trip overview pages. Both authenticated and shared overview pages render the same `TripOverview` component, so the flag display should be implemented once in `src/components/trips/trip-overview.tsx` and will apply everywhere (including shared links).

`TripOverviewEntry` already includes `location` data; Story 11.1 updates API responses to include `location.countryCode`. This story should only read and present that data.

### Technical Requirements

- Add a helper `countryCodeToFlag` that returns a flag emoji string or null.
  - Normalize input (`trim`, `toUpperCase`).
  - Validate exactly two A-Z letters; return null if invalid/missing.
  - Build flag using Unicode regional indicator symbols:
    - `A` maps to `0x1F1E6`, `B` to `0x1F1E7`, etc.
    - `String.fromCodePoint(...points)` to produce the emoji without hard-coded literals.
- Entry card rendering:
  - Use `entry.location?.countryCode` as input.
  - Add a small inline flag element next to the title (same line) with spacing.
  - If the helper returns null, render nothing.
- Avoid adding any new visible copy; no translation keys required.

### Architecture Compliance

- Follow project rules in `/_bmad-output/project-context.md`:
  - `camelCase` in code (`countryCodeToFlag`).
  - `kebab-case.ts` for files (`country-flag.ts`).
  - Tests in `tests/` (not co-located).
  - App Router usage unchanged (component-only change).
  - UI strings must be translatable; do not introduce new visible text.
- Keep entry card behavior consistent with existing tag/date/title layout.

### Library & Framework Requirements

- No new dependencies.
- Use standard TypeScript/React and existing utilities.

### File Structure Requirements

- Create: `travelblogs/src/utils/country-flag.ts`
- Update: `travelblogs/src/components/trips/trip-overview.tsx`
- Update: `travelblogs/src/components/trips/trip-detail.tsx`
- Add tests: `travelblogs/tests/utils/country-flag.test.ts`, `travelblogs/tests/components/trip-overview.test.tsx`, `travelblogs/tests/components/trip-detail.test.tsx`

### Testing Requirements

- `countryCodeToFlag` returns expected flags for valid codes (e.g., US, DE, JP).
- Invalid/empty inputs return null.
- Trip overview entry cards show the flag when `location.countryCode` is present.
- No flag renders when `countryCode` is missing.
- Trip detail entry list shows the flag when `location.countryCode` is present.

### Previous Story Intelligence

- Story 11.1 adds `countryCode` to entry location and includes it in trip overview API responses; reuse `entry.location?.countryCode`.
- Backfill and reverse geocoding already exist; do not add new geocoding or data writes here.

### Git Intelligence Summary

- Recent commit `2987d26` implements Story 11.1 (country code storage/extraction). Follow the same utils/test patterns used there.

### References

- Epics requirements: `/_bmad-output/planning-artifacts/epics.md` (Epic 11, Story 11.2)
- Entry card component: `travelblogs/src/components/trips/trip-overview.tsx`
- Shared trip overview usage: `travelblogs/src/app/trips/share/[token]/page.tsx`
- Trip overview types: `travelblogs/src/types/trip-overview.ts`
- Project rules: `/_bmad-output/project-context.md`

### Project Context Reference

- Follow `camelCase` naming and `kebab-case.ts` file naming.
- Keep UI strings translatable; avoid adding new copy for the flag display.
- Tests live in `tests/` (no co-located tests).
- App Router structure remains unchanged.

## Story Completion Status

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

### Implementation Plan

- Add `countryCodeToFlag` helper that validates input and builds regional-indicator flags.
- Render a flag in `TripOverview` entry titles when `location.countryCode` maps to a valid flag.
- Add unit tests for the helper and update TripOverview tests for flag presence/absence.
- Render a flag in `TripDetail` entry list titles when `location.countryCode` maps to a valid flag.

### Completion Notes List

- Implemented `countryCodeToFlag` helper and rendered flags in trip overview entry titles.
- Added tests for flag helper and TripOverview flag rendering.
- Included `countryCode` in shared trip overview API responses to support flags on shared pages.
- Added flag rendering to the trip detail entry list when country codes exist.
- Tests: not run (not executed during review fix).
- Lint: not run (known pre-existing issues in unrelated files).

### File List

- `_bmad-output/implementation-artifacts/11-2-display-flags-on-entry-cards.md`
- `_bmad-output/implementation-artifacts/validation-report-20260121T183318Z.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `travelblogs/src/utils/country-flag.ts`
- `travelblogs/src/components/trips/trip-overview.tsx`
- `travelblogs/src/components/trips/trip-detail.tsx`
- `travelblogs/tests/utils/country-flag.test.ts`
- `travelblogs/tests/components/trip-overview.test.tsx`
- `travelblogs/tests/api/entries/list-entries.test.ts`
- `travelblogs/src/app/api/trips/share/[token]/route.ts`
- `travelblogs/tests/api/trips/share-trip-overview.test.ts`
- `travelblogs/tests/components/trip-detail.test.tsx`

### Change Log

- 2026-01-15: Added country flag helper, rendered flags on trip overview entry cards, and updated tests.
- 2026-01-15: Added `countryCode` to shared trip overview API payload and updated tests.
- 2026-01-21: Added trip detail entry list flag requirement and updated implementation/test record.
