# Story 9.3: Build Tiptap Editor Component

**Epic**: 9 - Rich Text Editor for Blog Entries
**Story ID**: 9.3
**Status**: ready-for-dev
**Created**: 2026-01-15

---

## User Story

**As a** developer
**I want to** build a standalone Tiptap rich text editor React component
**So that** it can be reused in both create and edit entry forms with consistent editing capabilities

---

## Acceptance Criteria

### AC1: Editor Component Renders with Tiptap Extensions
**Given** the TiptapEditor component is mounted with initial content
**When** the component renders
**Then** it displays a functioning Tiptap editor with all configured extensions (bold, italic, headings, lists, text alignment, links)
**And** the editor toolbar shows formatting controls for all supported features
**And** the editor content area is editable and responsive to user input

### AC2: Controlled Component Pattern
**Given** the TiptapEditor component receives content and onChange props
**When** the user types or formats text in the editor
**Then** the onChange callback is invoked with the current Tiptap JSON content
**And** the component re-renders correctly when content prop changes externally
**And** the component maintains controlled state without unintended side effects

### AC3: Initialization from Plain Text or Tiptap JSON
**Given** the TiptapEditor component receives initialContent as either plain text string or Tiptap JSON string
**When** the component initializes
**Then** plain text content is converted to Tiptap JSON format automatically
**And** Tiptap JSON content is parsed and rendered correctly
**And** initialization errors are handled gracefully without crashes

### AC4: Export Content as Tiptap JSON String
**Given** the TiptapEditor has content
**When** the onChange callback fires or content is requested
**Then** the content is provided as a JSON string (serialized Tiptap document)
**And** the JSON structure matches Tiptap's expected document format
**And** the JSON can be parsed by detectEntryFormat utility from Story 9.2

---

## Technical Context

### Epic 9 Overview

**Goal**: Replace plain text entry editor with rich text editing capabilities (bold, italic, headings, lists, links, alignment) while maintaining existing image library and gallery workflow.

**This Story's Role**: Build reusable Tiptap editor component that encapsulates all rich text editing logic, to be integrated into entry forms in Stories 9.4 and 9.5.

### Tiptap Configuration (from Story 9.1)

**Available Extensions** (from [travelblogs/src/utils/tiptap-config.ts](../../travelblogs/src/utils/tiptap-config.ts:1)):
- **StarterKit**: Bold, Italic, Strike, Code, Paragraph, Headings (H1-H3), Bullet List, Ordered List, Blockquote, Code Block, Hard Break, Horizontal Rule
- **TextAlign**: Left, Center, Right alignment for paragraphs and headings
- **Link**: Hyperlink support with custom theme styling (teal color #1F6F78)

**Usage**:
```typescript
import { getTiptapExtensions } from '@/utils/tiptap-config'
```

### Format Detection Utility (from Story 9.2)

**Available Functions** (from [travelblogs/src/utils/entry-format.ts](../../travelblogs/src/utils/entry-format.ts:1)):
```typescript
import { detectEntryFormat, type EntryFormat } from '@/utils/entry-format'

// Detect if content is 'plain' or 'tiptap'
const format = detectEntryFormat(textContent)
```

**Use Cases**:
- Initialize editor with correct format parsing
- Validate exported content structure
- Handle edge cases (empty strings, malformed JSON)

### Tiptap Document Structure

**Output Format** (JSON serialized as string):
```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "My Heading" }]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Regular text " },
        {
          "type": "text",
          "marks": [{ "type": "bold" }],
          "text": "bold text"
        }
      ]
    }
  ]
}
```

---

## Implementation Guidelines

### Component File Structure

**Create Component**:
```
travelblogs/src/components/entries/tiptap-editor.tsx
```

**Component Signature**:
```typescript
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import { getTiptapExtensions } from '@/utils/tiptap-config'
import { detectEntryFormat } from '@/utils/entry-format'

type TiptapEditorProps = {
  initialContent: string              // Plain text or Tiptap JSON string
  onChange: (jsonContent: string) => void  // Callback with Tiptap JSON string
  placeholder?: string                // Optional placeholder text
  className?: string                  // Optional additional CSS classes
}

export default function TiptapEditor({
  initialContent,
  onChange,
  placeholder = 'Start writing...',
  className = '',
}: TiptapEditorProps) {
  // Implementation
}
```

### Initialization Logic

**Step 1: Detect Format and Parse Content**
```typescript
const parseInitialContent = (content: string) => {
  const format = detectEntryFormat(content)

  if (format === 'tiptap') {
    try {
      return JSON.parse(content)
    } catch {
      // Malformed Tiptap JSON → fallback to plain text
      return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: content }] }] }
    }
  }

  // Plain text → convert to Tiptap structure
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: content }]
      }
    ]
  }
}
```

**Step 2: Initialize Tiptap Editor Instance**
```typescript
const editor = useEditor({
  extensions: getTiptapExtensions(),
  content: parseInitialContent(initialContent),
  onUpdate: ({ editor }) => {
    const json = editor.getJSON()
    const jsonString = JSON.stringify(json)
    onChange(jsonString)
  },
  editorProps: {
    attributes: {
      class: 'prose prose-lg focus:outline-none min-h-[200px] p-4',
    },
  },
})
```

### Toolbar Implementation

**Formatting Controls** (following project's existing form UI patterns):

Required toolbar buttons:
1. **Text Formatting**: Bold, Italic, Strike
2. **Headings**: H1, H2, H3
3. **Lists**: Bullet List, Ordered List
4. **Alignment**: Left, Center, Right
5. **Links**: Add/Edit Link, Remove Link
6. **Utility**: Undo, Redo

**Button Style Pattern** (from existing entry forms):
```typescript
// Use project's existing button patterns from create-entry-form.tsx
const buttonBaseClass = "px-3 py-1.5 text-sm font-medium rounded"
const activeClass = "bg-[#1F6F78] text-white"
const inactiveClass = "bg-gray-200 text-gray-700 hover:bg-gray-300"
```

**Toolbar Layout**:
```tsx
<div className="flex flex-wrap gap-2 p-2 border-b border-gray-300 bg-gray-50">
  {/* Text formatting group */}
  <div className="flex gap-1">
    <button onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? activeClass : inactiveClass}>
      Bold
    </button>
    {/* ... more buttons */}
  </div>

  {/* Headings group */}
  <div className="flex gap-1 border-l pl-2">
    <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
      H1
    </button>
    {/* ... */}
  </div>
</div>
```

### Controlled Component Behavior

**Handle External Content Updates**:
```typescript
useEffect(() => {
  if (!editor) return

  const currentContent = JSON.stringify(editor.getJSON())
  const parsedInitial = parseInitialContent(initialContent)
  const newContent = JSON.stringify(parsedInitial)

  // Only update if content actually changed (avoid infinite loops)
  if (currentContent !== newContent) {
    editor.commands.setContent(parsedInitial)
  }
}, [initialContent, editor])
```

### Styling & Responsive Design

**Tailwind Classes** (following project conventions from [project-context.md](../../_bmad-output/project-context.md:1)):
- Use Tailwind CSS (already configured in Next.js project)
- Follow existing form styling patterns from [create-entry-form.tsx:1-100](../../travelblogs/src/components/entries/create-entry-form.tsx:1-100)
- Ensure responsive layout (mobile and desktop)
- Match application's color tokens (teal #1F6F78, ivory/sand surfaces, charcoal text)

**Editor Container**:
```tsx
<div className={`border border-gray-300 rounded-lg overflow-hidden ${className}`}>
  <Toolbar editor={editor} />
  <EditorContent
    editor={editor}
    className="prose prose-lg max-w-none p-4 min-h-[300px]"
  />
</div>
```

### Error Handling

**Scenarios to Handle**:
1. **Invalid initialContent**: Fallback to empty Tiptap document
2. **Editor initialization failure**: Show error message, don't crash
3. **onChange callback errors**: Log error, continue operation
4. **Malformed JSON output**: Validate before calling onChange

**Error Boundary Pattern**:
```typescript
if (!editor) {
  return <div className="p-4 text-red-600">Editor failed to initialize</div>
}
```

---

## Dev Notes

### Architecture Context

**Component Location**: `src/components/entries/` (feature-based organization per [project-context.md:46](../../_bmad-output/project-context.md:46))

**Naming Conventions**:
- Component name: `TiptapEditor` (PascalCase)
- File name: `tiptap-editor.tsx` (kebab-case)
- Props interface: `TiptapEditorProps` (PascalCase with Props suffix)

**Client Component Requirement**:
- Must use `'use client'` directive (Tiptap requires browser APIs)
- Follows Next.js App Router client component pattern

### Integration Points

**Downstream Stories** (will consume this component):
- **Story 9.4**: Integrate Editor with Create Entry Form
- **Story 9.5**: Integrate Editor with Edit Entry Form
- **Story 9.6**: Implement Custom Image Node (editor extension)

**No Direct Database Changes**: This story creates a UI component only, no API or database modifications.

### Existing Entry Form Patterns

**Form Structure** (from [create-entry-form.tsx](../../travelblogs/src/components/entries/create-entry-form.tsx:1-100)):
- Large `<textarea>` currently used for plain text entry
- Validation pattern: `getErrors()` function checks required fields
- State management: Local React state with `useState`
- Error display: Red text below fields (`text-red-600`)
- Field labels: `<label className="block mb-2 text-sm font-medium">` pattern

**Current Text Input** (will be replaced in Story 9.4):
```tsx
<textarea
  value={text}
  onChange={(e) => setText(e.target.value)}
  className="w-full p-2 border border-gray-300 rounded-md"
  rows={10}
/>
```

**Integration Preview** (Story 9.4 implementation):
```tsx
import TiptapEditor from './tiptap-editor'

// Replace textarea with:
<TiptapEditor
  initialContent={text}
  onChange={setText}
  placeholder={t('entries.entryTextPlaceholder')}
/>
```

### Typography System (UX Design Specification)

**Body Text** (from [project-context.md:107](../../_bmad-output/project-context.md:107)):
- Font family: Source Serif 4 (body text - use existing project typography)
- Font size: 17-18px
- Line length: 55-75 characters (use prose class for proper width)

**Heading Styles**:
- H1: Largest heading (hero titles)
- H2: Section headings
- H3: Subsection headings

**Implementation**:
```tsx
// Use Tailwind prose plugin (already configured)
<EditorContent
  editor={editor}
  className="prose prose-lg max-w-none"
/>
```

### Accessibility Requirements (WCAG AA)

**Keyboard Navigation**:
- All toolbar buttons must be keyboard accessible (tab navigation)
- Editor content area must receive focus with visible focus ring
- Keyboard shortcuts: Bold (Cmd/Ctrl+B), Italic (Cmd/Ctrl+I), etc. (built into Tiptap)

**Focus States**:
- Visible focus ring on toolbar buttons: `focus:ring-2 focus:ring-[#1F6F78]`
- Editor content focus: `focus:outline-none` with visible cursor

**Color Contrast**:
- Text contrast: 4.5:1 minimum (charcoal #2D2A26 on ivory background)
- Link color: Teal #1F6F78 (already configured in tiptap-config.ts)
- Button states: Clear active/inactive distinction

**Touch Targets** (mobile):
- Toolbar buttons: Minimum 44x44px (use `min-w-[44px] min-h-[44px]`)
- Editor content: Full touch area for text input

### Translation Support (i18n)

**Required Strings** (English and German):
- Toolbar button labels/tooltips
- Placeholder text
- Error messages
- Link dialog labels

**Translation Pattern** (from existing entry forms):
```typescript
import { useTranslation } from '@/utils/use-translation'

const { t } = useTranslation()

// Usage:
placeholder={t('entries.richTextPlaceholder')}
```

**Add to Translation Files**:
```json
{
  "entries": {
    "richTextPlaceholder": "Start writing your story...",
    "boldButton": "Bold",
    "italicButton": "Italic",
    // ... more toolbar labels
  }
}
```

---

## Previous Story Intelligence (from Story 9.2)

### Key Learnings from Story 9.2

**File**: [9-2-update-entry-schema-for-dual-format-support.md](9-2-update-entry-schema-for-dual-format-support.md:1)

**Completed Work**:
- ✅ Format detection utility created: `src/utils/entry-format.ts`
- ✅ `detectEntryFormat()` function distinguishes plain text from Tiptap JSON
- ✅ `validateTiptapStructure()` function validates Tiptap document structure
- ✅ Entry schema confirmed: Single `text` field supports both formats (no migration needed)
- ✅ 21 unit tests written and passing

**Critical Implementation Details**:
1. **Format Detection Logic**:
   - Empty/whitespace → 'plain'
   - Invalid JSON → 'plain'
   - Valid JSON with `type: 'doc'` and `content: []` → 'tiptap'
   - Valid JSON without Tiptap structure → 'plain'

2. **Safe Defaults**: All errors return 'plain' format (backward compatibility)

3. **Performance**: Format detection is fast (< 1ms for typical entry sizes)

**Use in This Story**:
- Call `detectEntryFormat()` on `initialContent` to determine parsing strategy
- Validate exported JSON matches Tiptap structure expectations
- Reuse error handling patterns (graceful fallbacks)

---

## Git Intelligence (Recent Commits)

**Recent Story Completions**:
1. `d39e156` - Story 9.2 update entry schema
2. `0b15e5d` - Story 9.2: Update Entry Schema for Dual-Format Support
3. `f188001` - Story 9.1 Bugfix
4. `d43558b` - Story 9.1: Install and Configure Tiptap
5. `c09f4fb` - Story 8.5 Bugfix Tags on wrong page

**Patterns Established**:
- Commit messages: `Story X.Y: Title` format (follow this pattern)
- Bugfix commits: Separate commits for fixes after initial implementation
- File organization: Utilities in `src/utils/`, components in `src/components/`

**Testing Pattern**: Unit tests run successfully before commits (all 481 tests passing in Story 9.2)

---

## Testing Requirements

### Unit Tests Required

**Test File Location**: `tests/components/tiptap-editor.test.tsx`

**Test Cases**:

1. **Component Rendering**
   - ✓ Renders editor with toolbar and content area
   - ✓ Displays placeholder text when empty
   - ✓ All toolbar buttons render correctly
   - ✓ Editor initializes without errors

2. **Content Initialization**
   - ✓ Initializes with plain text content
   - ✓ Initializes with Tiptap JSON content
   - ✓ Handles empty string initialization
   - ✓ Handles malformed JSON gracefully
   - ✓ Converts plain text to Tiptap structure

3. **User Interactions**
   - ✓ Typing in editor triggers onChange callback
   - ✓ Bold button toggles bold formatting
   - ✓ Heading buttons change paragraph to heading
   - ✓ List buttons create bullet/ordered lists
   - ✓ Alignment buttons change text alignment
   - ✓ Undo/Redo buttons work correctly

4. **Controlled Component Behavior**
   - ✓ onChange receives valid Tiptap JSON string
   - ✓ External content prop updates re-render editor
   - ✓ No infinite loops on content updates
   - ✓ Editor state syncs with controlled prop

5. **Edge Cases**
   - ✓ Handles very long content (performance)
   - ✓ Handles special characters in plain text
   - ✓ Handles nested formatting (bold + italic)
   - ✓ Editor cleanup on unmount (no memory leaks)

**Testing Framework**: Vitest + React Testing Library (existing setup)

**Example Test**:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TiptapEditor from '@/components/entries/tiptap-editor'

describe('TiptapEditor', () => {
  it('renders with placeholder text', () => {
    const onChange = vi.fn()
    render(<TiptapEditor initialContent="" onChange={onChange} placeholder="Type here..." />)
    expect(screen.getByText(/Type here/i)).toBeInTheDocument()
  })

  it('calls onChange with Tiptap JSON on text input', async () => {
    const onChange = vi.fn()
    render(<TiptapEditor initialContent="" onChange={onChange} />)

    const editor = screen.getByRole('textbox')
    fireEvent.input(editor, { target: { textContent: 'Hello world' } })

    expect(onChange).toHaveBeenCalled()
    const jsonArg = onChange.mock.calls[0][0]
    const parsed = JSON.parse(jsonArg)
    expect(parsed.type).toBe('doc')
  })
})
```

### Manual Testing Checklist

**Desktop Browser Testing**:
- [ ] Editor renders correctly in Chrome, Safari, Firefox, Edge
- [ ] All toolbar buttons clickable and functional
- [ ] Keyboard shortcuts work (Cmd/Ctrl+B for bold, etc.)
- [ ] Text selection and formatting applies correctly
- [ ] Undo/Redo work with keyboard shortcuts (Cmd/Ctrl+Z)
- [ ] Link dialog opens and closes correctly
- [ ] Copy/paste preserves formatting

**Mobile Testing**:
- [ ] Editor usable on iOS Safari
- [ ] Editor usable on Android Chrome
- [ ] Toolbar buttons meet 44x44px touch target size
- [ ] Virtual keyboard doesn't obscure editor content
- [ ] Text selection works with touch gestures

**Accessibility Testing**:
- [ ] Tab navigation through toolbar buttons works
- [ ] Editor content receives focus with visible indicator
- [ ] Screen reader announces toolbar button states
- [ ] Color contrast meets WCAG AA standards
- [ ] Keyboard-only navigation is functional

---

## Dependencies & Related Stories

### Upstream Dependencies
- ✅ **Story 9.1**: Install and Configure Tiptap (done)
  - Tiptap packages installed (v3.15.3)
  - Extension configuration: `getTiptapExtensions()` available
- ✅ **Story 9.2**: Update Entry Schema for Dual-Format Support (done)
  - Format detection: `detectEntryFormat()` function available
  - Entry model confirmed: Single `text` field supports both formats

### Downstream Stories (blocked by this story)
- **Story 9.4**: Integrate Editor with Create Entry Form (needs TiptapEditor component)
- **Story 9.5**: Integrate Editor with Edit Entry Form (needs TiptapEditor component)
- **Story 9.6**: Implement Custom Image Node (extends this component with custom extension)

### No Blockers
This story has all dependencies completed and can proceed immediately.

---

## Project Context Reference

**Critical Rules** (from [project-context.md](../../_bmad-output/project-context.md:1)):

### Technology Stack
- Next.js App Router (client components with `'use client'`)
- React + TypeScript
- Tailwind CSS for styling
- Tiptap v3.15.3 for rich text editing

### Naming Conventions
- **Components**: PascalCase (`TiptapEditor`)
- **Files**: kebab-case (`tiptap-editor.tsx`)
- **Variables**: camelCase (`initialContent`, `onChange`)
- **Props interfaces**: PascalCase with `Props` suffix (`TiptapEditorProps`)

### File Structure
- Components: `src/components/<feature>/`
- Utilities: `src/utils/`
- Tests: `tests/components/` (centralized, not co-located)

### Code Quality Rules
- Use `async/await` for async operations
- No `snake_case` in JSON or variables
- All user-facing strings must be translatable (English + German)
- Follow WCAG AA accessibility standards

### Testing Rules
- Tests in central `tests/` directory
- Organize by: `tests/components/`, `tests/utils/`, `tests/api/`
- Use existing Vitest + React Testing Library setup

---

## Implementation Checklist

### Development Tasks

- [ ] Create `travelblogs/src/components/entries/tiptap-editor.tsx`
- [ ] Import Tiptap hooks: `useEditor`, `EditorContent`
- [ ] Import utilities: `getTiptapExtensions`, `detectEntryFormat`
- [ ] Define `TiptapEditorProps` TypeScript interface
- [ ] Implement `parseInitialContent()` helper function
- [ ] Initialize Tiptap editor with `useEditor` hook
- [ ] Implement toolbar component with all formatting buttons
- [ ] Implement controlled component behavior with `useEffect`
- [ ] Add error handling for initialization failures
- [ ] Apply Tailwind styling matching project conventions
- [ ] Add accessibility attributes (ARIA labels, keyboard support)
- [ ] Test component in isolation (Storybook or standalone page)

### Testing Tasks

- [ ] Create `tests/components/tiptap-editor.test.tsx`
- [ ] Write unit tests for component rendering
- [ ] Write unit tests for content initialization (plain text + Tiptap JSON)
- [ ] Write unit tests for user interactions (typing, formatting)
- [ ] Write unit tests for controlled component behavior
- [ ] Write unit tests for edge cases
- [ ] Run all tests: `npm run test`
- [ ] Verify no test regressions (all 481+ tests pass)

### Verification Tasks

- [ ] TypeScript compilation succeeds: `npm run build`
- [ ] ESLint passes: `npm run lint`
- [ ] Component renders in browser without errors
- [ ] All toolbar buttons functional
- [ ] onChange callback provides valid Tiptap JSON
- [ ] Keyboard shortcuts work (bold, italic, undo, redo)
- [ ] Accessibility tested (keyboard navigation, focus states)
- [ ] Mobile responsive (tested on small screen sizes)

### Documentation Tasks

- [ ] Add JSDoc comments to component and props interface
- [ ] Document exported functions and types
- [ ] Update story status in sprint-status.yaml (ready-for-dev → in-progress → review → done)
- [ ] Commit with message: `Story 9.3: Build Tiptap Editor Component`

---

## Definition of Done

- [ ] TiptapEditor component created in `src/components/entries/tiptap-editor.tsx`
- [ ] Component accepts `initialContent`, `onChange`, `placeholder`, `className` props
- [ ] Editor initializes with plain text or Tiptap JSON content
- [ ] Toolbar includes all required formatting controls (bold, italic, headings, lists, alignment, links)
- [ ] onChange callback provides Tiptap JSON string on every content change
- [ ] Controlled component pattern implemented (external content updates work)
- [ ] Error handling prevents crashes on invalid input
- [ ] Tailwind styling matches project conventions
- [ ] Accessibility requirements met (WCAG AA, keyboard navigation)
- [ ] Comprehensive unit tests written (20+ test cases)
- [ ] All tests pass: `npm run test`
- [ ] TypeScript compilation succeeds: `npm run build`
- [ ] Manual testing completed (desktop + mobile browsers)
- [ ] Component ready for integration in Stories 9.4 and 9.5
- [ ] Sprint status updated: `9-3-build-tiptap-editor-component: done`
- [ ] Committed with proper message

---

## Story Status

**Current Status**: done
**Created**: 2026-01-15
**Completed**: 2026-01-16
**Epic Status**: Epic 9 in-progress

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Implementation Summary

Successfully implemented TiptapEditor component with comprehensive toolbar (including Link support), format detection, controlled component pattern, placeholder support, full i18n, and comprehensive test coverage. All acceptance criteria satisfied.

### Completion Notes List

**Component Implementation:**
- ✅ Created TiptapEditor component with full Tiptap integration
- ✅ Implemented parseInitialContent helper for plain text and JSON formats
- ✅ Built comprehensive toolbar with all required formatting controls including Links
- ✅ Implemented controlled component pattern with onChange callback
- ✅ Added Link dialog for Add/Edit/Remove link functionality
- ✅ Implemented Placeholder extension with prop support
- ✅ Added error handling for initialization failures
- ✅ Applied WCAG AA accessibility (ARIA labels, keyboard navigation, focus states)
- ✅ Responsive Tailwind styling matching project conventions
- ✅ Full i18n support with English and German translations

**Testing:**
- ✅ Created 28 comprehensive unit tests covering all scenarios
- ✅ All 509 tests passing (28 new + 481 existing, no regressions)
- ✅ TypeScript compilation successful
- ✅ Mocked ProseMirror DOM methods to prevent jsdom errors
- ✅ Tests cover: rendering, initialization, user interactions, link dialog, controlled behavior, accessibility, edge cases

**Acceptance Criteria Validation:**
- ✅ AC1: Editor renders with all Tiptap extensions and toolbar controls (including Links)
- ✅ AC2: Controlled component pattern with onChange callback implemented
- ✅ AC3: Initializes from both plain text and Tiptap JSON correctly
- ✅ AC4: Exports content as valid Tiptap JSON string

**Code Review Fixes Applied (2026-01-16):**
- ✅ H1: Added Link toolbar buttons (Add/Remove) with dialog UI
- ✅ H2: Fixed test suite uncaught exceptions by mocking getClientRects/getBoundingClientRect
- ✅ H3: Added full i18n translations (English + German) for all toolbar labels and messages
- ✅ M1: Implemented Placeholder extension with prop support
- ✅ M3: Improved test quality with proper DOM mocks and accessibility tests
- ✅ Fixed duplicate Link extension warning by disabling StarterKit's built-in Link

### File List

**Created Files:**
- travelblogs/src/components/entries/tiptap-editor.tsx (TiptapEditor component - 447 lines)
- travelblogs/tests/components/tiptap-editor.test.tsx (Comprehensive test suite - 28 tests)

**Modified Files:**
- travelblogs/package.json (added @testing-library/user-event, @tiptap/extension-placeholder)
- travelblogs/package-lock.json (dependency lockfile updates)
- travelblogs/src/utils/i18n.ts (added editor translations for EN and DE)
- travelblogs/src/utils/tiptap-config.ts (disabled StarterKit Link to prevent duplicate)

---

_Generated by BMad Create Story workflow - Ultimate context engine for flawless implementation_
