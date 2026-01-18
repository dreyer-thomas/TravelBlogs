# Story 9.10: Add Lazy Migration Logic (Convert on Edit)

Status: done
Epic: 9 - Rich Text Editor for Blog Entries

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want plain text entries to be converted to Tiptap JSON only when edited,
so that migration happens gradually without risk to existing data.

## Acceptance Criteria

1. **Given** a plain text entry is opened for viewing  
   **When** the entry loads  
   **Then** the plain text is converted to Tiptap JSON for display only and NOT saved to the database
2. **Given** a plain text entry is opened for editing  
   **When** the edit form loads  
   **Then** the plain text is converted to Tiptap JSON and loaded into the editor
3. **Given** I save the edited entry  
   **When** the form submits  
   **Then** the Tiptap JSON is permanently saved to the database replacing the plain text
4. **Given** an entry has already been converted to Tiptap JSON  
   **When** I open it for viewing or editing  
   **Then** it loads directly from the stored JSON without re-conversion

## Tasks / Subtasks

- [x] Task 1: Ensure view conversion is display-only (AC: 1, 4)
  - [x] Verify `EntryReader` uses `detectEntryFormat` and only converts plain text for rendering
  - [x] Confirm no persistence occurs in view-only paths
- [x] Task 2: Convert on edit and persist JSON (AC: 2, 3, 4)
  - [x] In edit flow, convert plain text to Tiptap JSON before rendering editor
  - [x] Ensure submit payload writes JSON when source was plain text
  - [x] Skip conversion when `detectEntryFormat` reports Tiptap JSON
- [x] Task 3: Tests (AC: 1, 2, 3, 4)
  - [x] Add/update `tests/components/entry-reader.test.tsx` to assert view-only conversion (no save)
  - [x] Add/update `tests/components/edit-entry-form.test.tsx` to assert conversion on edit and JSON payload
  - [x] Add/update `tests/utils/entry-format.test.ts` to cover format detection paths used by view/edit

## Dev Notes

### Developer Context

- Format detection and conversion live in `travelblogs/src/utils/entry-format.ts` (`detectEntryFormat`, `plainTextToTiptapJson`).
- View flow uses `travelblogs/src/components/entries/entry-reader.tsx` to render entry body; conversion must be display-only.
- Edit flow uses `travelblogs/src/components/entries/edit-entry-form.tsx`; conversion should happen at load for plain text and be saved on submit.
- The entry text field stores either plain text or Tiptap JSON string; do not introduce new schema fields.

### Technical Requirements

- Keep conversion behavior tied to `detectEntryFormat` so JSON entries are not re-converted.
- Preserve existing rich-text features and `entryImage` node behavior (entryMediaId mapping).
- Do not modify API response shapes or add routes.

### Architecture Compliance

- App Router only; no new API routes.
- Keep utilities in `src/utils/` (no new `lib/`).
- Maintain naming conventions and response formats.

### Library / Framework Requirements

- Use existing dependencies only.
- Tiptap JSON must remain compatible with `@tiptap/core` document structure.

### File Structure Requirements

- `travelblogs/src/components/entries/entry-reader.tsx`
- `travelblogs/src/components/entries/edit-entry-form.tsx`
- `travelblogs/src/utils/entry-format.ts`
- Tests in `travelblogs/tests/components/` and `travelblogs/tests/utils/`

### Testing Requirements

- Tests live in central `tests/` only.
- Cover view-only conversion vs edit conversion + persistence paths.

### Previous Story Intelligence

- Story 9.8 added read-only Tiptap rendering in `EntryReader`.
- Story 9.9 updated `plainTextToTiptapJson` to map inline images by EntryMedia URL.
- Do not rename `entryImage` node or change its attributes.

### Git Intelligence Summary

- Recent work updated `entry-reader.tsx`, `edit-entry-form.tsx`, and `entry-format.ts`.
- Keep patterns consistent with Story 9.8–9.9 changes.

### Project Context Reference

- Use `next/image` for media and lazy-load by default.
- All user-facing strings must be in English and German.
- Tests must be in `tests/` and not co-located.

### References

- [Source: _bmad-output/implementation-artifacts/epics.md#Story 9.10]
- [Source: _bmad-output/implementation-artifacts/9-9-implement-plain-text-to-tiptap-converter.md]
- [Source: _bmad-output/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: travelblogs/src/components/entries/entry-reader.tsx]
- [Source: travelblogs/src/components/entries/edit-entry-form.tsx]
- [Source: travelblogs/src/utils/entry-format.ts]

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

- 2026-01-18: Tests: `npm test -- entry-reader.test.tsx edit-entry-form.test.tsx entry-format.test.ts`
- 2026-01-18: Tests: `npm test`

### Completion Notes List

- **Implementation Note:** The lazy migration implementation was completed in Stories 9.8 and 9.9. This story added comprehensive test coverage to validate the existing behavior.
- Added test coverage for view-only conversion (AC1): Verified `EntryReader` uses `detectEntryFormat` and `plainTextToTiptapJson` for display-only rendering without persistence.
- Added test coverage for edit conversion (AC2-3): Verified `EditEntryForm` converts plain text to Tiptap JSON on load and persists JSON payloads on save.
- Added test coverage for format detection (AC4): Verified both view and edit flows skip re-conversion when entry is already Tiptap JSON.
- Added comprehensive format detection edge case tests in `entry-format.test.ts` covering plain text, valid Tiptap JSON, invalid JSON, and edge cases.

### File List
- _bmad-output/implementation-artifacts/9-10-add-lazy-migration-logic-convert-on-edit.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- travelblogs/src/components/entries/edit-entry-form.tsx (code comment enhancement)
- travelblogs/tests/components/entry-reader.test.tsx
- travelblogs/tests/components/edit-entry-form.test.tsx
- travelblogs/tests/utils/entry-format.test.ts

### Change Log
- 2026-01-18: Validated lazy migration behavior with focused view/edit conversion tests and format detection coverage.
- 2026-01-18: Code review fixes - Enhanced test coverage for AC1 persistence verification, added AC references to test names, improved code comments, updated completion notes for accuracy.
