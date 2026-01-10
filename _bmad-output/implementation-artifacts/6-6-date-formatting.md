# Story 6.6: Date Formatting Consistency

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want all dates displayed in a consistent, locale-aware format,
so that dates are clear and uniform across the app.

## Acceptance Criteria

1. **Given** my language is English
   **When** a date is displayed anywhere in the UI
   **Then** it follows the format "May 16th, 2024" (full month name, ordinal day, comma, year)
2. **Given** my language is German
   **When** a date is displayed anywhere in the UI
   **Then** it follows the format "16. Mai 2024"
3. **Given** any date-only display (trip dates, entry dates, admin created dates, shared views)
   **When** the UI renders
   **Then** all date-only rendering uses the same shared formatting utility
4. **Given** date/time displays still exist
   **When** the UI renders date+time values
   **Then** they remain locale-aware and consistent with existing date-time formatting utilities

## Tasks / Subtasks

- [x] Update shared date formatting utility to support the new English/German formats (AC: 1-2)
  - [x] Implement English ordinal suffix logic (1st, 2nd, 3rd, 4th...; 11th-13th exceptions)
  - [x] Use Intl/DateTimeFormat for locale month names and ordering
- [x] Replace any inline date formatting with the shared utility (AC: 3)
  - [x] Remove local `toLocaleDateString` usage in trip overview and use shared formatter
  - [x] Verify entry/trip/admin views all call the shared formatter
- [x] Update or add tests for date formatting and affected components (AC: 1-4)
  - [x] Utility tests for English ordinals and German formatting
  - [x] Component tests updated for new date strings

## Dev Notes

- A shared i18n utility already exists: `formatDate` in `travelblogs/src/utils/i18n.ts` and is surfaced via `useTranslation`. Update this to enforce the new date format consistently. [Source: travelblogs/src/utils/i18n.ts]
- `TripOverview` currently formats dates locally with `toLocaleDateString`, which diverges from the shared utility and must be replaced. [Source: travelblogs/src/components/trips/trip-overview.tsx]
- Other date displays already use `formatDate` via `useTranslation`, so updating the utility should propagate the new format. [Source: travelblogs/src/components/entries/entry-reader.tsx] [Source: travelblogs/src/components/entries/entry-detail.tsx] [Source: travelblogs/src/components/admin/user-list.tsx]
- UX spec expects consistent date labeling in trip and entry surfaces. [Source: _bmad-output/ux-design-specification.md]

### Technical Requirements

- Date-only display format must be:
  - English: `MMMM D<ordinal>, YYYY` (e.g., "May 16th, 2024")
  - German: `D. MMMM YYYY` (e.g., "16. Mai 2024")
- Implement ordinal suffix logic for English dates with correct 11th-13th handling.
- Use `Intl.DateTimeFormat` or `toLocaleDateString` with explicit options for month/day/year.
- Keep date-time formatting locale-aware and aligned with existing `formatDateTime` usage.

### Architecture Compliance

- Use existing i18n utilities in `travelblogs/src/utils/` (no new libraries).
- Keep App Router conventions intact; avoid new top-level directories. [Source: _bmad-output/project-context.md]

### Library/Framework Requirements

- Use built-in Intl APIs only; do not add new date libraries.
- Preserve the `useTranslation` hook API and existing locale storage behavior. [Source: travelblogs/src/utils/use-translation.ts]

### File Structure Requirements

- Update date formatting logic in `travelblogs/src/utils/i18n.ts`.
- Replace inline formatting in `travelblogs/src/components/trips/trip-overview.tsx`.
- Validate other components continue to use `formatDate` and `formatDateTime` from the shared utilities.
- Tests remain under `travelblogs/tests/` (no co-located tests). [Source: _bmad-output/project-context.md]

### Testing Requirements

- Update `tests/utils/i18n.test.ts` to cover English ordinal and German formats.
- Update component tests that assert date strings (trip overview, entry reader/detail, admin user list).

### Previous Story Intelligence

- Language selection and locale-aware formatting utilities are already implemented (useTranslation, LocaleProvider). Build on these existing patterns. [Source: _bmad-output/implementation-artifacts/6-5-language-selection.md]

### Latest Tech Information

- Web research not performed due to restricted network access; use built-in Intl APIs and pinned project patterns. [Source: _bmad-output/project-context.md]

### Project Context Reference

- All user-facing UI strings must be translatable and provided in both English and German. [Source: _bmad-output/project-context.md]
- Tests must live under `tests/` and follow existing conventions. [Source: _bmad-output/project-context.md]

### Story Completion Status

- Status: done
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created
- Completion note: Date formatting updates implemented; full suite still has unrelated failing tests (see Dev Agent Record)
- Completion note: Review fixes applied (stable date tests, German component coverage, status/file list sync)

### Project Structure Notes

- Components live under `travelblogs/src/components/<feature>/`.
- Utilities live under `travelblogs/src/utils/`.

### References

- Epic and requirements context: `_bmad-output/epics.md`
- UX expectations: `_bmad-output/ux-design-specification.md`
- Architecture and patterns: `_bmad-output/architecture.md`
- Project rules: `_bmad-output/project-context.md`

## Change Log

- 2026-01-10: Updated shared date formatting (EN ordinals, DE long format), aligned trip/admin date rendering, and refreshed related tests.
- 2026-01-10: Code review fixes: stabilized date tests, added German component coverage, synced story status/file list.

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Implementation Plan

- Update `formatDate` to use Intl long month names and English ordinal suffixes, with invalid-date guard.
- Replace inline date formatting in trip overview and admin user list with the shared formatter.
- Update i18n and component tests for the new date strings.

### Debug Log References

- `npm test` (vitest run) fails with existing test setup issues: missing `LocaleProvider` in component tests (create/edit entry forms, delete-entry-modal, full-screen-photo-viewer, media-gallery, sign-in-page) and a cover-image-form expectation mismatch.

### Completion Notes List

- Created story for unified date formatting with EN ordinal and DE long-date formats.
- Identified shared formatter and inline overrides that must be unified.
- Flagged test updates required for the new date strings.
- ✅ Updated `formatDate` to use Intl long month names, English ordinals, and a guard for invalid dates.
- ✅ Replaced trip overview and admin user list date rendering with shared `formatDate`.
- ✅ Updated i18n, trip overview, entry reader/detail, and user list tests for the new date formats.
- ✅ Stabilized date formatting tests against timezone drift and added German trip overview coverage.
- Tests: `npm test -- --run tests/utils/i18n.test.ts tests/components/trip-overview.test.tsx tests/components/entry-reader.test.tsx tests/components/entry-detail.test.tsx tests/components/admin/user-list.test.tsx`
- Tests (full): `npm test` fails due to pre-existing test setup issues noted in Debug Log References.

### File List

- .codex/history.jsonl
- .codex/log/codex-tui.log
- .codex/sessions/2026/01/10/rollout-2026-01-10T17-17-50-019ba8b3-2306-73e3-9539-6edde2a5dfbd.jsonl
- .codex/sessions/2026/01/10/rollout-2026-01-10T17-18-17-019ba8b3-8acf-7cb1-be4d-5aa887d796cf.jsonl
- .codex/sessions/2026/01/10/rollout-2026-01-10T17-26-30-019ba8bb-0fd2-7471-951e-0140d611126b.jsonl
- .codex/sessions/2026/01/10/rollout-2026-01-10T17-38-13-019ba8c5-cb87-74f1-b576-57c93f493b9c.jsonl
- _bmad-output/implementation-artifacts/6-6-date-formatting.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/epics.md
- travelblogs/src/utils/i18n.ts
- travelblogs/src/components/trips/trip-overview.tsx
- travelblogs/src/components/admin/user-list.tsx
- travelblogs/tests/utils/i18n.test.ts
- travelblogs/tests/components/trip-overview.test.tsx
- travelblogs/tests/components/entry-reader.test.tsx
- travelblogs/tests/components/entry-detail.test.tsx
- travelblogs/tests/components/admin/user-list.test.tsx
