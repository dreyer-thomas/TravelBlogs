# Story 9.9: Implement Plain Text to Tiptap Converter

Status: done
Epic: 9 - Rich Text Editor for Blog Entries

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want to build a converter that transforms plain text to Tiptap JSON,
so that existing entries can be rendered and migrated to rich format.

## Acceptance Criteria

1. **Given** a plain text entry contains line breaks and paragraphs  
   **When** I convert it to Tiptap JSON  
   **Then** paragraphs are preserved as separate paragraph nodes
2. **Given** a plain text entry contains inline image references `![Image](url)`  
   **When** I convert it to Tiptap JSON  
   **Then** the converter looks up the URL in EntryMedia, finds the entryMediaId, and creates image nodes with entryMediaId references
3. **Given** a plain text entry contains inline image references that don't match any EntryMedia record  
   **When** I convert it to Tiptap JSON  
   **Then** the converter skips or converts them to plain text to avoid broken references
4. **Given** the converter is implemented  
   **When** I test with various plain text entries  
   **Then** the output is valid Tiptap JSON that renders correctly in the viewer

## Tasks / Subtasks

- [x] Task 1: Update converter to resolve inline images to EntryMedia (AC: 2, 3)
  - [x] Extend `plainTextToTiptapJson` to accept a URL-to-entryMediaId map or media list
  - [x] For each inline image block, match by URL and set `entryMediaId` when found
  - [x] If no match, omit the image node or convert it to plain text (define a consistent fallback)
- [x] Task 2: Preserve paragraph structure and mixed content (AC: 1, 4)
  - [x] Keep double-newline paragraph splitting behavior for text blocks
  - [x] Ensure interleaved text and image blocks remain in correct order
- [x] Task 3: Update call sites to pass media context (AC: 2, 4)
  - [x] In `entry-reader.tsx`, pass `entry.media` or a url->id map when converting for display
  - [x] In `edit-entry-form.tsx`, pass `initialMedia` or derived map when converting on edit
- [x] Task 4: Tests (AC: 1, 2, 3, 4)
  - [x] Update `tests/utils/entry-format.test.ts` to assert entryMediaId mapping for matched URLs
  - [x] Add test for unmatched inline image handling (skipped or text fallback)

## Dev Notes

### Developer Context

- `plainTextToTiptapJson` currently uses `parseEntryContent` and always sets `entryMediaId: null` for inline images.
- `parseEntryContent` detects markdown inline images via `![alt](url)` and preserves surrounding text blocks.
- The conversion is used in two places:
  - `EntryReader` (view only): converts plain text to Tiptap JSON for display.
  - `EditEntryForm` (edit): converts plain text to Tiptap JSON before saving (per story 9.5/9.10).
- Entry media objects include `{ id, url, alt }` in view/edit flows; re-use this to resolve `entryMediaId`.

### Technical Requirements

- Use the existing `entryImage` node shape and attributes (`entryMediaId`, `src`, `alt`) established in story 9.6.
- Preserve ordering between text paragraphs and inline images as produced by `parseEntryContent`.
- When an inline image URL is not found in EntryMedia, either:
  - drop the image node entirely, or
  - convert it into plain text to avoid broken references.
  Pick one behavior and apply it consistently.

### Architecture Compliance

- App Router only; no new API routes.
- Keep utilities in `src/utils/` (no new `lib/`).
- Maintain naming conventions and response formats if any API changes are introduced (avoid API changes in this story).

### Library / Framework Requirements

- Use existing dependencies only (no new libraries).
- Keep JSON format compatible with `@tiptap/core` document structure.

### File Structure Requirements

- Update converter in `travelblogs/src/utils/entry-format.ts`.
- Update call sites in `travelblogs/src/components/entries/entry-reader.tsx` and `travelblogs/src/components/entries/edit-entry-form.tsx`.
- Tests live in `travelblogs/tests/utils/entry-format.test.ts`.

### Testing Requirements

- Tests must live in `travelblogs/tests/` (no co-located tests).
- Cover:
  - paragraph splitting and ordering
  - inline image conversion with entryMediaId
  - unmatched inline image handling

### Previous Story Intelligence

- Story 9.8 added a read-only Tiptap renderer and expects `entryImage` nodes with `entryMediaId` to resolve inline images.
- Story 9.6/9.7 established the custom `entryImage` node and helper utilities; do not rename the node or change attributes.

### Git Intelligence Summary

- Recent commits touched `entry-format.ts`, `entry-reader.tsx`, and Tiptap image helpers. Follow existing patterns and naming.

### Project Context Reference

- Use `next/image` for media in UI (viewer already does this).
- Follow naming rules (`camelCase`, `PascalCase`, `kebab-case.tsx`).
- Tests live in central `tests/`.
- All user-facing strings must be available in English and German.

### Story Completion Status

- Status set to `ready-for-dev`.
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

### References

- [Source: _bmad-output/implementation-artifacts/epics.md#Story 9.9]
- [Source: _bmad-output/implementation-artifacts/9-8-update-entry-viewer-to-render-tiptap-json.md]
- [Source: _bmad-output/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: travelblogs/src/utils/entry-format.ts]
- [Source: travelblogs/src/utils/entry-content.ts]
- [Source: travelblogs/src/components/entries/entry-reader.tsx]
- [Source: travelblogs/src/components/entries/edit-entry-form.tsx]

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

- `npm test`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added EntryMedia URL mapping and fallback handling in plain text conversion.
- Wired EntryMedia maps into entry reader and edit form conversion.
- Updated entry format tests and entry reader inline image assertions.
- Code review fixes applied: Enhanced JSDoc documentation for entryMedia parameter behaviors, added test coverage for EntryMediaItem[] array format (26 tests now passing).

### File List

- _bmad-output/implementation-artifacts/9-9-implement-plain-text-to-tiptap-converter.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- travelblogs/src/components/entries/edit-entry-form.tsx
- travelblogs/src/components/entries/entry-reader.tsx
- travelblogs/src/utils/entry-format.ts
- travelblogs/tests/components/entry-reader.test.tsx
- travelblogs/tests/utils/entry-format.test.ts
