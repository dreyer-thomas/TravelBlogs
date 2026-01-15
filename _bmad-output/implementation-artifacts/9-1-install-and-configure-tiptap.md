# Story 9.1: Install and Configure Tiptap

**Epic**: 9 - Rich Text Editor for Blog Entries
**Story ID**: 9.1
**Status**: done
**Created**: 2026-01-15

---

## User Story

**As a** developer
**I want to** install Tiptap and its required extensions
**So that** the rich text editor infrastructure is available for entry editing

---

## Acceptance Criteria

### AC1: Install Tiptap Core and React Adapter
**Given** the project uses Next.js with TypeScript
**When** I install Tiptap core and React adapter
**Then** all required packages are added to package.json with compatible versions

### AC2: Configure Extensions
**Given** Tiptap is installed
**When** I configure extensions for bold, italic, headings (H1/H2/H3), bullet lists, ordered lists, links, and text alignment
**Then** the extension configuration is ready for use in the editor component

### AC3: Verify Installation
**Given** the Tiptap editor is configured
**When** I verify the installation
**Then** the editor can be imported and initialized without errors

---

## Technical Context

### Technology Stack
- **Framework**: Next.js 16.1.0 with App Router
- **React**: 19.2.3
- **TypeScript**: 5.x
- **Package Manager**: npm (based on package.json)

### Required Tiptap Packages

Install the following packages:

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit
npm install @tiptap/extension-text-align @tiptap/extension-link
```

**Package Breakdown:**
- `@tiptap/react` - React adapter for Tiptap
- `@tiptap/pm` - ProseMirror core (peer dependency)
- `@tiptap/starter-kit` - Includes essential extensions:
  - Bold
  - Italic
  - Heading (H1, H2, H3, H4, H5, H6)
  - BulletList
  - OrderedList
  - ListItem
  - Document
  - Paragraph
  - Text
  - HardBreak
  - ...and more
- `@tiptap/extension-text-align` - Text alignment (left, center, right, justify)
- `@tiptap/extension-link` - Link support

### Extension Configuration

**Required Extensions for This Story:**
1. **StarterKit** (default bundle including Bold, Italic, Heading, Lists)
2. **TextAlign** (for alignment control)
3. **Link** (for hyperlinks)

**Configuration Example:**

```typescript
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3], // Only H1, H2, H3 as per requirements
      },
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right'],
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-[#1F6F78] underline hover:text-[#2D2A26]',
      },
    }),
  ],
  content: '<p>Hello World!</p>',
})
```

---

## Implementation Guidelines

### Project Structure Rules (from project-context.md)

- **Components**: Place in `src/components/<feature>/`
  - For this story: NO component creation yet (just installation)
- **Utilities**: Place in `src/utils/` if needed
- **File Naming**: `kebab-case.tsx` for files, `PascalCase` for components

### Key Project Conventions

1. **TypeScript**: All code must be TypeScript
2. **Naming**: `camelCase` for variables/functions
3. **No snake_case**: Follow project convention strictly

### Installation Verification Steps

1. **Install packages** using npm (see command above)
2. **Verify package.json** updated with correct versions
3. **Create verification file** (optional) to test import:
   ```typescript
   // src/utils/tiptap-config.ts
   import { useEditor } from '@tiptap/react'
   import StarterKit from '@tiptap/starter-kit'
   import TextAlign from '@tiptap/extension-text-align'
   import Link from '@tiptap/extension-link'

   // Export configuration for reuse in Story 9.3
   export const getTiptapExtensions = () => [
     StarterKit.configure({
       heading: {
         levels: [1, 2, 3],
       },
     }),
     TextAlign.configure({
       types: ['heading', 'paragraph'],
       alignments: ['left', 'center', 'right'],
     }),
     Link.configure({
       openOnClick: false,
       HTMLAttributes: {
         class: 'text-[#1F6F78] underline hover:text-[#2D2A26]',
       },
     }),
   ]
   ```

4. **Verify no TypeScript errors**: Run `npm run build` to ensure no compilation errors

---

## Testing Requirements

### Verification Tests

**Manual Verification:**
1. Run `npm install` successfully
2. Check `package.json` contains all Tiptap dependencies
3. Verify TypeScript compilation: `npm run build`
4. No runtime errors when importing Tiptap packages

**No automated tests required for this story** - This is infrastructure setup only.

---

## Dependencies & Related Stories

### Upstream Dependencies
- **None** - This is the first story in Epic 9

### Downstream Stories
- **Story 9.2**: Update Entry Schema (can run in parallel)
- **Story 9.3**: Build Tiptap Editor Component (depends on this story)

### Integration Points
- **None yet** - No integration with existing code in this story

---

## Epic Context

**Epic 9 Goal**: Replace plain text entry editor with rich text editing capabilities (bold, italic, headings, lists, links, alignment) while maintaining existing image library and gallery workflow.

**This Story's Role**: Foundation - Install the core Tiptap infrastructure that all subsequent stories will build upon.

**Key Architectural Decision**: Using Tiptap over alternatives (Quill, Draft.js, Slate) because:
- Excellent React/TypeScript support
- Extensible architecture
- Active maintenance and community
- Good Next.js compatibility

---

## Implementation Notes

### Recent Work Context (from git log)
Last 5 commits focused on Epic 8 (Entry Tags & Filtering):
- `c09f4fb` Story 8.5 Bugfix Tags on wrong page
- `7d46caa` Story 8.5 Trip card tags
- `383ef7b` Story 8.4 Bugfix 2
- `b381dbe` Story 8.4 Bugfix
- `c646f29` Story 8.4 Filter Entries by tags

**Pattern**: Epic 8 work focused on tags feature, no overlap with rich text editing.

### Existing Entry Form Location
Current plain text editor is in:
- [src/components/entries/create-entry-form.tsx](../travelblogs/src/components/entries/create-entry-form.tsx) (textarea at line ~870)
- [src/components/entries/edit-entry-form.tsx](../travelblogs/src/components/entries/edit-entry-form.tsx)

**Do NOT modify these files in this story** - Just install dependencies.

---

## Definition of Done

- [x] Tiptap packages installed via npm
- [x] package.json updated with correct versions
- [x] No TypeScript compilation errors
- [x] Optional: Verification utility created in `src/utils/tiptap-config.ts`
- [x] Story marked as `done` in sprint-status.yaml
- [x] Commit with message: `Story 9.1: Install and Configure Tiptap`

---

## Story Status

**Current Status**: done
**Completed**: 2026-01-15

---

## Dev Agent Record

### Implementation Summary

Successfully installed Tiptap core packages and configured extensions for rich text editing. Created reusable configuration utility to centralize extension setup for use in subsequent stories (9.3+).

### File List

**Modified Files:**
- [travelblogs/package.json](../../travelblogs/package.json) - Added Tiptap dependencies (@tiptap/react, @tiptap/pm, @tiptap/starter-kit, @tiptap/extension-text-align, @tiptap/extension-link)
- [travelblogs/package-lock.json](../../travelblogs/package-lock.json) - Updated lockfile with Tiptap package resolutions
- [_bmad-output/implementation-artifacts/sprint-status.yaml](sprint-status.yaml) - Updated story status to review → done

**Created Files:**
- [travelblogs/src/utils/tiptap-config.ts](../../travelblogs/src/utils/tiptap-config.ts) - Tiptap extension configuration utility (getTiptapExtensions)

### Packages Installed

All packages installed at version `^3.15.3`:
- `@tiptap/react` - React adapter for Tiptap
- `@tiptap/pm` - ProseMirror core (peer dependency)
- `@tiptap/starter-kit` - Essential extensions (Bold, Italic, Heading, Lists, etc.)
- `@tiptap/extension-text-align` - Text alignment support
- `@tiptap/extension-link` - Hyperlink support

### Extension Configuration

Created `getTiptapExtensions()` utility with:
1. **StarterKit**: Configured with heading levels [1, 2, 3] only (per requirements)
2. **TextAlign**: Configured for heading and paragraph types with left/center/right alignment
3. **Link**: Configured with `openOnClick: false` and custom styling matching project theme colors

### Verification

- ✅ TypeScript compilation: `npm run build` passes with no errors
- ✅ All imports resolve correctly
- ✅ Extensions configured per AC2 requirements
- ✅ Configuration utility ready for Story 9.3 (Build Tiptap Editor Component)

### Change Log

**2026-01-15**
- Installed Tiptap packages via `npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-text-align @tiptap/extension-link`
- Created `travelblogs/src/utils/tiptap-config.ts` with extension configuration
- Verified build passes with no TypeScript errors
- Updated sprint-status.yaml to mark story as review
- Committed changes: `Story 9.1: Install and Configure Tiptap` (d43558b)

### Implementation Notes

**Version Selection:**
- Selected Tiptap v3.15.3 (latest stable at time of implementation)
- All @tiptap/* packages use matching versions for compatibility
- No peer dependency warnings or conflicts

**Configuration Decisions:**
- Heading levels restricted to [1, 2, 3] as per story requirements
- Link styling uses project theme colors (#1F6F78 for links, #2D2A26 for hover)
- TextAlign limited to left/center/right (no justify per UX patterns)
- openOnClick: false for links (prevents accidental navigation during editing)

**Future Considerations for Story 9.3:**
- Configuration is exported as function to allow potential runtime customization
- Extension array can be extended with custom nodes/marks if needed
- Link class names match existing project Tailwind theme

---

_Generated by BMad Create Story workflow - Ultimate context engine for flawless implementation_
