# Story 11.3: Display Flags on Entry Detail Pages

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want to see the country flag on entry detail pages,
so that I know which country the entry is from while reading.

## Acceptance Criteria

### AC 1: Flag Display Below Entry Title
**Given** I am viewing an entry detail page
**When** the page loads
**Then** I see the country flag emoji displayed below or next to the entry title

### AC 2: Flag Display on Shared Entry Pages
**Given** I am viewing a shared entry page
**When** the page loads
**Then** I see the country flag emoji (same as authenticated view)

### AC 3: No Flag if Country Unknown
**Given** an entry has no country code
**When** the entry detail page loads
**Then** no flag is shown (graceful degradation)

## Tasks / Subtasks

- [x] Render country flag on authenticated entry detail (AC: 1, 3)
  - [x] Update `travelblogs/src/components/entries/entry-detail.tsx` title area to render the flag next to or below the entry title
  - [x] Use `countryCodeToFlag(entry.location?.countryCode)` and render nothing when it returns null
  - [x] Avoid new visible copy; mark the emoji as decorative if needed (no new translatable strings)
- [x] Render country flag on shared entry reader (AC: 2, 3)
  - [x] Update `travelblogs/src/components/entries/entry-reader.tsx` title area in both shared and non-shared layouts
  - [x] Reuse `countryCodeToFlag` and the same graceful fallback behavior
- [x] Ensure entry reader data exposes countryCode (AC: 1, 2, 3)
  - [x] Confirm `travelblogs/src/utils/entry-reader.ts` and entry API responses already include `location.countryCode`
  - [x] If missing, extend mapping/response to pass `location.countryCode` through (no schema changes)
- [x] Tests (AC: 1, 2, 3)
  - [x] Add/adjust `travelblogs/tests/components/entry-detail.test.tsx` to assert flag renders when `location.countryCode` exists
  - [x] Add/adjust `travelblogs/tests/components/entry-reader.test.tsx` for shared and non-shared entry readers
  - [x] Add a test case to assert no flag when `countryCode` is missing

## Dev Notes

### Developer Context

This story extends the country flag display from entry cards (Story 11.2) to entry detail pages. The helper `countryCodeToFlag` already exists in `travelblogs/src/utils/country-flag.ts` and must be reused. The entry detail UI is rendered by `EntryDetail` for trip-specific pages and `EntryReader` for generic/shared entry pages. Keep styling consistent with the existing title layout and avoid introducing new user-facing strings.

### Technical Requirements

- Use `countryCodeToFlag(code)` from `travelblogs/src/utils/country-flag.ts`.
- Input comes from `entry.location?.countryCode`.
- If `countryCode` is missing or invalid, render nothing (no placeholder).
- No new dependencies; do not change API error formatting.

### Architecture Compliance

- App Router only; all page code remains under `travelblogs/src/app`.
- Keep file naming and component conventions (PascalCase components, `kebab-case.tsx` files).
- Maintain `{ data, error }` response wrapping if any API updates are required.
- UI strings must be translatable; avoid adding new visible text for the flag.

### Library & Framework Requirements

- Next.js App Router + React + TypeScript.
- No new libraries; use existing utilities and components.

### File Structure Requirements

- Update: `travelblogs/src/components/entries/entry-detail.tsx`
- Update: `travelblogs/src/components/entries/entry-reader.tsx`
- Verify: `travelblogs/src/utils/entry-reader.ts`
- Tests: `travelblogs/tests/components/entry-detail.test.tsx`, `travelblogs/tests/components/entry-reader.test.tsx`

### Testing Requirements

- Entry detail page shows the flag when `location.countryCode` exists.
- Shared entry page shows the same flag behavior.
- No flag renders when `countryCode` is missing or invalid.

### Previous Story Intelligence

- Story 11.2 already implemented `countryCodeToFlag` and established how flags are rendered in entry card title rows.
- Follow the same helper usage, validation rules, and no-copy constraint used on entry cards.

### Git Intelligence Summary

- `2987d26` added country code storage/extraction and API exposure for entries; reuse those fields and avoid new schema changes.
- Recent work focuses on entry reader and media components; keep layout changes minimal to avoid regressions.

### Latest Tech Information

- Web research not performed due to restricted network access. Confirm versions via existing lockfiles if needed.

### Project Context Reference

- Follow `/_bmad-output/project-context.md` rules: camelCase, `kebab-case.tsx`, tests under `tests/`, and no new UI strings without translation.
- Use existing `utils/` for shared helpers (no `lib/`).

### References

- Epic requirements: `/_bmad-output/planning-artifacts/epics.md` (Epic 11, Story 11.3)
- Previous story: `/_bmad-output/implementation-artifacts/11-2-display-flags-on-entry-cards.md`
- Entry detail component: `travelblogs/src/components/entries/entry-detail.tsx`
- Entry reader component: `travelblogs/src/components/entries/entry-reader.tsx`
- Helper: `travelblogs/src/utils/country-flag.ts`
- Project rules: `/_bmad-output/project-context.md`

## Story Completion Status

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

### Implementation Plan

- Compute flags with `countryCodeToFlag` from `entry.location?.countryCode` in entry detail and reader title areas.
- Render the emoji as decorative-only, aligned with existing title layout for shared and non-shared views.
- Extend component tests to verify flag presence and graceful absence.

### Completion Notes List

- Generated ready-for-dev story file for Epic 11, Story 3.
- Linked to existing country flag helper and entry detail components.
- Rendered country flags in entry detail and entry reader title areas for shared and non-shared views.
- Added shared entry API response support for `location.countryCode`.
- Adjusted flag layout to sit on its own line between the date and title in entry detail/reader headers.
- Added localized country names next to flags using `Intl.DisplayNames` (approved).
- Adjusted shared entry reader blog text block border/padding for a stronger left/right border (approved).
- Updated flag/name tests to use `countryCodeToName` and added utility coverage.

### File List

- `_bmad-output/implementation-artifacts/11-3-display-flags-on-entry-detail-pages.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `travelblogs/src/app/api/trips/share/[token]/entries/[entryId]/route.ts`
- `travelblogs/src/app/api/trips/share/[token]/route.ts`
- `travelblogs/src/components/entries/entry-detail.tsx`
- `travelblogs/src/components/entries/entry-reader.tsx`
- `travelblogs/src/components/trips/trip-detail.tsx`
- `travelblogs/src/components/trips/trip-overview.tsx`
- `travelblogs/src/utils/country-flag.ts`
- `travelblogs/tests/api/entries/list-entries.test.ts`
- `travelblogs/tests/api/trips/share-trip-entry.test.ts`
- `travelblogs/tests/api/trips/share-trip-overview.test.ts`
- `travelblogs/tests/components/entry-detail.test.tsx`
- `travelblogs/tests/components/entry-reader.test.tsx`
- `travelblogs/tests/components/trip-detail.test.tsx`
- `travelblogs/tests/components/trip-overview.test.tsx`
- `travelblogs/tests/utils/country-flag.test.ts`

### Change Log

- 2026-01-22: Rendered country flags in entry detail and entry reader titles, added flag rendering tests, and extended shared entry API countryCode payload.
- 2026-01-22: Moved entry detail/shared entry flags to their own line between date and title.
- 2026-01-22: Added localized country names alongside flags in entry detail and shared entry headers.
- 2026-01-22: Normalized spacing between date, flag, and title lines; tightened flag-to-title spacing in entry detail/shared entry views.
- 2026-01-22: Adjusted shared entry reader blog text block border/padding for stronger left/right borders.
- 2026-01-22: Updated tests to assert country names via `countryCodeToName` and added utility coverage.
