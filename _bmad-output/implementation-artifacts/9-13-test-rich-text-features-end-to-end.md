# Story 9.13: Test Rich Text Features End-to-End

Status: review
Epic: 9 - Rich Text Editor for Blog Entries

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a QA tester,
I want to verify that all rich text features work correctly across create, edit, and view flows,
so that the rich text editor is production-ready.

## Acceptance Criteria

1. **Given** I create a new entry with rich formatting
   **When** I use bold, italic, headings, lists, links, and alignment
   **Then** all formatting is saved and displayed correctly in the entry viewer
2. **Given** I insert gallery images into rich text
   **When** I save and view the entry
   **Then** inline images appear correctly within the formatted text
3. **Given** I edit a plain text entry
   **When** I add rich formatting and save
   **Then** the entry is permanently converted to Tiptap JSON and displays correctly
4. **Given** I delete a gallery image used in entry text
   **When** I view the entry
   **Then** the image is removed from the text without breaking the entry
5. **Given** I view an old plain text entry without editing
   **When** the entry loads
   **Then** it displays as formatted text without permanent conversion
6. **Given** I test on different browsers (Chrome, Safari, Firefox, Edge)
   **When** I use the rich text editor
   **Then** all features work consistently across browsers

## Tasks / Subtasks

- [x] Define end-to-end test plan for rich text flows (AC: 1-6)
  - [x] Identify core flows and data fixtures (new entry, edit legacy entry, view legacy entry)
  - [x] Capture expected rendering and serialization behaviors (JSON vs view-only conversion)
- [x] Add integration/component tests for create/edit/view flows (AC: 1, 3, 5)
  - [x] Create entry with formatted content and assert persisted Tiptap JSON
  - [x] Edit legacy plain text entry and assert conversion on save only
  - [x] View legacy plain text entry and assert view-only conversion (no persistence)
- [x] Add tests for inline gallery image behavior (AC: 2, 4)
  - [x] Insert gallery image into rich text and verify entryMediaId-backed rendering
  - [x] Delete gallery image and verify inline nodes are removed from rendered text
- [x] Add cross-browser QA checklist + manual verification notes (AC: 6)
  - [x] Provide steps to verify formatting, image rendering, and links in Chrome/Safari/Firefox/Edge
  - [x] Capture any known limitations or workarounds
  - Note: AC 6 requires manual QA testing across browsers; automated cross-browser E2E testing not in scope for this story

## Dev Notes

### Developer Context

- Rich text flows rely on `detectEntryFormat` and `plainTextToTiptapJson`; avoid duplicating format detection.
- View flow converts plain text to Tiptap JSON for display only; edit flow converts and persists JSON.
- Inline images use custom `entryImage` nodes tied to `entryMediaId` and must remain linked to gallery data.

### Technical Requirements

- Tests must assert `{ data, error }` response shape for any API interactions.
- Verify no regression in view-only conversion: plain text entries must not be persisted as JSON on view.
- Ensure gallery deletion removes inline image nodes without breaking text rendering.
- Avoid adding new dependencies or test runners without approval.

### Architecture Compliance

- App Router only; REST routes live under `travelblogs/src/app/api` with plural endpoints.
- Keep JSON and API params in `camelCase` and avoid `snake_case`.
- All user-facing UI strings must be translated and available in English and German.

### Library / Framework Requirements

- Use existing Tiptap/React/Next.js versions already pinned in `travelblogs/package.json`.
- Use existing testing stack (Vitest + Testing Library) unless explicitly approved.

### File Structure Requirements

- Likely touch points:
  - `travelblogs/tests/components/` (editor and viewer flow coverage)
  - `travelblogs/tests/api/entries/` (persistence and response shape checks)
  - `travelblogs/tests/fixtures/` (entry + media fixtures)
  - `travelblogs/src/utils/entry-format.ts`
  - `travelblogs/src/utils/tiptap-image-helpers.ts`
  - `travelblogs/src/components/entries/entry-reader.tsx`
  - `travelblogs/src/components/entries/entry-reader-rich-text.tsx`
  - `travelblogs/src/components/entries/edit-entry-form.tsx`

### Testing Requirements

- Tests live in central `tests/` (no co-located tests).
- Add coverage for formatting persistence, view-only conversion, and inline image deletion.
- Include a manual browser QA checklist for Chrome/Safari/Firefox/Edge.

### Previous Story Intelligence

- Story 9.10: Lazy migration converts plain text to JSON on edit only.
- Story 9.11: Gallery delete removes `entryImage` nodes and plain text inline references.
- Story 9.12: `detectEntryFormat` is the single source of truth for format detection.

### Git Intelligence Summary

- Recent commits touched `entry-reader.tsx`, `entry-reader-rich-text.tsx`, `edit-entry-form.tsx`, and `entry-format.ts` for rich text flow.
- Utilities for Tiptap formatting and image helpers live in `travelblogs/src/utils/entry-format.ts` and `travelblogs/src/utils/tiptap-image-helpers.ts`.

### Latest Tech Information

- No external research performed; adhere to pinned versions and existing patterns.

### Project Context Reference

- App Router only; API routes under `src/app/api`.
- Responses must be wrapped as `{ data, error }` with `{ error: { code, message } }`.
- Tests must live in `tests/` (not co-located).
- All UI strings must be translated (English and German).

### References

- [Source: _bmad-output/implementation-artifacts/epics.md#Story 9.13]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: _bmad-output/implementation-artifacts/9-12-add-format-detection-and-migration-status.md]
- [Source: travelblogs/src/utils/entry-format.ts]
- [Source: travelblogs/src/utils/tiptap-image-helpers.ts]
- [Source: travelblogs/src/components/entries/entry-reader.tsx]
- [Source: travelblogs/src/components/entries/entry-reader-rich-text.tsx]
- [Source: travelblogs/src/components/entries/edit-entry-form.tsx]

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

- 2026-01-18: `npm test`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added rich text end-to-end plan with serialization expectations and cross-browser QA checklist.
- Added API/component test coverage for rich text persistence and rendering.
- Code review fixes: Added AC 5 integration test (view-only no-persist verification), improved test assertions with proper JSON validation, added negative test for invalid JSON handling, clarified AC 6 as manual QA.
- Tests: `npm test` - 602 tests passing

### File List

- _bmad-output/implementation-artifacts/9-13-test-rich-text-features-end-to-end.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/validation-report-20260118T115818Z.md
- travelblogs/tests/api/entries/create-entry.test.ts
- travelblogs/tests/api/entries/get-entry.test.ts
- travelblogs/tests/components/create-entry-form.test.tsx
- travelblogs/tests/components/edit-entry-form.test.tsx
- travelblogs/tests/components/entry-reader.test.tsx
- travelblogs/tests/e2e/rich-text-e2e-plan.md
- travelblogs/tests/e2e/rich-text-plan-documentation.test.ts

## Change Log

- 2026-01-18: Added rich text test plan/QA checklist and rich text persistence/rendering tests.
- 2026-01-18 (Code Review): Fixed status mismatch, added AC 5 integration test, improved test assertions, added negative test for invalid JSON, clarified AC 6 manual QA scope, renamed misleading test file.

## Story Completion Status

Status set to: review
Completion note: Added rich text test plan and verification coverage; full test suite passing.
