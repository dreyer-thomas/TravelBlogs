# Story 12.6: Reposition Tags Below Title

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **viewer**,
I want **to see entry tags displayed below the title instead of in the hero image**,
so that **tags are easier to read and don't obscure the hero media**.

## Acceptance Criteria

### AC 1: Remove Tags from Hero Image Overlay
**Given** I view an entry with tags (signed-in or shared view)
**When** the page loads
**Then** tags are NOT displayed overlaid on the hero image at top-right

### AC 2: Display Tags Below Title in Non-Shared View
**Given** I view an entry with tags in signed-in view
**When** the page loads
**Then** tags appear below the entry title (h1)
**And** tags are displayed as a horizontal list with flex-wrap
**And** tags wrap to multiple lines if needed
**And** each tag uses the existing chip/badge styling

### AC 3: Display Tags Below Title in Shared View Overlay
**Given** I view an entry with tags via shared link
**When** the page loads
**Then** tags appear below the entry title inside the gray overlay box
**And** tags are displayed as a horizontal list with flex-wrap
**And** tags wrap to multiple lines if needed
**And** the gray overlay box remains ≤ 50vh in height

### AC 4: Maintain Accessibility
**Given** tags are repositioned
**When** I interact with the page using screen reader or keyboard
**Then** tags remain accessible with proper ARIA labels
**And** tag order and semantics are preserved

## Tasks / Subtasks

- [x] Remove hero tag overlay from entry-reader.tsx (AC: 1)
  - [x] Delete tag rendering section at lines 397-416 in `travelblogs/src/components/entries/entry-reader.tsx`
- [x] Add tags below title in non-shared header (AC: 2)
  - [x] Insert tag list after h1 at line 299 in entry-reader.tsx
  - [x] Use horizontal flex layout with wrap (`flex flex-wrap gap-2`)
  - [x] Preserve existing chip styling from lines 405-412
- [x] Add tags below title in shared overlay (AC: 3)
  - [x] Insert tag list after h1 at line 383 inside gray box overlay
  - [x] Use horizontal flex layout with wrap
  - [x] Test gray box stays ≤ 50vh with multiple tags
- [x] Update tests (AC: 1, 2, 3, 4)
  - [x] Update `travelblogs/tests/components/entry-reader.test.tsx` tag positioning assertions
  - [x] Verify tag accessibility attributes preserved

## Dev Notes

### Previous Story Intelligence

**Story 12.5 Context (Auto-Fetch Weather):**
- Weather display added to entry hero at lines 290-295 (non-shared) and 373-378 (shared overlay)
- Weather integrated into `showLocationMeta` section with country flags
- Non-blocking weather fetching pattern established in API handlers
- Tests updated for weather field assertions

**Story 8.3 Context (Show Tags on Hero):**
- Original tag overlay implemented at lines 397-416
- Uses `bg-black/60 backdrop-blur-sm` for contrast on hero images
- Tag chips styled with `bg-[#F2ECE3] px-3 py-1 text-xs font-semibold text-[#2D2A26]`
- Tags positioned `absolute right-0 top-0 z-30 px-4 pt-4 sm:px-6 sm:pt-6`
- Accessibility: `role="list"` with `aria-label={t("entries.tags")}`
- Max-width constraints: `max-w-[18rem]` mobile, `max-w-[22rem]` desktop
- Tag truncation with `max-w-[12rem]` mobile, `max-w-[16rem]` desktop per chip

**Key Learnings:**
- Hero overlay architecture uses absolute positioning with z-index layering
- Two distinct layouts: non-shared header (lines 277-301) vs shared overlay (lines 352-396)
- Accessibility patterns require `role`, `aria-label`, and semantic HTML
- Responsive breakpoints: `sm:` prefix for tablet/desktop
- Color tokens: `#F2ECE3` (ivory chip bg), `#2D2A26` (charcoal text), `text-white` (shared overlay)

### Technical Requirements

**Component Structure:**
- Entry reader component: `travelblogs/src/components/entries/entry-reader.tsx`
- Two layout modes:
  1. **Non-shared view (lines 277-301):** Title in `<header>` with white background, outside hero image
  2. **Shared view (lines 352-396):** Title inside gray overlay box (`bg-black/45 backdrop-blur-sm`) on hero image

**Tag Positioning Strategy:**
- **Remove:** Lines 397-416 (current hero overlay tags)
- **Non-shared:** Insert after h1 at line 299 (after title, before `</header>`)
- **Shared overlay:** Insert after h1 at line 383 (inside gray box, before `</div>` closing overlay)

**Styling Requirements:**
- Use existing chip classes: `bg-[#F2ECE3] px-3 py-1 text-xs font-semibold text-[#2D2A26] rounded-full`
- Horizontal layout with wrapping: `flex flex-wrap gap-2`
- Align with existing responsive patterns (`sm:` breakpoints)
- Maintain accessibility: `role="list"`, individual tags with `role="listitem"`

### Architecture Compliance

- Component files use `kebab-case.tsx` naming
- All user-facing strings must be translatable (use existing `t("entries.tags")`)
- No new dependencies required
- Follow existing responsive design patterns with Tailwind
- Preserve semantic HTML and ARIA attributes

### Library & Framework Requirements

- Next.js Image already in use for media
- React component patterns established
- Tailwind CSS for all styling
- TypeScript for type safety
- Existing i18n translation keys in use

### File Structure Requirements

**Files to Modify:**
- `travelblogs/src/components/entries/entry-reader.tsx` (lines 299, 383, remove 397-416)
- `travelblogs/tests/components/entry-reader.test.tsx` (update tag position assertions)

**Do NOT modify:**
- Entry reader API handlers (no data changes needed)
- Entry reader mapper (tag data already available via `entry.tags`)
- Other entry components

### Testing Requirements

**Update test file:** `travelblogs/tests/components/entry-reader.test.tsx`

**Test scenarios:**
1. Non-shared view with tags: verify tags appear below title, NOT on hero
2. Shared view with tags: verify tags appear below title inside gray overlay, NOT at top-right
3. Entries without tags: verify no tag section renders
4. Accessibility: verify `role="list"` and `aria-label` preserved
5. Responsive layout: verify wrapping behavior with many tags (simulate 8-10 tags)
6. Gray overlay constraint: verify shared overlay height ≤ 50vh with multiple tags

**Mock pattern:** Use existing test setup with `entry.tags` array

### Project Structure Notes

**Current entry-reader.tsx structure:**
- Line 1-50: Imports and props interface
- Line 277-301: Non-shared header section (white background, before hero)
- Line 304-418: Hero image section with overlays
- Line 352-396: Shared overlay box (gray, inside hero)
- Line 397-416: **Tag overlay (TO REMOVE)**
- Line 420+: Entry text and media sections

**Layout hierarchy:**
```
Non-shared view:
<header> (white bg, above hero)
  Date, Location/Weather, Title (h1 at 299)
  → INSERT TAGS HERE (after h1)
</header>

Shared view:
<section> (hero image container)
  <div> (gray overlay box at 352-396)
    Date, Location/Weather, Title (h1 at 383)
    → INSERT TAGS HERE (after h1, inside overlay)
  </div>
  [Hero image map]
  [OLD TAG OVERLAY 397-416] ← REMOVE THIS
</section>
```

### References

- Epic 12 Story 12.6 in `_bmad-output/planning-artifacts/epics.md` (lines 1692-1719)
- Current implementation: `travelblogs/src/components/entries/entry-reader.tsx` (lines 397-416)
- Story 8.3 original tag implementation: `_bmad-output/implementation-artifacts/8-3-show-tags-on-entry-reader-hero.md`
- Story 12.5 weather integration: `_bmad-output/implementation-artifacts/12-5-auto-fetch-weather-for-new-entries.md`
- Project rules and conventions: `_bmad-output/project-context.md`
- Test file: `travelblogs/tests/components/entry-reader.test.tsx`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

<!-- Links to debug sessions if needed -->

### Completion Notes List

- Removed hero tag overlay from lines 397-416 (AC 1)
- Added tags below title in non-shared header with horizontal flex layout (AC 2)
- Added tags below title in shared overlay with horizontal flex layout (AC 3)
- Updated test assertions to verify new tag positioning (AC 4)
- All 30 entry-reader tests passed successfully
- Preserved accessibility attributes (role="list", aria-label, role="listitem")
- Maintained existing chip styling with bg-[#F2ECE3] and proper responsive breakpoints

**Code Review Fixes Applied:**
- Added max-h-[50vh] overflow-y-auto to shared overlay to enforce AC3 height constraint (entry-reader.tsx:377)
- Added pointer-events-auto to scrollable overlay div for accessibility
- Added per-chip max-width constraints: max-w-[12rem] mobile, sm:max-w-[16rem] desktop for proper truncation
- Added responsive gap: gap-2 sm:gap-3 for consistent spacing across breakpoints
- Added comprehensive tests: gray box max-height validation, multiple tags wrapping (10 tags), improved test assertions checking classes not computed styles
- Fixed 5 HIGH severity issues, 3 MEDIUM severity issues identified in adversarial code review

### File List

- travelblogs/src/components/entries/entry-reader.tsx
- travelblogs/tests/components/entry-reader.test.tsx
- _bmad-output/implementation-artifacts/12-6-reposition-tags-below-title.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
