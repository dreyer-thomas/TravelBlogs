# Story 9.7: Update Gallery Insert to Use Custom Image Nodes

Status: review
Epic: 9 - Rich Text Editor for Blog Entries

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want to insert gallery photos into the rich text editor as EntryImage nodes,
so that inline images stay linked to the entry media library and render reliably.

## Acceptance Criteria

1. **Given** I am editing entry text in the rich text editor  
   **When** I click "Insert inline" on a gallery image  
   **Then** a Tiptap `entryImage` node with `entryMediaId` is inserted at the cursor position
2. **Given** an image node is inserted  
   **When** the editor renders  
   **Then** the image displays inline within the formatted text
3. **Given** I save the entry  
   **When** the form submits  
   **Then** the stored Tiptap JSON contains `entryImage` nodes with `entryMediaId` references
4. **Given** the gallery insert button is clicked  
   **When** the image is inserted  
   **Then** focus remains in the editor and I can continue typing

## Tasks / Subtasks

- [x] Task 1: Enable inline insertion in create and edit forms (AC: 1, 2, 4)
  - [x] Update `TiptapEditor` to expose the editor instance (forwardRef or `onEditorReady`)
  - [x] Store editor reference in `create-entry-form.tsx` and `edit-entry-form.tsx`
  - [x] Use `insertEntryImage(editor, entryMediaId, src, alt)` from `src/utils/tiptap-image-helpers.ts`
  - [x] Keep editor focus after insertion
- [x] Task 2: Map gallery URL to `entryMediaId` (AC: 1, 3)
  - [x] Edit flow: pass media IDs into `EditEntryForm` so URL → ID lookup is available
  - [x] Create flow: define how `entryMediaId` is resolved (see Dev Notes)
  - [x] Ensure JSON persisted from the form includes `entryMediaId` on each image node
- [x] Task 3: UI/UX cleanup (AC: 1, 4)
  - [x] Re-enable the "Insert inline" button (remove disabled state and placeholder tooltip)
  - [x] Keep existing hover/selection styling unchanged
- [x] Task 4: Tests (AC: 1, 2, 3, 4)
  - [x] Add tests for inline insertion in create/edit forms
  - [x] Verify JSON output includes `entryImage` nodes with `entryMediaId`

## Dev Notes

- **Existing helper**: `src/utils/tiptap-image-helpers.ts` exposes `insertEntryImage()` and extraction helpers.
- **Forms**: `src/components/entries/create-entry-form.tsx`, `src/components/entries/edit-entry-form.tsx`.
- **Editor**: `src/components/entries/tiptap-editor.tsx` currently does not expose the editor instance.
- **Media IDs**:
  - **Edit flow**: entry media IDs are available from Prisma; pass them into `EditEntryForm` and map URL → ID.
  - **Create flow**: media IDs do not exist until entry creation. Decide on one of:
    1) Post-create patch to replace `entryImage` nodes with real `entryMediaId` values using the response media list, or
    2) Extend create API to accept client-generated media IDs (requires schema/API change).
- **API constraints**: responses must be `{ data, error }` and errors use `{ error: { code, message } }`.
- **i18n**: any user-facing strings must be present in both English and German.

### Project Structure Notes

- `src/components/entries/` for form updates; `src/components/entries/tiptap-editor.tsx` for editor ref exposure.
- `src/utils/tiptap-image-helpers.ts` already contains insertion helpers; reuse.
- Keep file naming in `kebab-case.tsx` and components in `PascalCase`.

### References

- [Source: _bmad-output/implementation-artifacts/epics.md#Story 9.7]
- [Source: travelblogs/src/utils/tiptap-image-helpers.ts]
- [Source: travelblogs/src/components/entries/tiptap-editor.tsx]
- [Source: travelblogs/src/components/entries/create-entry-form.tsx]
- [Source: travelblogs/src/components/entries/edit-entry-form.tsx]
- [Source: travelblogs/src/app/api/entries/route.ts]
- [Source: travelblogs/src/app/api/entries/[id]/route.ts]

## Developer Context

- Inline insert is currently disabled in `edit-entry-form.tsx` and absent in `create-entry-form.tsx`; there is no editor instance exposed to the forms.
- The custom Tiptap node is `entryImage` with attributes `entryMediaId`, `src`, and `alt`; helpers exist to insert nodes and extract IDs.
- Entry media IDs only exist after entry creation; edit flow can use existing IDs, create flow must reconcile IDs after create.
- API validation still uses legacy markdown inline parsing; do not remove `mediaUrls` validation or entry media creation.

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

 - Tests: `npm test -- tests/components/tiptap-editor.test.tsx`
 - Tests: `npm test -- tests/components/create-entry-form.test.tsx tests/components/edit-entry-form.test.tsx`
 - Tests: `npm test`
### Completion Notes List

- Exposed Tiptap editor instance and wired inline insert controls in create/edit forms.
- Mapped gallery URLs to `entryMediaId` with post-save reconciliation for create/edit flows.
- Added inline insert + JSON persistence tests for create/edit forms.
- **Code Review Fixes Applied:**
  - Fixed replaceEntryImageIds mutation issue - now uses immutable updates
  - Added validation to handleInsertInlineImage to prevent empty URL insertion
  - Edit flow now strictly requires entryMediaId from map (no URL fallback)
  - Enhanced test coverage for AC 3 - verifies entryMediaId in persisted JSON
  - Updated File List to include tiptap-config.ts and Story 9.6 dependencies

### File List

- travelblogs/src/components/entries/tiptap-editor.tsx
- travelblogs/src/components/entries/create-entry-form.tsx
- travelblogs/src/components/entries/edit-entry-form.tsx
- travelblogs/src/app/trips/[tripId]/entries/[entryId]/edit/page.tsx
- travelblogs/src/utils/tiptap-config.ts
- travelblogs/tests/components/tiptap-editor.test.tsx
- travelblogs/tests/components/create-entry-form.test.tsx
- travelblogs/tests/components/edit-entry-form.test.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/9-7-update-gallery-insert-to-use-custom-image-nodes.md

**Dependencies from Story 9.6:**
- travelblogs/src/utils/tiptap-entry-image-extension.ts
- travelblogs/src/utils/tiptap-image-helpers.ts
- travelblogs/tests/utils/tiptap-entry-image-extension.test.ts
- travelblogs/tests/utils/tiptap-image-helpers.test.ts
- travelblogs/tests/components/tiptap-editor-image-node.test.tsx

## Story Status

**Current Status**: done
**Created**: 2026-01-17T15:35:56Z
**Code Reviewed**: 2026-01-17T19:22:00Z
**Dependencies**: 9.6 (custom image node), 9.3-9.5 (editor integration)
**Blocks**: 9.8, 9.9, 9.11, 9.13
