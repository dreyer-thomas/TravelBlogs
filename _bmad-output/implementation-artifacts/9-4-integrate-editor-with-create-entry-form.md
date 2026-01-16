# Story 9.4: Integrate Editor with Create Entry Form

**Epic**: 9 - Rich Text Editor for Blog Entries
**Story ID**: 9.4
**Status**: done
**Created**: 2026-01-16

---

## User Story

**As a** creator or contributor
**I want to** use the rich text editor when creating new entries
**So that** I can format my travel stories with headings, lists, bold text, and links

---

## Acceptance Criteria

### AC1: TiptapEditor Replaces Textarea in Create Entry Form
**Given** I am creating a new entry on the create entry page
**When** the form renders
**Then** I see the TiptapEditor component instead of a plain textarea
**And** the editor shows the formatting toolbar with all controls

### AC2: Rich Text Content Saved as Tiptap JSON
**Given** I have written content in the TiptapEditor
**When** I save the entry
**Then** the entry's `text` field is saved as a Tiptap JSON string
**And** the entry can be retrieved and displays correctly

### AC3: Empty Editor Validation
**Given** I have not entered any content in the editor
**When** I attempt to save the entry
**Then** I see a validation error indicating content is required
**And** the entry is not saved

### AC4: Inline Image Insertion Preserved
**Given** I have uploaded images to the entry's image library
**When** I click an image to insert it inline
**Then** the image is inserted at the editor's cursor position (or at the end if no cursor)
**And** the image displays correctly in the editor

### AC5: Cover Image Selection Preserved
**Given** I have uploaded images to the entry's image library
**When** I select an image as cover
**Then** the cover image selection works independently of the editor
**And** the cover image is saved with the entry

---

## Technical Context

### Epic 9 Overview

**Goal**: Replace plain text entry editor with rich text editing capabilities (bold, italic, headings, lists, links, alignment) while maintaining existing image library and gallery workflow.

**This Story's Role**: Integration - Connect the TiptapEditor component (built in Story 9.3) into the create entry form, replacing the plain textarea while preserving all existing functionality.

### Completed Dependencies

**Story 9.1** (done): Tiptap packages installed
- @tiptap/react, @tiptap/pm, @tiptap/starter-kit v3.15.3
- @tiptap/extension-text-align, @tiptap/extension-link, @tiptap/extension-placeholder
- Configuration utility: [travelblogs/src/utils/tiptap-config.ts](../../travelblogs/src/utils/tiptap-config.ts)

**Story 9.2** (done): Format detection utility
- [travelblogs/src/utils/entry-format.ts](../../travelblogs/src/utils/entry-format.ts)
- `detectEntryFormat(text: string): 'plain' | 'tiptap'`

**Story 9.3** (done): TiptapEditor component
- [travelblogs/src/components/entries/tiptap-editor.tsx](../../travelblogs/src/components/entries/tiptap-editor.tsx)
- Props: `initialContent: string`, `onChange: (jsonContent: string) => void`, `placeholder?: string`, `className?: string`
- Full i18n support (EN/DE translations)
- Link dialog with Add/Remove functionality

### Target File: create-entry-form.tsx

**Location**: [travelblogs/src/components/entries/create-entry-form.tsx](../../travelblogs/src/components/entries/create-entry-form.tsx)

**Current Implementation (lines 868-887)**:
```tsx
<label className="block text-sm text-[#2D2A26]">
  {t("entries.entryText")}
  <textarea
    name="text"
    rows={4}
    value={text}
    onChange={(event) => updateText(event.target.value)}
    onBlur={handleTextBlur}
    onSelect={updateCursorSelection}
    onKeyUp={updateCursorSelection}
    onMouseUp={updateCursorSelection}
    onClick={updateCursorSelection}
    ref={textAreaRef}
    className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
    placeholder={t("entries.storyPlaceholder")}
  />
  {errors.text ? (
    <p className="mt-2 text-xs text-[#B34A3C]">{errors.text}</p>
  ) : null}
</label>
```

**Key State Variables (lines 104-120)**:
```tsx
const [text, setText] = useState("");                    // → Will store Tiptap JSON
const textAreaRef = useRef<HTMLTextAreaElement | null>(null);  // → Remove (no longer needed)
const [cursorSelection, setCursorSelection] = useState({...}); // → Needs adaptation for TiptapEditor
```

### Inline Image Insertion Logic

**Current Implementation** (lines 442-468):
```tsx
const handleInsertInlineImage = (url: string) => {
  let nextCursor = cursorSelection.start;

  setText((prev) => {
    const result = insertInlineImageAtCursor(
      prev,
      url,
      cursorSelection.start,
      cursorSelection.end,
    );
    nextCursor = result.cursor;
    return result.text;
  });
  // ... cursor update logic
};
```

**Required Change**: Replace plain text image insertion with Tiptap node insertion.

**Tiptap Image Insertion Pattern**:
```tsx
// Insert image at current cursor position using TiptapEditor
editor.chain().focus().insertContent({
  type: 'image',
  attrs: { src: url, alt: '' }
}).run();
```

**Note**: Story 9.6 will implement the custom image node with `entryMediaId`. For now, use standard HTML-style image insertion or defer this to Story 9.6.

**Temporary Approach for AC4**: Store image URLs as inline references (markdown-style or HTML img tags) until Story 9.6 adds proper Tiptap image node support. Alternative: Skip inline insertion until 9.6 and keep images in gallery only.

---

## Implementation Guidelines

### Step 1: Import TiptapEditor Component

Add to imports section:
```tsx
import TiptapEditor from "./tiptap-editor";
```

### Step 2: Update State Variables

**Remove**:
- `textAreaRef` (no longer needed - TiptapEditor manages its own refs)
- `cursorSelection` state (TiptapEditor handles cursor internally)
- `updateCursorSelection` function

**Keep**:
- `text` state (will now store Tiptap JSON string instead of plain text)
- `updateText` function (will receive JSON string from TiptapEditor's onChange)

### Step 3: Replace Textarea with TiptapEditor

**Replace** (lines 868-887):
```tsx
<label className="block text-sm text-[#2D2A26]">
  {t("entries.entryText")}
  <TiptapEditor
    initialContent=""
    onChange={updateText}
    placeholder={t("entries.storyPlaceholder")}
    className="mt-2"
  />
  {errors.text ? (
    <p className="mt-2 text-xs text-[#B34A3C]">{errors.text}</p>
  ) : null}
</label>
```

### Step 4: Update Validation Logic

**Current** (lines 70-97 in getErrors):
```tsx
if (!text.trim()) {
  nextErrors.text = t("entries.entryTextRequired");
}
```

**Updated** (check for empty Tiptap document):
```tsx
const isEmptyTiptapContent = (content: string): boolean => {
  if (!content || !content.trim()) return true;
  try {
    const parsed = JSON.parse(content);
    // Empty doc has no content or only empty paragraphs
    if (parsed.type === 'doc' && Array.isArray(parsed.content)) {
      if (parsed.content.length === 0) return true;
      // Check if all content is just empty paragraphs
      return parsed.content.every((node: any) =>
        node.type === 'paragraph' &&
        (!node.content || node.content.length === 0 ||
         node.content.every((c: any) => c.type === 'text' && !c.text?.trim()))
      );
    }
    return false;
  } catch {
    return !content.trim();
  }
};

// In getErrors:
if (isEmptyTiptapContent(text)) {
  nextErrors.text = t("entries.entryTextRequired");
}
```

### Step 5: Handle Inline Image Insertion

**Option A (Recommended for this story)**: Defer inline image insertion to Story 9.6

The current inline image logic uses plain text markdown (`![](url)`). TiptapEditor needs a custom image node (Story 9.6) to properly handle images. For now:

1. Keep the image library functional (upload, preview, delete, cover selection)
2. Remove or disable the "Insert" button for gallery images
3. Add comment noting Story 9.6 dependency

**Option B**: Temporary HTML image insertion

If inline insertion is required immediately, use HTML img tags:
```tsx
// Temporary until Story 9.6 custom image node
const handleInsertInlineImage = (url: string) => {
  // Note: This is a temporary solution. Story 9.6 will add proper Tiptap image nodes.
  const imgHtml = `<img src="${url}" alt="" />`;
  // TiptapEditor would need to expose an insertHtml method or ref to editor
  // This approach is NOT recommended - prefer deferring to Story 9.6
};
```

**Decision**: Go with Option A - defer to Story 9.6. Update the inline image UI to indicate images will be in gallery only until rich text images are supported.

### Step 6: Remove Obsolete Code

**Functions to remove**:
- `updateCursorSelection` function (lines 288-297)
- `insertInlineImageAtCursor` import if no longer used
- Any cursor tracking logic tied to textarea

**Refs to remove**:
- `textAreaRef` ref declaration and all references

**State to remove**:
- `cursorSelection` state

---

## Tasks / Subtasks

- [x] **Task 1: Import and Setup** (AC: 1)
  - [x] Add `import TiptapEditor from "./tiptap-editor"` to imports
  - [x] Verify TiptapEditor component is available and exported correctly

- [x] **Task 2: Remove Textarea-Specific Code** (AC: 1)
  - [x] Remove `textAreaRef` ref declaration
  - [x] Remove `cursorSelection` state
  - [x] Remove `updateCursorSelection` function
  - [x] Remove textarea event handlers (onSelect, onKeyUp, onMouseUp, onClick for cursor)

- [x] **Task 3: Replace Textarea with TiptapEditor** (AC: 1, 2)
  - [x] Replace `<textarea>` element with `<TiptapEditor>` component
  - [x] Pass `initialContent=""` for new entries
  - [x] Pass `onChange={updateText}` to receive Tiptap JSON
  - [x] Pass `placeholder={t("entries.storyPlaceholder")}` for i18n
  - [x] Keep error display below the editor

- [x] **Task 4: Update Validation for Tiptap JSON** (AC: 3)
  - [x] Create `isEmptyTiptapContent` helper function
  - [x] Update `getErrors` function to validate Tiptap JSON content
  - [x] Ensure empty documents trigger validation error
  - [x] Ensure documents with only whitespace trigger validation error

- [x] **Task 5: Handle Inline Image Insertion** (AC: 4)
  - [x] Add comment noting Story 9.6 dependency for proper image nodes
  - [x] Temporarily disable inline image insertion button OR
  - [x] Update `handleInsertInlineImage` to append to gallery only (no inline insertion yet)
  - [x] Keep image library upload/delete/cover selection working

- [x] **Task 6: Verify Cover Image Selection** (AC: 5)
  - [x] Ensure cover image selection remains independent of editor
  - [x] Test that cover image is saved correctly with entry

- [x] **Task 7: Write Tests** (AC: 1, 2, 3)
  - [x] Test TiptapEditor renders in create entry form
  - [x] Test content changes update form state
  - [x] Test validation rejects empty editor content
  - [x] Test entry saves with Tiptap JSON format
  - [x] Test image library still works (upload, preview, cover)

- [x] **Task 8: Verify Full Flow** (AC: 1, 2, 3, 5)
  - [x] Test creating entry with formatted text (bold, italic, headings)
  - [x] Test entry saves successfully
  - [x] Test entry displays correctly after save (preview or list)
  - [x] Run full test suite - no regressions

---

## Dev Notes

### Project Structure (from project-context.md)

- **Components**: `src/components/<feature>/` - TiptapEditor is in `entries/`
- **Utils**: `src/utils/` - entry-format.ts, tiptap-config.ts
- **Tests**: Central `tests/` folder, organized by type
- **Naming**: `kebab-case.tsx` files, `PascalCase` components, `camelCase` functions

### Key Files to Modify

1. **Primary**: `travelblogs/src/components/entries/create-entry-form.tsx`
   - Replace textarea with TiptapEditor
   - Update validation logic
   - Remove cursor tracking code

### Files NOT to Modify (Yet)

- `travelblogs/src/components/entries/edit-entry-form.tsx` → Story 9.5
- `travelblogs/src/components/entries/entry-reader.tsx` → Story 9.8
- `travelblogs/prisma/schema.prisma` → No schema changes needed (Story 9.2 confirmed)

### Testing Strategy

**Unit Tests** (Vitest):
- Mock TiptapEditor component for isolation testing
- Test validation helper `isEmptyTiptapContent`
- Test form submission with Tiptap JSON payload

**Integration Tests**:
- Test TiptapEditor integration renders toolbar
- Test content sync between editor and form state

### API Compatibility

The Entry API already accepts any string in the `text` field:
- `POST /api/trips/:tripId/entries` - Create entry
- Request body: `{ title, text, date, tags, coverImageUrl?, latitude?, longitude?, locationName? }`
- The `text` field can contain plain text OR Tiptap JSON (both are valid strings)

**No API changes required** - the current API is format-agnostic.

---

### Project Structure Notes

- **Alignment**: Component in correct location (`src/components/entries/`)
- **Naming**: File uses `kebab-case.tsx`, component uses `PascalCase`
- **Tests**: Will add to `tests/components/` folder
- **i18n**: TiptapEditor already has full i18n support; form translations exist

### References

- [Story 9.1: Install and Configure Tiptap](9-1-install-and-configure-tiptap.md) - Tiptap setup
- [Story 9.2: Update Entry Schema](9-2-update-entry-schema-for-dual-format-support.md) - Format detection
- [Story 9.3: Build Tiptap Editor Component](9-3-build-tiptap-editor-component.md) - Editor component
- [Source: project-context.md](../../_bmad-output/project-context.md) - Project conventions
- [Source: create-entry-form.tsx](../../travelblogs/src/components/entries/create-entry-form.tsx) - Target file

---

## Definition of Done

- [x] TiptapEditor component integrated into create entry form
- [x] Textarea removed, TiptapEditor renders with toolbar
- [x] Content saved as Tiptap JSON string to entry.text field
- [x] Validation prevents saving empty content
- [x] Image library upload/preview/cover selection works
- [x] Inline image insertion noted as Story 9.6 dependency
- [x] All existing tests pass (no regressions)
- [x] New tests cover TiptapEditor integration
- [x] TypeScript compilation succeeds
- [x] Sprint status updated: `9-4-integrate-editor-with-create-entry-form: review`
- [ ] Committed with proper message

---

## Story Status

**Current Status**: done
**Created**: 2026-01-16
**Epic Status**: Epic 9 in-progress

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

- Integrated TiptapEditor component into create-entry-form.tsx, replacing the plain textarea
- Removed textarea-specific code: textAreaRef, cursorSelection state, updateCursorSelection function
- Added `isEmptyTiptapContent()` helper function to validate Tiptap JSON content for empty state
- Updated validation in getErrors(), updateText(), handleTextBlur(), and canSubmit to use Tiptap JSON validation
- Removed inline image insertion button - deferred to Story 9.6 (custom Tiptap image node)
- Cover image selection functionality preserved and verified working
- Updated test suite with TiptapEditor mock for isolation testing
- All 511 tests pass with no regressions
- TypeScript compilation succeeds

### Code Review Fixes Applied

**Reviewer:** Claude Opus 4.5 (claude-opus-4-5-20251101)

**Issues Fixed:**
- H1 (HIGH): Removed dead `handleTextBlur` function that was orphaned after TiptapEditor integration
- M1 (MEDIUM): Removed dead `extractInlineImageUrls` import and useMemo - was using markdown regex on Tiptap JSON
- M2 (MEDIUM): Removed dead `removeInlineImageByUrl` call - no-op on Tiptap JSON content
- M3 (MEDIUM): Updated tests to properly verify validation error display on content change
- M4 (MEDIUM): Added comprehensive form submission test verifying Tiptap JSON format sent to API

**Code cleanup:**
- Removed unused `inlineImageUrls` computed value and all references
- Removed unused `availableStoryImages` computed value
- Simplified `libraryImageUrls` to only track `mediaUrls` (inline images deferred to Story 9.6)
- Updated `getErrors`, `handleMediaBlur`, and `canSubmit` to only check `mediaUrls`
- Added Story 9.6 deferral comments where inline image logic will be re-added

**Test count:** 512 tests pass (added 1 new submission test)

### File List

- travelblogs/src/components/entries/create-entry-form.tsx (modified)
- travelblogs/tests/components/create-entry-form.test.tsx (modified)

---

_Generated by BMad Create Story workflow - Ultimate context engine for flawless implementation_
