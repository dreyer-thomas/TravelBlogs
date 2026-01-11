# Story 7.8: Edit Entry Location Display

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator or contributor,
I want the edit entry form to show the currently selected story location with a clear change action,
so that I can confirm or update the entry location while editing.

## Acceptance Criteria

1. **Given** I open the edit entry page for an entry with a saved location
   **When** the form renders
   **Then** the Story location section shows the current location label
   **And** if the label is missing, it falls back to formatted coordinates
2. **Given** a current location is shown
   **When** I view the Story location section
   **Then** I see a clear "Change location" action that lets me pick a different location
3. **Given** I select a new location from search results
   **When** the selection is saved in the form state
   **Then** the displayed current location updates to the newly selected location
4. **Given** I clear the selected location
   **When** the form renders
   **Then** the Story location section shows no current location badge and is ready for a new search
5. **Given** I open the edit entry page for an entry with no location
   **When** the form renders
   **Then** the Story location section shows an empty state or helper text, but no selected location
6. **Given** any new UI text is displayed
   **When** I view the UI in English or German
   **Then** all new strings are translated in both languages

## Tasks / Subtasks

- [ ] Pass existing entry location data into the edit entry form (AC: 1, 5)
  - [ ] Include `latitude`, `longitude`, and `locationName` from Prisma in the edit page load
  - [ ] Provide `initialLocation` to `EditEntryForm`
- [ ] Update Story location section to display current location consistently (AC: 1, 3, 4, 5)
  - [ ] Use `formatEntryLocationDisplay` for label/coordinate fallback
  - [ ] Keep the selected location badge in sync with form state
- [ ] Add a clear "Change location" action when a location is present (AC: 2)
  - [ ] Action focuses the search input or expands the search UI
- [ ] Add translations for any new UI strings (AC: 6)
- [ ] Tests (AC: 1, 2, 3, 5)
  - [ ] Component test: edit form shows initial location label or coordinates
  - [ ] Component test: change action is visible when location exists
  - [ ] Component test: no selected location badge when initial location is null

## Dev Notes

### Developer Context
- Edit entry page renders `EditEntryForm` and currently omits `initialLocation`. [Source: travelblogs/src/app/trips/[tripId]/entries/[entryId]/edit/page.tsx]
- `EditEntryForm` already accepts `initialLocation` and manages location search state. [Source: travelblogs/src/components/entries/edit-entry-form.tsx]
- Entry location data lives on the `Entry` model: `latitude`, `longitude`, `locationName`. [Source: travelblogs/prisma/schema.prisma]
- Shared location formatting helper exists: `formatEntryLocationDisplay`. [Source: travelblogs/src/utils/entry-location.ts]

### Technical Requirements
- App Router only; keep changes under `src/app` and `src/components`.
- Use `useTranslation` and `getTranslation` for UI strings. [Source: travelblogs/src/utils/i18n.ts]
- Preserve current form validation and submission flow.

### Architecture Compliance
- Components live under `src/components/<feature>/` and follow `PascalCase`.
- Files are `kebab-case.tsx`.
- Tests live in central `tests/` (no co-located tests).

### Library / Framework Requirements
- Use existing form patterns; no new dependencies.

### File Structure Requirements
- Edit page: `travelblogs/src/app/trips/[tripId]/entries/[entryId]/edit/page.tsx`.
- Form UI: `travelblogs/src/components/entries/edit-entry-form.tsx`.
- Location helpers: `travelblogs/src/utils/entry-location.ts`.
- i18n strings: `travelblogs/src/utils/i18n.ts`.
- Tests: `travelblogs/tests/components/edit-entry-form.test.tsx`.

### Testing Requirements
- Add component tests covering initial location rendering and change action.

### Scope Boundaries
- Do not change Prisma schema.
- Do not alter the entry location selection flow beyond the requested UI fix.
- Do not change API payloads unless required to pass location data to the edit page.

### Latest Tech Information
- Web research not performed due to restricted network access; rely on existing patterns.

### References
- Epic source: `_bmad-output/epics.md` (Epic 7)
- UX guidance: `_bmad-output/ux-design-specification.md`
- Architecture rules: `_bmad-output/architecture.md`
- Project rules: `_bmad-output/project-context.md`
- Edit entry page: `travelblogs/src/app/trips/[tripId]/entries/[entryId]/edit/page.tsx`
- Edit entry form: `travelblogs/src/components/entries/edit-entry-form.tsx`
- Location helper: `travelblogs/src/utils/entry-location.ts`
- Entry schema: `travelblogs/prisma/schema.prisma`

## Project Context Reference

- App Router only; API routes live under `src/app/api`.
- Responses must be wrapped `{ data, error }` with `{ error: { code, message } }`.
- Components are `PascalCase`, files are `kebab-case.tsx`.
- Tests live in central `tests/` (no co-located tests).
- All user-facing UI strings must be available in English and German.

## Story Completion Status

- Status: ready-for-dev
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created

### File List

- _bmad-output/implementation-artifacts/7-8-edit-entry-location-display.md
