# Story 9.2: Update Entry Schema for Dual-Format Support

**Epic**: 9 - Rich Text Editor for Blog Entries
**Story ID**: 9.2
**Status**: ready-for-dev
**Created**: 2026-01-15

---

## User Story

**As a** developer
**I want to** prepare the Entry schema and utilities to support both plain text and Tiptap JSON formats
**So that** existing entries remain accessible while new entries use rich text without data loss

---

## Acceptance Criteria

### AC1: Format Detection Utility
**Given** an Entry text field contains either plain text or Tiptap JSON
**When** the format detection utility analyzes the content
**Then** it correctly identifies whether the content is plain text or Tiptap JSON format
**And** returns a clear format indicator ('plain' or 'tiptap')

### AC2: JSON Validation for Tiptap Format
**Given** the format detection utility identifies content as Tiptap JSON
**When** it validates the JSON structure
**Then** it confirms the JSON contains valid Tiptap document structure with type and content fields
**And** handles malformed JSON gracefully without crashing

### AC3: Backward Compatibility Verification
**Given** existing entries with plain text content
**When** the format detection utility processes them
**Then** they are correctly identified as plain text format
**And** no existing entry data is modified or lost

### AC4: Export Format Types
**Given** the format detection and validation utilities are implemented
**When** other parts of the codebase need to use these utilities
**Then** TypeScript types are exported for EntryFormat ('plain' | 'tiptap')
**And** utility functions are properly typed and documented

---

## Technical Context

### Current Entry Schema (Prisma)

**Location**: `travelblogs/prisma/schema.prisma` (lines 45-60)

```prisma
model Entry {
  id            String      @id @default(cuid())
  tripId        String
  title         String
  coverImageUrl String?
  text          String      // ← This field supports BOTH formats
  latitude      Float?
  longitude     Float?
  locationName  String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  trip      Trip         @relation(fields: [tripId], references: [id], onDelete: Cascade)
  media     EntryMedia[]
  tags      EntryTag[]
}
```

### Key Design Decision: Single Text Field

**No schema migration required** for this story. The existing `text` field (String type) can store:
- **Plain text**: Legacy entries from Story 2.1-2.2 (simple strings)
- **Tiptap JSON**: New entries from Story 9.3+ (JSON serialized as strings)

**Why this works:**
- SQL TEXT/String columns store any UTF-8 string content
- JSON is valid UTF-8 and can be stored as a string
- Format detection determines how to parse the content
- No data loss occurs when storing JSON in String field
- Maintains schema simplicity (no additional columns needed)

### Format Detection Strategy

The utility must differentiate between formats:

**Plain Text Indicators:**
- Content does NOT parse as valid JSON
- OR content is valid JSON but lacks Tiptap document structure

**Tiptap JSON Indicators:**
- Content parses as valid JSON
- AND contains Tiptap document markers:
  - Root `type`: "doc"
  - Top-level `content` array
  - Standard Tiptap node structure

**Example Tiptap JSON Structure:**
```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Hello world" }
      ]
    }
  ]
}
```

---

## Implementation Guidelines

### File Structure

Create new utility file:
```
travelblogs/src/utils/entry-format.ts
```

**Contents:**
1. TypeScript type: `EntryFormat = 'plain' | 'tiptap'`
2. Function: `detectEntryFormat(text: string): EntryFormat`
3. Function: `isTiptapJson(text: string): boolean` (helper)
4. Function: `validateTiptapStructure(json: any): boolean` (helper)

### Project Conventions (from project-context.md)

- **Naming**: `camelCase` for functions and variables
- **File naming**: `kebab-case.ts` for utility files
- **Location**: Utilities go in `src/utils/`
- **TypeScript**: All code must use TypeScript with proper types
- **No snake_case**: Follow project conventions strictly

### Format Detection Algorithm

```typescript
export type EntryFormat = 'plain' | 'tiptap'

export function detectEntryFormat(text: string): EntryFormat {
  // 1. Try to parse as JSON
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    // Not valid JSON → plain text
    return 'plain'
  }

  // 2. Check for Tiptap document structure
  if (isTiptapJson(parsed)) {
    return 'tiptap'
  }

  // 3. Valid JSON but not Tiptap → treat as plain text
  return 'plain'
}

function isTiptapJson(json: any): boolean {
  // Check for required Tiptap document structure
  return (
    typeof json === 'object' &&
    json !== null &&
    json.type === 'doc' &&
    Array.isArray(json.content)
  )
}
```

### Edge Cases to Handle

1. **Empty strings**: Return 'plain' (default format)
2. **Null/undefined**: Handle gracefully (type guard)
3. **Malformed JSON**: Return 'plain' (catch parse errors)
4. **Valid JSON but not Tiptap**: Return 'plain' (e.g., `{"foo": "bar"}`)
5. **Tiptap JSON missing content**: Still validate if type is "doc"

---

## Testing Requirements

### Unit Tests Required

**Location**: `tests/utils/entry-format.test.ts`

**Test Cases:**

1. **Plain Text Detection**
   - ✓ Simple plain text string → 'plain'
   - ✓ Multi-line plain text → 'plain'
   - ✓ Plain text with special characters → 'plain'
   - ✓ Empty string → 'plain'

2. **Tiptap JSON Detection**
   - ✓ Valid Tiptap JSON with doc type → 'tiptap'
   - ✓ Valid Tiptap JSON with nested content → 'tiptap'
   - ✓ Valid Tiptap JSON with formatting marks → 'tiptap'

3. **Edge Cases**
   - ✓ Invalid JSON → 'plain'
   - ✓ Valid JSON but not Tiptap structure → 'plain'
   - ✓ JSON array (not object) → 'plain'
   - ✓ Tiptap JSON with empty content array → 'tiptap'

**Testing Framework**: Use existing Vitest setup (from project-context.md)

**Example Test:**
```typescript
import { describe, it, expect } from 'vitest'
import { detectEntryFormat, isTiptapJson } from '@/utils/entry-format'

describe('detectEntryFormat', () => {
  it('detects plain text format', () => {
    expect(detectEntryFormat('Hello world')).toBe('plain')
  })

  it('detects Tiptap JSON format', () => {
    const tiptapJson = JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }]
    })
    expect(detectEntryFormat(tiptapJson)).toBe('tiptap')
  })

  it('treats invalid JSON as plain text', () => {
    expect(detectEntryFormat('{invalid')).toBe('plain')
  })
})
```

---

## Dependencies & Related Stories

### Upstream Dependencies
- ✅ **Story 9.1**: Install and Configure Tiptap (done)
  - Tiptap packages installed (v3.15.3)
  - Extension configuration available in `travelblogs/src/utils/tiptap-config.ts`

### Downstream Stories
- **Story 9.3**: Build Tiptap Editor Component (needs format detection for initialization)
- **Story 9.8**: Update Entry Viewer to Render Tiptap JSON (uses format detection)
- **Story 9.9**: Implement Plain Text to Tiptap Converter (uses format detection)
- **Story 9.10**: Add Lazy Migration Logic (uses format detection to trigger conversion)

### Integration Points
- **Entry API Routes**: `src/app/api/entries/*` (no changes in this story)
- **Entry Forms**: `src/components/entries/*-entry-form.tsx` (no changes in this story)
- **Entry Viewer**: `src/components/entries/entry-reader.tsx` (will use in Story 9.8)

---

## Epic Context

**Epic 9 Goal**: Replace plain text entry editor with rich text editing capabilities (bold, italic, headings, lists, links, alignment) while maintaining existing image library and gallery workflow.

**This Story's Role**: Schema Preparation - Set up the data model and format detection utilities to support dual-format content storage without breaking existing entries.

**Key Architectural Decision**: Use single `text` field with format detection rather than separate columns:
- **Pros**: Simple schema, no data duplication, clean migration path
- **Cons**: Requires format detection on every read (mitigated by caching in Story 9.12)
- **Rationale**: Aligns with lazy migration strategy (Story 9.10) and minimizes schema complexity

**Backward Compatibility Strategy**:
1. Plain text entries remain as-is (no forced conversion)
2. Plain text rendered as rich format on view (Story 9.8)
3. Plain text converted to Tiptap JSON only on edit (Story 9.10)
4. Format detection ensures correct rendering for both formats

---

## Implementation Notes

### Recent Work Context (from Story 9.1)

Previous story (9.1) completed:
- ✅ Tiptap packages installed (@tiptap/react, @tiptap/pm, @tiptap/starter-kit, @tiptap/extension-text-align, @tiptap/extension-link)
- ✅ Extension configuration utility created: `travelblogs/src/utils/tiptap-config.ts`
- ✅ TypeScript compilation verified (no errors)
- ✅ Tiptap v3.15.3 selected (latest stable)

**Key Learning**: Configuration utility exports `getTiptapExtensions()` for reuse across editor components (Story 9.3+).

### Current Entry Model (from Prisma Schema Analysis)

**Schema file**: `travelblogs/prisma/schema.prisma`

**Entry migration history**:
1. `20251228110150_add_entry_models` - Initial Entry table (id, tripId, text, timestamps)
2. `20251228140516_add_entry_title` - Added title field (Story 2.5)
3. `20251228142333_add_entry_cover_image` - Added coverImageUrl field
4. `20260110183000_add_entry_location_fields` - Added latitude, longitude, locationName (Story 7.4)
5. `20260112233000_add_entry_tags` - Added Tag and EntryTag tables (Story 8.1)

**Current `text` field**:
- Type: String (TEXT in SQLite)
- Constraint: NOT NULL (required)
- Used by: All entries since Story 2.1
- Storage: Currently plain text only (will support dual format after this story)

### Database Constraints

- `text` field is **required** (NOT NULL) - entries must have content
- `tripId` is **required** - entries must belong to a trip
- Cascade delete: Deleting Trip → deletes all Entries → deletes all EntryMedia/EntryTag

### Tiptap Document Structure Reference

**Standard Tiptap JSON Output**:
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
        },
        { "type": "text", "text": " more text." }
      ]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "List item 1" }]
            }
          ]
        }
      ]
    }
  ]
}
```

**Key structure elements**:
- Root level: `{ type: "doc", content: [...] }`
- Node types: `doc`, `paragraph`, `heading`, `bulletList`, `orderedList`, `listItem`, `text`
- Marks: `bold`, `italic`, `link` (stored in `marks` array on text nodes)
- Attributes: Stored in `attrs` object (e.g., `{ level: 2 }` for headings)

### Error Handling Strategy

**Format detection must be robust**:
1. Never throw on invalid input (return 'plain' as safe default)
2. Handle all JSON.parse errors gracefully
3. Validate structure before confirming Tiptap format
4. Log warnings for unexpected structures (but don't fail)

**Example error scenarios**:
- Corrupted JSON → Return 'plain', log warning
- Missing `type` field → Return 'plain'
- `type` is not "doc" → Return 'plain'
- Empty `content` array → Still valid Tiptap (return 'tiptap')

---

## Definition of Done

- [x] Create `travelblogs/src/utils/entry-format.ts` with type definitions and format detection functions
- [x] Implement `detectEntryFormat(text: string): EntryFormat` function
- [x] Implement helper functions: `isTiptapJson()` and `validateTiptapStructure()`
- [x] Write comprehensive unit tests in `tests/utils/entry-format.test.ts`
- [x] All tests pass (`npm run test`)
- [x] TypeScript compilation succeeds (`npm run build`)
- [x] Export EntryFormat type for use in downstream stories
- [x] Update sprint-status.yaml to mark story as done
- [x] Commit with message: `Story 9.2: Update Entry Schema for Dual-Format Support`

---

## Story Status

**Current Status**: done
**Completed**: 2026-01-15
**Code Review**: 2026-01-15 - 7 issues found and fixed

---

## Dev Agent Record

### Implementation Summary

Successfully implemented format detection utility to distinguish between plain text and Tiptap JSON formats in Entry text field. Created comprehensive test suite with 13 test cases covering all edge cases.

### File List

**Created Files:**
- [travelblogs/src/utils/entry-format.ts](../../travelblogs/src/utils/entry-format.ts) - Format detection utility with EntryFormat type and detectEntryFormat function
- [travelblogs/tests/utils/entry-format.test.ts](../../travelblogs/tests/utils/entry-format.test.ts) - Comprehensive unit tests (13 tests)

**Modified Files:**
- [_bmad-output/implementation-artifacts/sprint-status.yaml](sprint-status.yaml) - Updated story status from ready-for-dev → in-progress → review

### Implementation Details

**Format Detection Algorithm:**
1. Empty/whitespace strings → return 'plain'
2. Attempt JSON parsing, catch errors → return 'plain'
3. Validate Tiptap structure (type='doc', content=array) → return 'tiptap'
4. Valid JSON but not Tiptap → return 'plain'

**Helper Function:**
- `isTiptapJson(json: unknown): boolean` - Validates parsed JSON has Tiptap document structure

**Test Coverage:**
- Plain text detection: 4 tests (simple, multiline, special chars, empty)
- Tiptap JSON detection: 4 tests (basic, nested, with marks, empty content)
- Edge cases: 5 tests (invalid JSON, wrong structure, arrays, missing fields)

### Verification Results

- ✅ All 21 tests pass (13 original + 8 added during code review)
- ✅ Full test suite passes (481 tests total, no regressions)
- ✅ TypeScript compilation successful (npm run build)
- ✅ EntryFormat type exported for downstream stories
- ✅ validateTiptapStructure function exported
- ✅ All 4 acceptance criteria satisfied

### Change Log

**2026-01-15 - Initial Implementation**
- Created `travelblogs/src/utils/entry-format.ts` with EntryFormat type and detectEntryFormat function
- Implemented isTiptapJson helper for structure validation
- Created comprehensive test suite in `tests/utils/entry-format.test.ts` (13 tests)
- Verified no schema migration needed (existing text field supports both formats)
- All tests pass, no regressions, TypeScript compiles cleanly

**2026-01-15 - Code Review Fixes**
- **ADDED**: `validateTiptapStructure()` function (was missing, task marked [x] incorrectly)
- **ADDED**: Whitespace-only string test coverage (3 new test cases)
- **ADDED**: Large JSON performance test (1000 paragraphs, 50KB+)
- **ADDED**: `validateTiptapStructure` test suite (6 new test cases)
- **IMPROVED**: JSDoc documentation for `isTiptapJson` helper
- **RESULT**: 21 tests pass, 481 total suite tests pass, TypeScript compiles successfully

### Implementation Notes

**Design Decisions:**
- Used safe defaults: empty strings and parse errors return 'plain' (AC1, AC3)
- Type guards prevent runtime errors with unknown JSON structures (AC2)
- Comprehensive documentation for downstream stories (AC4)
- Helper function `isTiptapJson` encapsulates validation logic

**Acceptance Criteria Met:**
- **AC1**: Format detection correctly identifies 'plain' vs 'tiptap' ✅
- **AC2**: JSON validation handles malformed data gracefully ✅
- **AC3**: Backward compatibility verified (plain text detection works) ✅
- **AC4**: EntryFormat type exported, functions properly typed ✅

**No Schema Changes:**
- Confirmed existing `text` field (String/TEXT) supports both formats
- Plain text stored as-is
- Tiptap JSON serialized as string via JSON.stringify()
- Format detection determines how to parse on read

---

_Generated by BMad Create Story workflow - Ultimate context engine for flawless implementation_
