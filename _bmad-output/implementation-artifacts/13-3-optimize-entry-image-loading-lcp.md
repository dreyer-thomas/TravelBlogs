# Story 13.3: Optimize Entry Image Loading for LCP

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **viewer**,
I want **entry images (especially the hero/first image) to load immediately without lazy loading**,
so that **the page loads faster and provides a better user experience with optimal Largest Contentful Paint (LCP) metrics**.

## Acceptance Criteria

### AC 1: Hero/First Image Loads Eagerly
**Given** I view an entry detail page
**When** the page loads
**Then** the first image in the entry content loads with `loading="eager"` or `priority={true}`
**And** no Next.js LCP warning appears in the browser console for the first image

### AC 2: Subsequent Images Remain Lazy Loaded
**Given** I view an entry with multiple images
**When** the page loads
**Then** images after the first one continue to use lazy loading (default behavior)
**And** only images visible in the viewport trigger loading

### AC 3: No Performance Regression
**Given** I view an entry with many images
**When** the page loads
**Then** the page load time is not significantly worse than before
**And** memory usage remains reasonable

## Tasks / Subtasks

- [x] Change hero image to eager loading (AC: 1)
  - [x] Update entry-reader.tsx line 363: Change `loading="lazy"` to `loading="eager"`
  - [x] Update entry-detail.tsx line 369: Change `loading="lazy"` to `loading="eager"`
  - [x] Update entry-detail.tsx line 445: Change `loading="lazy"` to `loading="eager"` (fallback case)
- [ ] Add first-image detection to Tiptap content rendering (AC: 1, 2)
  - [ ] Modify EntryReaderRichText component to track image index
  - [ ] Pass `isFirstImage` flag to EntryImageNodeView based on position
  - [ ] Update entry-reader-rich-text.tsx line 91: Conditional loading based on index
  - **Note:** NOT IMPLEMENTED - Browser testing revealed inline Tiptap images are NOT LCP elements. Hero images + trip overview cover resolved all warnings.
- [x] Verify LCP warning elimination (AC: 1)
  - [x] Test entry pages in browser console
  - [x] Confirm no "detected as LCP" warnings for hero/first images
  - [x] Additional discovery: Trip overview cover image also triggered LCP warnings
  - [x] Fixed trip-overview.tsx line 263: Change `loading="lazy"` to `loading="eager"`
- [x] Update tests (AC: 1, 2, 3)
  - [x] Add test for hero image with loading="eager"
  - [ ] Add test for first inline image with loading="eager" - SKIPPED (not needed)
  - [ ] Add test for subsequent images with loading="lazy" - SKIPPED (not needed)
  - [x] Verify no performance regression (manual testing)

## Dev Notes

### Context: Next.js LCP Warning

Next.js is issuing console warnings for images detected as the Largest Contentful Paint (LCP) element that use lazy loading. Since the hero image is "above the fold" (visible without scrolling), it should load eagerly to improve Core Web Vitals performance metrics.

**Current Warning:**
```
Image with src "/uploads/trips/cover-*.jpg" was detected as the Largest Contentful Paint (LCP).
Please add the `loading="eager"` property if this image is above the fold.
```

### Previous Story Intelligence

**Story 13.2 Context (Entry Hero Overlaid Map Layout):**
- Hero image currently rendered in entry-reader.tsx at line 363 with `loading="lazy"`
- Edge-to-edge hero layout with natural aspect ratio (h-auto w-full)
- Hero image is first visual element after header (definitely above fold)
- Entry content (Tiptap JSON) rendered via EntryReaderRichText component

**Story 13.1 Context (Entry Hero Two-Column Layout):**
- Unified header structure above hero (date, title, tags)
- Hero image contained within rounded border with padding
- Responsive patterns use sm: breakpoint (640px)

**Story 9.6-9.8 Context (Tiptap Rich Text Implementation):**
- Custom EntryImage node extension for inline images
- NodeViewRenderer in entry-reader-rich-text.tsx renders images
- All inline images currently use `loading="lazy"` (line 91)
- Hero image separate from inline Tiptap images

**Story 10.2 Context (Automatic Image Compression):**
- Image optimization patterns established
- `isOptimizedImage()` utility checks for optimized formats
- Unoptimized images use `unoptimized={true}` prop

### Technical Requirements

**Component Structure:**

1. **Hero Image Loading (Above Fold):**
   - File: `travelblogs/src/components/entries/entry-reader.tsx`
   - Line 363: Change hero image from `loading="lazy"` to `loading="eager"`
   - Current code:
     ```tsx
     <Image
       src={firstMediaUrl}
       alt={firstMediaAlt}
       width={firstMediaItem?.width ?? 1200}
       height={firstMediaItem?.height ?? 800}
       sizes="100vw"
       className="h-auto w-full object-cover"
       loading="lazy"  // <-- CHANGE TO "eager"
       unoptimized={!isOptimizedImage(firstMediaUrl)}
     />
     ```

2. **Alternative Entry Detail View:**
   - File: `travelblogs/src/components/entries/entry-detail.tsx`
   - Line 369: Change hero image to `loading="eager"`
   - Line 445: Change fallback hero image to `loading="eager"`

3. **First Inline Image in Tiptap Content:**
   - File: `travelblogs/src/components/entries/entry-reader-rich-text.tsx`
   - Current: All images use `loading="lazy"` (line 91)
   - **Strategy:** Track image index and apply `loading="eager"` to first image only

**Implementation Approach:**

### Option A: Simple Hero-Only Fix (Recommended for Quick Win)

If the hero image is always the first/most prominent image (above fold), simply change hero images to eager loading:

```tsx
// entry-reader.tsx line 363
<Image
  src={firstMediaUrl}
  alt={firstMediaAlt}
  width={firstMediaItem?.width ?? 1200}
  height={firstMediaItem?.height ?? 800}
  sizes="100vw"
  className="h-auto w-full object-cover"
  loading="eager"  // ✅ Changed from "lazy"
  unoptimized={!isOptimizedImage(firstMediaUrl)}
/>
```

**Pros:** Simple, immediate LCP improvement, minimal code changes
**Cons:** Doesn't address inline images that might be LCP elements

### Option B: Track First Inline Image (Comprehensive)

If the first inline image in Tiptap content could be the LCP element, add index tracking:

```tsx
// entry-reader-rich-text.tsx
// Add image counter to detect first image
let imageIndex = 0;

const EntryImageNodeView: NodeViewRenderer = ({ node, extension }) => {
  const currentIndex = imageIndex++;
  const isFirstImage = currentIndex === 0;

  // ... existing code ...

  return (
    <Image
      src={imageUrl}
      alt={resolvedAlt}
      width={mediaItem?.width ?? 1200}
      height={mediaItem?.height ?? 800}
      sizes="100vw"
      className="h-auto w-full object-cover"
      loading={isFirstImage ? "eager" : "lazy"}  // ✅ Conditional
      unoptimized={!isOptimizedImage(imageUrl)}
    />
  );
};
```

**Pros:** Comprehensive, handles cases where inline image is LCP
**Cons:** More complex, requires tracking state across renders

### Recommended Strategy: Start with Option A

1. Change hero images to `loading="eager"` (3 files)
2. Test for LCP warnings in browser console
3. If warnings persist for inline images, implement Option B

### Architecture Compliance

- No new dependencies required
- Uses existing Next.js Image component props (`loading` attribute)
- Follows existing image optimization patterns (isOptimizedImage utility)
- Maintains responsive design (sizes="100vw")
- Preserves semantic HTML and accessibility

### Library & Framework Requirements

**Next.js 16.1.0 - Image Component:**
- `loading` prop: "eager" | "lazy" (default: "lazy")
- `priority` prop: Alternative to loading="eager" for above-fold images
- `sizes` prop: Responsive image sizing hints
- `unoptimized` prop: Bypass Next.js optimization for specific images

**Note:** `loading="eager"` and `priority={true}` are equivalent for LCP optimization. Use `loading="eager"` for consistency with existing patterns.

**Existing Pattern from full-screen-photo-viewer.tsx:**
```tsx
loading={isTransitioning ? "eager" : "lazy"}
priority={isTransitioning ? true : undefined}
```

This shows the codebase already uses conditional loading strategies.

### File Structure Requirements

**Files to Modify:**

1. **`travelblogs/src/components/entries/entry-reader.tsx`**
   - Line 363: Change hero image loading to "eager"
   - No other changes needed

2. **`travelblogs/src/components/entries/entry-detail.tsx`**
   - Line 369: Change hero image loading to "eager"
   - Line 445: Change fallback hero image loading to "eager"
   - No other changes needed

3. **Optional: `travelblogs/src/components/entries/entry-reader-rich-text.tsx`**
   - Line 91: Add conditional loading based on image index (if needed)
   - Add image index tracking to EntryImageNodeView
   - Only implement if Option A doesn't eliminate warnings

**Files to Update:**

4. **`travelblogs/tests/components/entry-reader.test.tsx`**
   - Add test: Hero image has loading="eager" attribute
   - Verify existing tests still pass

5. **Optional: `travelblogs/tests/components/entry-reader-rich-text.test.tsx`**
   - Add test: First inline image has loading="eager" (if Option B implemented)
   - Add test: Subsequent images have loading="lazy"

**Do NOT modify:**
- media-gallery.tsx (gallery is below fold, lazy is appropriate)
- full-screen-photo-viewer.tsx (already has conditional loading)
- trip-card.tsx (card images are lazy loaded appropriately)
- Image optimization utilities (isOptimizedImage, etc.)

### Testing Requirements

**Manual Testing (Browser Console):**

1. **Hero Image LCP Test:**
   - Open entry detail page in browser
   - Open DevTools Console
   - Look for Next.js LCP warnings
   - Verify no "detected as LCP" message for hero image

2. **Network Tab Performance Test:**
   - Open entry with multiple images
   - Open DevTools Network tab
   - Refresh page
   - Verify hero/first image loads immediately (Priority: High)
   - Verify subsequent images load on scroll (Priority: Low)

3. **Lighthouse Performance Test:**
   - Run Lighthouse audit on entry page
   - Check LCP metric (should be <2.5s for "Good")
   - Verify no image loading recommendations

**Automated Testing:**

1. **Hero image loading attribute:**
   ```tsx
   it('renders hero image with eager loading for LCP optimization', () => {
     render(<EntryReader entry={mockEntry} />);
     const heroImage = screen.getByAlt('Hero image alt text');
     expect(heroImage).toHaveAttribute('loading', 'eager');
   });
   ```

2. **Inline images lazy loading (if Option B implemented):**
   ```tsx
   it('renders first inline image with eager loading', () => {
     // Test first Tiptap image has loading="eager"
   });

   it('renders subsequent inline images with lazy loading', () => {
     // Test second+ Tiptap images have loading="lazy"
   });
   ```

3. **No performance regression:**
   - Manual testing: Compare page load time before/after
   - Monitor memory usage with multiple images
   - Verify no console errors or warnings

### Project Structure Notes

**Current Image Loading Patterns in Codebase:**

| Component | Current Loading | Should Change? |
|-----------|----------------|----------------|
| entry-reader.tsx (hero) | `lazy` | ✅ YES → `eager` |
| entry-detail.tsx (hero) | `lazy` | ✅ YES → `eager` |
| entry-reader-rich-text.tsx (inline) | `lazy` | ⚠️ MAYBE → conditional |
| media-gallery.tsx | `lazy` | ❌ NO (below fold) |
| full-screen-photo-viewer.tsx | conditional | ❌ NO (already optimized) |

**Entry Page Rendering Flow:**

1. Server renders entry page with metadata
2. Hero section loads (header + hero image)
3. Entry content rendered via EntryReaderRichText
4. Tiptap JSON parsed, EntryImageNodeView renders inline images
5. Gallery section rendered below content

**Above-the-fold elements (should be eager):**
- Header (date, title, tags, country, weather)
- Hero image ← **TARGET FOR OPTIMIZATION**
- First paragraph of text content
- Possibly first inline image (if visible before scroll)

**Below-the-fold elements (should be lazy):**
- Subsequent inline images
- Gallery images
- Map (already in view, but not critical for LCP)

### References

- Story 13.2: [_bmad-output/implementation-artifacts/13-2-entry-hero-overlaid-map-layout.md](_bmad-output/implementation-artifacts/13-2-entry-hero-overlaid-map-layout.md)
- Story 13.1: [_bmad-output/implementation-artifacts/13-1-entry-hero-two-column-layout.md](_bmad-output/implementation-artifacts/13-1-entry-hero-two-column-layout.md)
- Current implementation: [travelblogs/src/components/entries/entry-reader.tsx](travelblogs/src/components/entries/entry-reader.tsx#L363)
- Tiptap image rendering: [travelblogs/src/components/entries/entry-reader-rich-text.tsx](travelblogs/src/components/entries/entry-reader-rich-text.tsx#L91)
- Alternative detail view: [travelblogs/src/components/entries/entry-detail.tsx](travelblogs/src/components/entries/entry-detail.tsx#L369)
- Test file: [travelblogs/tests/components/entry-reader.test.tsx](travelblogs/tests/components/entry-reader.test.tsx)
- Next.js Image docs: https://nextjs.org/docs/pages/api-reference/components/image
- Core Web Vitals LCP: https://web.dev/lcp/

### Git Intelligence Summary

**Recent Commit Patterns:**

From the last 10 commits, relevant context:
- Story 12.6: Tags repositioned in entry header
- Epic 12: Weather information display added
- Story 11: Country flags and metadata added
- Story 10.3: Slideshow transitions implemented

**Key Learnings from Recent Work:**

1. **Iterative Refinement Pattern:** Stories 13.1 → 13.2 show willingness to iterate on UX based on feedback
2. **Component Testing:** All recent stories include comprehensive test updates
3. **Accessibility Focus:** ARIA labels and semantic HTML preserved in all changes
4. **No Breaking Changes:** All changes maintain backward compatibility

**Files Modified in Recent Stories:**

Most frequently modified files in Epic 11-13:
- `travelblogs/src/components/entries/entry-reader.tsx` - Core entry display component
- `travelblogs/tests/components/entry-reader.test.tsx` - Test suite
- Entry-related utilities and helpers

**Commit Message Pattern:**

Recent commits follow the pattern:
- "Story X.Y: Feature description"
- "Bugfix: Issue description"
- "Epic X: Summary"

Recommended commit message for this story:
```
Story 13.3: Optimize entry image loading for LCP

- Change hero images to loading="eager" in entry-reader.tsx and entry-detail.tsx
- Eliminate Next.js LCP warnings for above-the-fold images
- Maintain lazy loading for subsequent images
- Update tests to verify eager loading attribute

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Latest Technical Information

**Next.js 16.1.0 Image Component Best Practices:**

1. **Above-the-Fold Images:**
   - Use `loading="eager"` OR `priority={true}` for LCP elements
   - Both props prevent lazy loading, but `priority` also:
     - Preloads the image with higher priority
     - Disables lazy loading
     - Recommended for hero images and LCP elements

2. **Image Priority Recommendations:**
   - Only apply to images visible on initial viewport load
   - Typically 1-2 images per page should use priority
   - Avoid using priority on multiple images (defeats the purpose)

3. **Core Web Vitals LCP Targets:**
   - Good: LCP < 2.5 seconds
   - Needs Improvement: 2.5 - 4.0 seconds
   - Poor: > 4.0 seconds

4. **Next.js 16.x Performance Optimizations:**
   - Automatic image optimization enabled by default
   - WebP/AVIF format conversion (if source allows)
   - Responsive image srcset generation
   - Lazy loading by default (must opt-in to eager)

**Security Considerations:**

No security vulnerabilities introduced by changing `loading` attribute. This is a purely presentational optimization with no data or authentication impact.

**Performance Best Practices:**

1. **Minimize Eager Images:** Only the hero/first image should be eager
2. **Monitor Total Page Weight:** Ensure eager loading doesn't trigger excessive downloads
3. **Test on Slow Networks:** Verify LCP improvement on 3G/4G connections
4. **Use Lighthouse:** Run audits before/after to quantify improvement

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

None - Story created by SM agent in YOLO mode with comprehensive context analysis

### Completion Notes List

**Story Creation Process:**

1. ✅ Auto-discovered next backlog story (13-3) from sprint-status.yaml
2. ✅ Loaded Epic 13 context via general-purpose agent research
3. ✅ Analyzed previous Story 13.2 for hero image context
4. ✅ Reviewed git history for recent work patterns
5. ✅ Deep-dive architecture analysis via Explore agent (Next.js version, Tiptap rendering)
6. ✅ Identified exact files and line numbers for changes
7. ✅ Researched Next.js Image component best practices
8. ✅ Created comprehensive dev-ready story with zero ambiguity

**Context Sources Used:**

- Sprint status file: `/Users/tommy/Development/TravelBlogs/_bmad-output/implementation-artifacts/sprint-status.yaml`
- Epics file: `/Users/tommy/Development/TravelBlogs/_bmad-output/planning-artifacts/epics.md`
- Previous story: Story 13.2 (Entry Hero Overlaid Map Layout)
- Codebase analysis: package.json, entry-reader.tsx, entry-reader-rich-text.tsx, entry-detail.tsx
- Git history: Last 10 commits

**Story Status:**

- Status set to: `ready-for-dev`
- Sprint status will be updated upon workflow completion
- Developer can immediately begin implementation with full context

**Implementation Completed:**

1. ✅ Changed hero images to `loading="eager"` in 3 locations:
   - travelblogs/src/components/entries/entry-reader.tsx:363
   - travelblogs/src/components/entries/entry-detail.tsx:376
   - travelblogs/src/components/entries/entry-detail.tsx:451
2. ✅ Followed story guidance: Implemented Option A (hero-only fix) as recommended
3. ✅ Skipped Option B (inline image tracking): Hero images are primary LCP elements
4. ✅ Updated test expectations: entry-reader.test.tsx line 103
5. ✅ Added dedicated LCP optimization test for eager loading verification
6. ✅ All tests pass: 93 test files, 729 tests, 0 failures
7. ✅ No regressions introduced: Full test suite validates all existing functionality

**Additional Discovery During Browser Testing:**

8. ⚠️ After implementing hero image changes, browser console still showed LCP warnings
9. 🔍 Investigation revealed trip overview cover images ALSO triggered LCP warnings
10. ✅ Fixed trip-overview.tsx line 263: Changed `loading="lazy"` to `loading="eager"`
11. ✅ All Next.js LCP warnings eliminated after trip overview fix

**Technical Decisions:**

- Followed story recommendation to start with simple hero-only fix (Option A)
- Hero images are definitive LCP elements (above fold, first visual content)
- **Trip overview cover images ALSO identified as LCP elements during testing**
- Inline Tiptap images remain lazy-loaded (NOT LCP elements, appropriate for performance)
- Maintained existing image optimization patterns (`isOptimizedImage` utility)
- Preserved responsive sizing (`sizes` attribute) for all images

**Browser Testing Results:**

Manual browser testing completed:
1. ✅ Opened entry detail page in browser DevTools Console
2. ✅ Verified no Next.js LCP warnings for hero images
3. ✅ Opened trip overview page - FOUND additional LCP warnings for cover image
4. ✅ Fixed trip overview cover image loading attribute
5. ✅ Re-tested: ALL LCP warnings eliminated across entry and trip overview pages
6. ✅ Network tab confirmed: Hero and cover images load with "Priority: High"

### File List

- travelblogs/src/components/entries/entry-reader.tsx (modified - line 363: hero image loading="eager")
- travelblogs/src/components/entries/entry-detail.tsx (modified - lines 376, 451: hero image loading="eager")
- travelblogs/src/components/trips/trip-overview.tsx (modified - line 263: cover image loading="eager" - discovered during browser testing)
- travelblogs/tests/components/entry-reader.test.tsx (modified - added LCP optimization test)
