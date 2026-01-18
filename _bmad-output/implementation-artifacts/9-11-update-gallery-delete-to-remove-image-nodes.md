# Story 9.11: Update Gallery Delete to Remove Image Nodes

Status: done
Epic: 9 - Rich Text Editor for Blog Entries

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want images deleted from the gallery to be removed from the entry text,
so that broken image references do not appear in my entries.

## Acceptance Criteria

1. **Given** an entry contains image nodes referencing a specific entryMediaId
   **When** I delete that image from the gallery
   **Then** the system scans the entry text (Tiptap JSON) and removes all image nodes with that entryMediaId
2. **Given** the entry text is updated after image deletion
   **When** I view the entry
   **Then** the deleted images no longer appear inline
3. **Given** an entry is still in plain text format
   **When** I delete an image from the gallery
   **Then** inline references matching `![Image](url)` are removed from the plain text
4. **Given** multiple entries reference the same gallery image
   **When** I delete that image
   **Then** all entries are updated to remove the image nodes

## Tasks / Subtasks

- [x] Add a helper to remove entryImage nodes from Tiptap JSON by entryMediaId (AC: 1, 4)
  - [x] Parse JSON safely and filter matching nodes; preserve all other content
  - [x] Re-serialize JSON without altering unrelated nodes or attributes
- [x] Update gallery delete flow to scrub entry text for removed media (AC: 1, 2, 4)
  - [x] When an EntryMedia record is deleted, update all affected entries that reference its entryMediaId
  - [x] Ensure entry viewer shows updated text with images removed
- [x] Handle plain text entries on delete (AC: 3, 4)
  - [x] Remove matching `![...](url)` references using existing helper(s)
- [x] Tests (AC: 1-4)
  - [x] Add/extend utils tests for Tiptap JSON removal helper
  - [x] Add/extend edit/delete flow tests to verify entry text update
  - [x] Add/extend tests for plain-text inline image removal

## Dev Notes

### Developer Context

- Entry text can be plain text or Tiptap JSON; use `detectEntryFormat` to branch the removal logic.
- Inline images in rich text use the `entryImage` node with `entryMediaId` attributes (Story 9.6–9.9).
- Plain text inline image removal can reuse `removeInlineImageByUrl` in `travelblogs/src/utils/entry-content.ts`.

### Technical Requirements

- For Tiptap JSON, remove *all* `entryImage` nodes whose `entryMediaId` matches the deleted media ID.
- For plain text, remove *all* `![...](url)` references that match the deleted media URL.
- When an EntryMedia item is deleted, update every entry that references it (not just the current entry).
- Preserve existing behavior for `entryImage` nodes, `entryMediaId` mapping, and format detection.
- Do not add new schema fields or change existing API response shapes.

### Architecture Compliance

- App Router only; keep REST routes under `src/app/api` and plural endpoints.
- Responses must stay wrapped in `{ data, error }` with `{ error: { code, message } }`.
- Keep utilities in `src/utils/` (do not introduce `lib/`).

### Library / Framework Requirements

- Use existing dependencies only (Tiptap/React/Next.js versions are already pinned).
- Preserve the custom `entryImage` node name and attributes; do not rename or re-structure the JSON schema.

### File Structure Requirements

- Likely touch points:
  - `travelblogs/src/app/api/entries/[id]/route.ts` (entry update + media removal)
  - `travelblogs/src/components/entries/edit-entry-form.tsx` (gallery delete trigger)
  - `travelblogs/src/utils/tiptap-image-helpers.ts` (add removal helper for JSON)
  - `travelblogs/src/utils/entry-content.ts` (plain text inline image removal helper)
  - Tests in `travelblogs/tests/components/` and `travelblogs/tests/utils/`

### Testing Requirements

- Tests live in central `tests/` (no co-located tests).
- Add coverage for JSON removal helper, plain text removal, and delete flow behavior.
- Use the required API error format in test expectations.

### Previous Story Intelligence

- Story 9.8: Entry viewer renders Tiptap JSON with `entryImage` nodes.
- Story 9.9: Plain text converter maps inline image URLs to `entryMediaId`.
- Story 9.10: Format detection governs view vs edit conversion; avoid re-conversion when already JSON.

### Git Intelligence Summary

- Recent commits touched `edit-entry-form.tsx`, `entry-reader.tsx`, and `entry-format.ts` for rich text flow.
- Utilities for Tiptap images live in `travelblogs/src/utils/tiptap-image-helpers.ts` and `travelblogs/src/utils/tiptap-entry-image-extension.ts`.

### Latest Tech Information

- No external research performed; adhere to pinned versions in project context and architecture docs.

### Project Context Reference

- All user-facing UI strings must be translatable and provided in both English and German.
- Use Next.js Image for media with lazy loading by default.
- Keep JSON and API params in `camelCase` and avoid `snake_case`.

### References

- [Source: _bmad-output/implementation-artifacts/epics.md#Story 9.11]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: _bmad-output/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: travelblogs/src/utils/entry-content.ts]
- [Source: travelblogs/src/utils/tiptap-image-helpers.ts]
- [Source: travelblogs/src/components/entries/edit-entry-form.tsx]

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

- Tests: `npm test`

### Completion Notes List

- Added Tiptap JSON scrubber for entryImage nodes by entryMediaId.
- Scrubbed deleted gallery media from entry text in update flow for Tiptap and plain text entries.
- Updated entry patch tests to cover JSON and plain-text removal behavior.

**Code Review Fixes Applied:**
- Added error logging to `removeEntryImageNodesFromJson` for corrupted JSON debugging
- Optimized multi-entry search to scope by tripId instead of full table scan (performance)
- Added optimistic locking to multi-entry updates using `updateMany` with text match condition (race condition fix)
- Enhanced test coverage: added GET endpoint verification for AC #2, corrupted JSON handling test, document structure integrity verification
- Added comprehensive test for duplicate entryMediaId removal to verify all matching nodes are removed

### File List

- travelblogs/src/utils/tiptap-image-helpers.ts
- travelblogs/src/app/api/entries/[id]/route.ts
- travelblogs/tests/utils/tiptap-image-helpers.test.ts
- travelblogs/tests/api/entries/update-entry.test.ts
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Story Completion Status

Status set to: done
Completion note: Entry media deletion scrubs inline images across entries. All ACs implemented and verified. Code review completed with 8 high-severity and 3 medium-severity issues fixed (performance optimization, race condition handling, error logging, enhanced test coverage).
