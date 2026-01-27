# Story 13.6: Preload Slideshow Images for Smooth Playback

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **viewer**,
I want **slideshow images to be preloaded before the slideshow starts**,
so that **transitions are smooth without delays or blank screens, especially on slower network connections**.

## Acceptance Criteria

### AC 1: Preload All Slideshow Images Before Starting
**Given** I open a slideshow with multiple images
**When** the slideshow initializes
**Then** all images in the slideshow are preloaded before playback begins
**And** a loading indicator is displayed during preload
**And** the slideshow only starts after all images are loaded
**And** the progress bar does not start until images are ready

### AC 2: Show Loading State During Preload
**Given** slideshow images are being preloaded
**When** I view the slideshow interface
**Then** I see a loading indicator (spinner or progress bar)
**And** the indicator shows preload progress (e.g., "Loading 3 of 8 images")
**And** slideshow controls are disabled until preload completes

### AC 3: Handle Preload Failures Gracefully
**Given** one or more images fail to load during preload
**When** the preload timeout expires or an error occurs
**Then** the slideshow starts with successfully loaded images
**And** failed images are skipped or show a placeholder
**And** an error is logged but not shown to the user
**And** slideshow continues to function with available images

### AC 4: Smooth Transitions After First Loop
**Given** the slideshow has completed one full loop
**When** the slideshow repeats from the beginning
**Then** all transitions are instant (images already cached)
**And** no loading delays occur on subsequent loops

### AC 5: Maintain Existing Slideshow Functionality
**Given** images are preloaded
**When** I interact with slideshow controls (play/pause, next/prev)
**Then** all existing functionality works as before
**And** crossfade transitions still work smoothly
**And** keyboard navigation still works
**And** progress indicators still update correctly

## Tasks / Subtasks

- [ ] Add preload state management to FullScreenPhotoViewer (AC: 1, 2)
  - [ ] Add `isPreloading` state (useState hook)
  - [ ] Add `preloadProgress` state (number of loaded / total images)
  - [ ] Add `preloadedImages` Set to track successfully loaded URLs
- [ ] Implement image preloading logic (AC: 1, 3)
  - [ ] Create `preloadImages()` function on component mount when mode="slideshow"
  - [ ] Use `new Image()` pattern or Next.js Image preload for each slideshow image
  - [ ] Track load success/failure per image
  - [ ] Update `preloadProgress` as images load
  - [ ] Implement 30-second timeout for total preload operation
  - [ ] Mark preloading complete when all images loaded or timeout expires
- [ ] Add loading UI during preload (AC: 2)
  - [ ] Display centered loading spinner while `isPreloading === true`
  - [ ] Show progress text: "Loading 3 of 8 images" using `preloadProgress`
  - [ ] Position over black background (existing slideshow container)
  - [ ] Add ARIA live region for accessibility
- [ ] Prevent slideshow start until preload complete (AC: 1)
  - [ ] Disable auto-advance timer while `isPreloading === true`
  - [ ] Don't start progress bar animation until preload complete
  - [ ] Keep controls (play/pause, next/prev) disabled during preload
- [ ] Handle preload failures gracefully (AC: 3)
  - [ ] Log errors for failed images (console.error with image URL)
  - [ ] Continue preloading remaining images after individual failures
  - [ ] Filter out failed images from slideshow rotation OR show placeholder
  - [ ] Start slideshow with available images after timeout
- [ ] Update tests (AC: 1, 2, 3, 4, 5)
  - [ ] Add test: Preload initiates when slideshow opens with mode="slideshow"
  - [ ] Add test: Loading indicator displays during preload
  - [ ] Add test: Progress text updates as images load
  - [ ] Add test: Slideshow starts after preload completes
  - [ ] Add test: Auto-advance timer disabled during preload
  - [ ] Add test: Failed images don't block slideshow start
  - [ ] Add test: Existing controls work after preload
  - [ ] Verify no regressions in existing slideshow tests

## Dev Notes

### Problem Description (from User)

**Production Issue on Slow Networks:**
- Slideshow opens, progress bar starts immediately
- First image not visible for several seconds (loading delay)
- Progress bar advances but image hasn't appeared yet
- Transition triggers, but next image also not loaded
- Blank screen with running progress bar, delayed image appearances
- After first complete loop, slideshow works smoothly (images cached)

**Root Cause:**
The slideshow timer starts immediately without waiting for images to load. On slower connections (production server), images load asynchronously while the timer runs, causing timing mismatches.

**Solution:**
Preload all slideshow images before starting the timer and progress bar.

### Previous Story Intelligence

**Story 10.3 Context (Slideshow Crossfade Transitions):**
- Current slideshow implementation in `full-screen-photo-viewer.tsx`
- Crossfade transitions work via opacity animation between previous/current layers
- Progress bar uses segmented design (one segment per image)
- Auto-advance timer: 5 seconds per image (line 329-345)
- Timer depends on: `isOpen`, `isSlideshow`, `images.length`, `isPaused`, `isVideoPlaying`
- Progress animation uses CSS keyframes with `animation-play-state` control
- Video duration dynamically adjusts progress bar timing

**Story 2.8 Context (Media Slideshow Viewer):**
- FullScreenPhotoViewer component supports `mode` prop: "viewer" | "slideshow"
- Slideshow mode enables auto-advance and progress indicators
- Keyboard controls: Space (play/pause), Arrow keys (next/prev), Escape (close)
- Touch gestures: Swipe left/right to navigate
- Progress indicators positioned at top (lines 560-609)

**Key Learnings:**
- Timer logic at lines 325-345 must be gated by preload completion
- Progress bar animation (line 593-602) should not start until preload done
- Existing `isOpen` and `isSlideshow` checks are good gates for adding preload check
- Crossfade transitions use `loading="eager"` during transition (line 646) - this pattern can be adapted for preload
- Component already handles complex state management - preload state fits naturally

### Technical Requirements

**Component Structure:**
- File: `travelblogs/src/components/entries/full-screen-photo-viewer.tsx`
- Add preload state and logic to existing FullScreenPhotoViewer component
- Preload should only run when `mode === "slideshow"`
- Don't preload in viewer mode (not needed, images load on demand)

**Preload Implementation Strategy:**

```tsx
// New state variables (add near line 66-72)
const [isPreloading, setIsPreloading] = useState(false);
const [preloadProgress, setPreloadProgress] = useState({ loaded: 0, total: 0 });
const [preloadComplete, setPreloadComplete] = useState(false);

// Preload effect (add after line 152)
useEffect(() => {
  if (!isOpen || !isSlideshow || images.length === 0) {
    return;
  }

  // Reset preload state when slideshow opens
  setIsPreloading(true);
  setPreloadComplete(false);
  setPreloadProgress({ loaded: 0, total: images.length });

  const imageUrls = images
    .filter(img => {
      const type = img.mediaType ?? getMediaTypeFromUrl(img.url);
      return type === 'image'; // Only preload images, not videos
    })
    .map(img => img.url);

  if (imageUrls.length === 0) {
    // No images to preload (all videos)
    setIsPreloading(false);
    setPreloadComplete(true);
    return;
  }

  const timeout = window.setTimeout(() => {
    // Timeout after 30 seconds - start slideshow with whatever loaded
    console.warn('Slideshow preload timeout - starting with loaded images');
    setIsPreloading(false);
    setPreloadComplete(true);
  }, 30000);

  let loaded = 0;

  const promises = imageUrls.map(url => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        setPreloadProgress({ loaded, total: imageUrls.length });
        resolve();
      };
      img.onerror = (error) => {
        console.error(`Failed to preload image: ${url}`, error);
        loaded++;
        setPreloadProgress({ loaded, total: imageUrls.length });
        resolve(); // Resolve anyway to not block other images
      };
      img.src = url;
    });
  });

  Promise.all(promises).then(() => {
    window.clearTimeout(timeout);
    setIsPreloading(false);
    setPreloadComplete(true);
  });

  return () => {
    window.clearTimeout(timeout);
  };
}, [isOpen, isSlideshow, images]);
```

**Gate Auto-Advance Timer:**

Update the auto-advance effect (lines 325-345) to include preload check:

```tsx
useEffect(() => {
  // Add preloadComplete check here
  if (!isOpen || !isSlideshow || images.length <= 1 || isPaused || isVideoPlaying || isPreloading || !preloadComplete) {
    return;
  }
  // ... rest of timer logic
}, [
  activeIndex,
  images.length,
  isOpen,
  isPaused,
  isSlideshow,
  isVideoPlaying,
  isPreloading,  // Add to dependencies
  preloadComplete,  // Add to dependencies
  updateActiveIndex,
]);
```

**Gate Progress Bar Animation:**

Update progress bar rendering (lines 593-602) to check preload:

```tsx
{isActive ? (
  <div
    key={progressKey}
    className="h-full w-full"
    style={{
      backgroundColor: "#E5E5E5",
      transformOrigin: "left",
      transform: "scaleX(0)",
      animation: preloadComplete
        ? `slideshowProgressFill ${isActiveVideo && videoDuration ? videoDuration : 5}s linear forwards`
        : 'none',  // Don't animate until preload done
      animationPlayState: isPaused ? "paused" : "running",
    }}
  />
) : null}
```

**Loading UI:**

Add loading indicator before main viewer content (around line 611):

```tsx
{isPreloading ? (
  <div
    className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4"
    role="status"
    aria-live="polite"
  >
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-600 border-t-white" />
    <p className="text-lg text-white">
      {t("entries.slideshowLoading", {
        loaded: preloadProgress.loaded,
        total: preloadProgress.total
      })}
    </p>
  </div>
) : null}

<div className="relative z-10 flex flex-1 items-center justify-center">
  {/* Existing viewer content */}
</div>
```

**Translation Keys:**

Add to translation files (en.json and de.json):

```json
{
  "entries": {
    "slideshowLoading": "Loading {{loaded}} of {{total}} images..."
  }
}
```

### Architecture Compliance

- Component files use `kebab-case.tsx` naming ✓
- All user-facing strings must be translatable ✓ (add translation keys)
- No new dependencies required ✓ (use native Image API)
- Follow existing responsive design patterns ✓
- Preserve semantic HTML and ARIA attributes ✓ (add role="status" to loading)
- Use existing state management patterns (useState hooks) ✓

### Library & Framework Requirements

**Browser Image API:**
- `new Image()` constructor for preloading
- `img.onload` event for success tracking
- `img.onerror` event for failure handling
- `img.src` assignment triggers load

**React Hooks:**
- `useState` for preload state management
- `useEffect` for preload orchestration on mount
- `useCallback` (if needed for memoized preload logic)

**Next.js Image Component:**
- Already using conditional `loading="eager"` for transitions (line 646)
- Pattern established: use eager loading for critical images
- `priority` prop alternative for above-fold images

**Existing Patterns in Component:**
- Timer management with `setTimeout` and cleanup (line 329-336)
- State-gated effects (checking `isOpen`, `isSlideshow`, etc.)
- Progress tracking with segment states ("complete", "active", "upcoming")

### File Structure Requirements

**Files to Modify:**

1. **`travelblogs/src/components/entries/full-screen-photo-viewer.tsx`**
   - Add preload state variables (near line 66-72)
   - Add preload effect (after line 152)
   - Update auto-advance timer effect (lines 325-345) - add preloadComplete check
   - Update progress bar animation (line 593-602) - gate on preloadComplete
   - Add loading UI (around line 611)
   - Add isPreloading and preloadComplete to dependency arrays

2. **`travelblogs/src/locales/en.json`**
   - Add `entries.slideshowLoading` translation key

3. **`travelblogs/src/locales/de.json`**
   - Add `entries.slideshowLoading` translation key (German translation)

**Files to Update:**

4. **`travelblogs/tests/components/full-screen-photo-viewer.test.tsx`**
   - Add test: Preload initiates when slideshow opens
   - Add test: Loading indicator displays during preload
   - Add test: Progress text shows correct loaded/total count
   - Add test: Slideshow auto-advance disabled during preload
   - Add test: Progress bar animation doesn't start until preload complete
   - Add test: Failed image preload doesn't block slideshow start
   - Add test: Existing controls work after preload
   - Verify existing 35+ tests still pass

**Do NOT modify:**
- media-gallery.tsx (different component, no slideshow mode)
- entry-reader.tsx (only opens slideshow, doesn't implement it)
- Image optimization utilities

### Testing Requirements

**Manual Testing (Browser):**

1. **Slow Network Simulation:**
   - Open DevTools → Network tab → Throttling: "Slow 3G"
   - Open entry with slideshow (multiple images)
   - Verify loading indicator appears immediately
   - Verify progress text updates as images load
   - Verify slideshow doesn't start until loading completes
   - Verify progress bar doesn't animate during preload

2. **Fast Network Test:**
   - Disable throttling (Fast 3G or No throttling)
   - Open slideshow
   - Verify loading indicator appears briefly
   - Verify smooth transition to slideshow playback
   - Verify first transition is smooth (no blank screen)

3. **Second Loop Test:**
   - Let slideshow complete one full loop
   - Verify second loop has instant transitions (images cached)
   - Verify no delays on subsequent loops

4. **Failed Image Test:**
   - Modify one image URL to invalid path (test environment)
   - Open slideshow
   - Verify slideshow starts after timeout with valid images
   - Verify console shows error for failed image
   - Verify slideshow functions with remaining images

**Automated Testing:**

```tsx
describe('Slideshow Image Preloading', () => {
  it('initiates preload when slideshow opens', async () => {
    render(<FullScreenPhotoViewer
      images={mockImages}
      initialIndex={0}
      isOpen={true}
      onClose={jest.fn()}
      mode="slideshow"
    />);

    // Verify loading indicator appears
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('displays loading progress during preload', async () => {
    render(<FullScreenPhotoViewer
      images={mockImages}
      initialIndex={0}
      isOpen={true}
      onClose={jest.fn()}
      mode="slideshow"
    />);

    // Progress text should show format "Loading X of Y images"
    expect(screen.getByText(/Loading \d+ of \d+ images/i)).toBeInTheDocument();
  });

  it('disables auto-advance during preload', async () => {
    jest.useFakeTimers();
    render(<FullScreenPhotoViewer
      images={mockImages}
      initialIndex={0}
      isOpen={true}
      onClose={jest.fn()}
      mode="slideshow"
    />);

    // Advance timer by 5 seconds (normal auto-advance interval)
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Should still be on first image (preload not complete)
    // Test implementation depends on how we expose current index
  });

  it('starts slideshow after preload completes', async () => {
    render(<FullScreenPhotoViewer
      images={mockImages}
      initialIndex={0}
      isOpen={true}
      onClose={jest.fn()}
      mode="slideshow"
    />);

    // Wait for preload to complete
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Loading indicator should be gone
    expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();

    // Progress bar should be visible and animating
    expect(screen.getByTestId('slideshow-progress')).toBeInTheDocument();
  });

  it('handles failed image preload gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const imagesWithInvalid = [
      ...mockImages,
      { url: '/invalid-image.jpg', alt: 'Invalid' }
    ];

    render(<FullScreenPhotoViewer
      images={imagesWithInvalid}
      initialIndex={0}
      isOpen={true}
      onClose={jest.fn()}
      mode="slideshow"
    />);

    // Wait for preload (including failure handling)
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    }, { timeout: 35000 }); // Allow for 30s timeout + buffer

    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to preload image'),
      expect.anything()
    );

    // Slideshow should start anyway
    expect(screen.getByTestId('slideshow-progress')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('does not preload in viewer mode', () => {
    render(<FullScreenPhotoViewer
      images={mockImages}
      initialIndex={0}
      isOpen={true}
      onClose={jest.fn()}
      mode="viewer"
    />);

    // Loading indicator should not appear in viewer mode
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
  });

  it('maintains existing slideshow controls after preload', async () => {
    const onClose = jest.fn();
    render(<FullScreenPhotoViewer
      images={mockImages}
      initialIndex={0}
      isOpen={true}
      onClose={onClose}
      mode="slideshow"
    />);

    // Wait for preload
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Test keyboard controls
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();

    // Test play/pause
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    // Verify pause state toggled (implementation-specific)
  });
});
```

### Project Structure Notes

**Current FullScreenPhotoViewer Structure:**
- Lines 1-53: Imports, types, and utility functions
- Lines 54-98: Component definition, state initialization
- Lines 100-225: Event handlers and transition logic
- Lines 227-364: Effects for keyboard, auto-advance, progress
- Lines 366-521: Conditional rendering checks and gesture handlers
- Lines 522-731: JSX rendering (portal, progress bar, image layers, controls)

**Integration Points for Preload:**

1. **State Declaration (after line 72):**
   - Add `isPreloading`, `preloadProgress`, `preloadComplete` states

2. **Preload Effect (after line 152):**
   - Add useEffect to preload images on `isOpen && isSlideshow`
   - Track load progress and handle failures

3. **Auto-Advance Timer (line 325):**
   - Add `isPreloading` and `preloadComplete` to condition check
   - Add to dependency array

4. **Progress Key Effect (line 347):**
   - Might need to delay setting progressKey until preload done
   - Or gate progress bar animation in rendering

5. **Loading UI (before line 611):**
   - Render loading spinner + progress text when `isPreloading === true`
   - Position over main viewer area

6. **Progress Bar Animation (line 593):**
   - Gate animation on `preloadComplete`

**Existing Patterns to Follow:**

- Timer cleanup pattern (line 329-336): Use similar for preload timeout
- State-gated effects: Add preload checks to existing isOpen/isSlideshow gates
- Progress tracking: Use similar pattern to slideshow segment states
- Accessibility: Add `role="status"` and `aria-live="polite"` to loading indicator

### References

- Current implementation: [travelblogs/src/components/entries/full-screen-photo-viewer.tsx](travelblogs/src/components/entries/full-screen-photo-viewer.tsx)
- Test file: [travelblogs/tests/components/full-screen-photo-viewer.test.tsx](travelblogs/tests/components/full-screen-photo-viewer.test.tsx)
- Story 10.3: [_bmad-output/implementation-artifacts/10-3-slideshow-crossfade-transitions.md](_bmad-output/implementation-artifacts/10-3-slideshow-crossfade-transitions.md)
- Story 2.8: Media Slideshow Viewer (original slideshow implementation)
- Project context: [_bmad-output/project-context.md](_bmad-output/project-context.md)
- Translation files: [travelblogs/src/locales/en.json](travelblogs/src/locales/en.json), [travelblogs/src/locales/de.json](travelblogs/src/locales/de.json)

### Git Intelligence Summary

**Recent Commit Patterns:**

From the last 5 commits:
- `45d79ca` - Story 13.3: Optimize Image loading (LCP performance)
- `289e91f` - Bugfix: Editor makes selected text bold
- `b10a358` - Story 12.6: Replace tags in story
- `97f8a25` - Bugfix: delete story had hidden dialog
- `b252bd4` - Story 12: Bugfix 1

**Key Learnings:**

1. **Performance Focus in Epic 13:** Story 13.3 addressed image loading performance (LCP), this story continues performance theme
2. **Bugfix Pattern:** Team addresses bugs immediately when found (between stories)
3. **Iterative Improvements:** Recent commits show continuous polish on existing features
4. **Component Testing:** All stories include test updates

**Commit Message Pattern:**

Expected commit message for this story:

```
Story 13.6: Preload slideshow images for smooth playback

- Add image preloading logic to FullScreenPhotoViewer when mode="slideshow"
- Display loading indicator with progress during preload
- Gate auto-advance timer and progress bar until preload completes
- Handle preload failures gracefully with timeout
- Add translations for loading state (en/de)
- Update tests to verify preload behavior

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Latest Technical Information

**Browser Image Preloading Best Practices (2026):**

1. **Native Image() Constructor:**
   - Most reliable method for preloading
   - Works across all browsers
   - Respects browser cache
   - `new Image()` → `img.src = url` → `img.onload` / `img.onerror`

2. **Next.js Image Preloading:**
   - `priority={true}` prop preloads images
   - Generates `<link rel="preload">` in HTML head
   - Best for above-fold images
   - May not be ideal for slideshow (many images, loaded on-demand)

3. **Preload Strategy Recommendations:**
   - Preload only when needed (slideshow mode, not viewer mode)
   - Set reasonable timeout (30 seconds recommended)
   - Track progress for UX feedback
   - Handle failures gracefully (don't block on single failure)
   - Leverage browser cache for subsequent loops

4. **Performance Considerations:**
   - Preloading 5-10 images: ~2-5 seconds on 3G (acceptable)
   - Preloading 20+ images: May exceed timeout on slow networks
   - Consider progressive preload: Start slideshow with first 3 loaded, continue preloading rest
   - **Decision:** Simple all-or-nothing approach with timeout for MVP

5. **Memory Considerations:**
   - Browser caches loaded images automatically
   - No manual cache management needed
   - Image() objects can be garbage collected after load
   - Modern browsers handle memory efficiently

**Security Considerations:**

- Image preloading uses same-origin or CORS policies
- User-uploaded images from `/uploads/` are same-origin ✓
- No XSS risk (only loading images, not executing scripts)
- No authentication bypass (images loaded in user context)

**Accessibility Best Practices:**

- Use `role="status"` for loading indicator
- Use `aria-live="polite"` for progress updates
- Ensure loading text is screen-reader accessible
- Don't announce individual image loads (too noisy)
- Single progress message: "Loading 3 of 8 images"

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

Story created by SM agent (Bob) in YOLO mode with comprehensive context analysis.

### Completion Notes List

**Story Creation Process:**

1. ✅ User described production issue: Slideshow delays on slow network
2. ✅ Added Story 13.6 to epics.md (Epic 13: Performance & UX Polish)
3. ✅ Updated sprint-status.yaml with new story (backlog status)
4. ✅ Loaded project context and identified slideshow component
5. ✅ Analyzed full-screen-photo-viewer.tsx implementation (732 lines)
6. ✅ Identified exact integration points for preload logic
7. ✅ Reviewed Story 10.3 context (crossfade transitions)
8. ✅ Reviewed Story 2.8 context (original slideshow)
9. ✅ Researched browser image preloading best practices
10. ✅ Created comprehensive dev-ready story with zero ambiguity

**Context Sources Used:**

- Sprint status: `/Users/tommy/Development/TravelBlogs/_bmad-output/implementation-artifacts/sprint-status.yaml`
- Epics file: `/Users/tommy/Development/TravelBlogs/_bmad-output/planning-artifacts/epics.md`
- Slideshow component: `/Users/tommy/Development/TravelBlogs/travelblogs/src/components/entries/full-screen-photo-viewer.tsx`
- Project context: `/Users/tommy/Development/TravelBlogs/_bmad-output/project-context.md`
- Previous stories: 10-3 (crossfade), 13-3 (LCP optimization)
- Git history: Last 5 commits

**Technical Analysis Highlights:**

- Slideshow auto-advance timer at lines 325-345 (5 second interval)
- Progress bar animation at lines 593-602 (CSS keyframe)
- Existing state management patterns identified
- Timer cleanup pattern available for reuse
- Translation pattern established (en.json, de.json)
- Test patterns established (35+ existing tests)

**Key Design Decisions:**

1. **Simple all-or-nothing preload** (not progressive) - easier to implement, clear UX
2. **30-second timeout** - balances patience with user experience
3. **Only preload in slideshow mode** - viewer mode doesn't need it
4. **Only preload images, skip videos** - videos use different loading strategy
5. **Use native Image() API** - most reliable, no dependencies
6. **Single loading indicator** - simpler than per-image feedback
7. **Log failures, don't show to user** - graceful degradation

**Story Status:**

- Status: `ready-for-dev`
- Sprint status will show: `backlog` (until developer picks it up)
- Developer can immediately begin implementation with full context
- All integration points clearly identified with line numbers
- Test patterns provided for comprehensive coverage

### File List

- travelblogs/src/components/entries/full-screen-photo-viewer.tsx (TO MODIFY - preload logic)
- travelblogs/src/locales/en.json (TO MODIFY - add translation key)
- travelblogs/src/locales/de.json (TO MODIFY - add translation key)
- travelblogs/tests/components/full-screen-photo-viewer.test.tsx (TO UPDATE - add preload tests)
