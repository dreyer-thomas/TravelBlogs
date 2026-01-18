# Story 9.8: Update Entry Viewer to Render Tiptap JSON

Status: done
Epic: 9 - Rich Text Editor for Blog Entries

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want entry text with rich formatting and inline media to render correctly,
so that I can read formatted stories without editing them.

## Acceptance Criteria

1. **Given** I open an entry view with Tiptap JSON content  
   **When** the entry loads  
   **Then** the formatted content renders with all formatting preserved (bold, italic, headings, lists, links, alignment)
2. **Given** the entry contains image nodes with `entryMediaId`  
   **When** the entry renders  
   **Then** inline images are fetched from EntryMedia and displayed within the text
3. **Given** I open an entry view with plain text content  
   **When** the entry loads  
   **Then** the plain text is converted to basic rich format for display without saving the conversion
4. **Given** the entry viewer renders rich content  
   **When** I view the page  
   **Then** no editor toolbar is displayed (read-only view)
5. **Given** I open an entry with media and navigation  
   **When** the entry viewer renders  
   **Then** hero media, gallery, full-screen viewer, and navigation behave as before (no regressions)

## Tasks / Subtasks

- [x] Task 1: Detect entry format and prepare display content (AC: 1, 3)
  - [x] Use `detectEntryFormat` to branch between Tiptap JSON and plain text
  - [x] For plain text, convert to Tiptap JSON for display only (no persistence)
- [x] Task 2: Render rich content in the entry reader (AC: 1, 4)
  - [x] Implement a read-only Tiptap renderer using `@tiptap/react` with `editable: false`
  - [x] Use the same extensions from `getTiptapExtensions` plus a viewer-specific `entryImage` node view
  - [x] Ensure typography and spacing match existing entry reader styles
- [x] Task 3: Render inline images from `entryImage` nodes (AC: 2)
  - [x] Resolve `entryMediaId` against entry media list; fall back to node `src` if needed
  - [x] Render with `next/image`, keep lazy loading, and wire to existing viewer click behavior
- [x] Task 4: Tests (AC: 1, 2, 3, 4, 5)
  - [x] Add/update entry reader tests for Tiptap JSON rendering
  - [x] Add/update entry reader tests for plain text fallback conversion
  - [x] Add/update tests for entryImage node rendering by `entryMediaId`
  - [x] Add/update tests to ensure hero/gallery/viewer/nav behavior is unchanged

## Dev Notes

### Developer Context

- `EntryReader` currently parses `entry.body` with `parseEntryContent`, which only supports plain text + markdown-style inline images.
- `mapEntryToReader` maps `entry.text` directly into `EntryReaderData.body`; once Tiptap JSON is stored, this will be a JSON string.
- This story must introduce a read-only renderer for Tiptap JSON while preserving the existing viewer behaviors (inline image click -> full-screen viewer, slideshow, hero media).
- Plain text entries must render as basic rich text without saving any conversion; use `plainTextToTiptapJson` for display-only conversion.

### Technical Requirements

- Use a read-only Tiptap renderer (no toolbar, `editable: false`) to render Tiptap JSON with headings, lists, links, alignment, bold/italic/underline.
- Implement a viewer-specific `entryImage` node view that renders inline images with `next/image` and supports click-to-open viewer.
- Keep all existing hero, gallery, and navigation behaviors intact; only swap body rendering logic.
- For plain text entries, convert to Tiptap JSON for display only; do not persist or mutate the stored text.
- Resolve `entryImage` nodes by `entryMediaId` against `entry.media`; fallback to node `src` if needed and always provide an accessible `alt`.

### Architecture Compliance

- App Router only; do not create new API routes or pages.
- Keep utilities in `src/utils/` (no new `lib/`).
- Maintain existing error/response shapes if any API changes are introduced (avoid API changes in this story).

### Library / Framework Requirements

- Use existing dependencies only (`@tiptap/react`, `@tiptap/core`, `@tiptap/starter-kit`).
- Reuse `getTiptapExtensions` from `travelblogs/src/utils/tiptap-config.ts`.
- Reuse the `entryImage` node name and attributes (`entryMediaId`, `src`, `alt`) from `travelblogs/src/utils/tiptap-entry-image-extension.ts`.

### File Structure Requirements

- Keep `EntryReader` in `travelblogs/src/components/entries/entry-reader.tsx`.
- If a new viewer component is needed, place it in `travelblogs/src/components/entries/` using `kebab-case.tsx` naming.
- Any new renderer/helper utilities must live in `travelblogs/src/utils/`.

### Testing Requirements

- Add tests under `travelblogs/tests/components/` (no co-located tests).
- Cover: Tiptap JSON rendering, plain text conversion display, inline `entryImage` rendering + click behavior.
- Continue using `@testing-library/react` + `vitest`.

### Previous Story Intelligence

- Story 9.6/9.7 established the custom `entryImage` node and `tiptap-image-helpers`; do not rename the node or change its attributes.
- Inline image insertion already stores `entryMediaId` and `src`; the viewer must respect these fields.

### Git Intelligence Summary

- Recent work modified `tiptap-editor.tsx`, `tiptap-config.ts`, and image helper utilities; follow the established style and patterns in those files.

### Project Context Reference

- Use `next/image` for media and lazy-load by default.
- All user-facing strings must be available in English and German (use `useTranslation`).
- Follow naming conventions (`camelCase` vars, `PascalCase` components, `kebab-case.tsx` files).

### Project Structure Notes

- `EntryReader` lives in `travelblogs/src/components/entries/entry-reader.tsx`.
- Entry reader data mapping is in `travelblogs/src/utils/entry-reader.ts`.
- Plain text parsing helpers live in `travelblogs/src/utils/entry-content.ts`.
- Rich text utilities live in `travelblogs/src/utils/entry-format.ts` and `travelblogs/src/utils/tiptap-*`.
- Tests for entry reader are in `travelblogs/tests/components/entry-reader.test.tsx` and `travelblogs/tests/components/entries/entry-reader-navigation.test.tsx`.

### References

- [Source: _bmad-output/implementation-artifacts/epics.md#Story 9.8]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: _bmad-output/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: travelblogs/src/components/entries/entry-reader.tsx]
- [Source: travelblogs/src/utils/entry-reader.ts]
- [Source: travelblogs/src/utils/entry-content.ts]
- [Source: travelblogs/src/utils/entry-format.ts]
- [Source: travelblogs/src/utils/tiptap-config.ts]
- [Source: travelblogs/src/utils/tiptap-entry-image-extension.ts]

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

- Tests (fail): `npm test`
- Tests (pass): `npm test`

### Implementation Plan

- Convert entry body to Tiptap JSON using `detectEntryFormat` and `plainTextToTiptapJson`.
- Render read-only content via a dedicated Tiptap viewer with an `entryImage` node view.
- Resolve inline image nodes against entry media and preserve existing viewer behaviors.

### Completion Notes List

- Added a read-only Tiptap renderer for entry body content with custom `entryImage` node view.
- Converted plain text to Tiptap JSON for display, preserving inline image markdown.
- Resolved inline images via `entryMediaId` with fallback to node `src`.
- Updated entry reader tests and entry format tests; full suite passing.
- Code review fixes applied: Added proper TiptapNode type in entry-reader.tsx (replaced `any`), updated File List with validation report.

### File List

- _bmad-output/implementation-artifacts/9-8-update-entry-viewer-to-render-tiptap-json.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/validation-report-20260118T071543Z.md
- travelblogs/src/components/entries/entry-reader.tsx
- travelblogs/src/components/entries/entry-reader-rich-text.tsx
- travelblogs/src/utils/entry-format.ts
- travelblogs/src/utils/tiptap-image-helpers.ts
- travelblogs/tests/components/entry-reader.test.tsx
- travelblogs/tests/utils/entry-format.test.ts
