# Story 13.5: Improve Entry Card Hover Interactions

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **viewer**,
I want **entry cards to have clearer hover feedback without redundant text labels**,
so that **it's immediately obvious when I can click on a card, and the interface feels more modern and intuitive**.

## Context

Currently, entry cards on trip overview pages have two issues:

1. **Redundant text labels**: Cards show "LESEN" (READ) or "OPEN" text to the right side, which is unnecessary since the entire card is clickable
2. **Weak hover feedback**: The hover state only shows a subtle border thickness change, making it hard to see which card is being hovered

This affects both:
- Shared trip view: `https://blogs.dreyer-travels.de/trips/share/{shareSlug}`
- Authenticated trip view: `https://blogs.dreyer-travels.de/trips/{tripId}`

## Acceptance Criteria

### AC 1: Remove "LESEN"/"READ" Text from Shared View
**Given** I view a shared trip overview page
**When** I see the entry cards
**Then** there is NO "LESEN" or "READ" text displayed on the right side of the cards
**And** the entire card is still clickable as a link

### AC 2: Remove "OPEN" Text from Authenticated View
**Given** I view an authenticated trip overview page
**When** I see the entry cards
**Then** there is NO "OPEN" text displayed on the right side of the cards
**And** the entire card is still clickable as a link

### AC 3: Enhanced Hover State with Background Color
**Given** I view any trip overview page (shared or authenticated)
**When** I hover my mouse over an entry card
**Then** the card background changes to a clearly visible color (e.g., light gray or subtle accent color)
**And** the border change is preserved or enhanced
**And** the hover effect is smooth with a transition

### AC 4: Consistent Hover Behavior Across Views
**Given** I view both shared and authenticated trip overview pages
**When** I hover over entry cards on each page
**Then** the hover behavior (background color, transition timing) is identical
**And** all cards respond consistently to hover

### AC 5: Accessibility Maintained
**Given** I use keyboard navigation
**When** I tab through entry cards
**Then** focused cards also show the same visual feedback as hovered cards
**And** screen readers still announce the cards as clickable links

## Implementation Notes

### Technical Approach

1. **Remove Text Labels**
   - Find the components rendering "LESEN"/"READ" and "OPEN" text
   - Remove or conditionally hide these text elements
   - Ensure card layout adjusts properly without the text

2. **Enhanced Hover Styles**
   - Add background color change on hover (e.g., `hover:bg-gray-100` or `hover:bg-gray-50`)
   - Keep or enhance existing border change
   - Add smooth transition: `transition-colors duration-200`
   - Apply same hover styles to `:focus-visible` for keyboard navigation

3. **Suggested CSS Classes** (Tailwind)
   ```tsx
   // Current (approximate):
   className="border border-gray-300 hover:border-gray-400"

   // Enhanced:
   className="border border-gray-300 hover:border-gray-400 hover:bg-gray-50
              transition-colors duration-200 focus-visible:bg-gray-50"
   ```

### Files to Review

**Shared Trip View:**
- `travelblogs/src/app/shared/[shareSlug]/page.tsx` - Shared trip overview
- `travelblogs/src/components/trips/shared-trip-view.tsx` - Shared trip component (if exists)
- Look for entry card rendering with "LESEN"/"READ" text

**Authenticated Trip View:**
- `travelblogs/src/app/trips/[tripId]/page.tsx` - Authenticated trip overview
- `travelblogs/src/components/trips/trip-overview.tsx` - Trip overview component (if exists)
- Look for entry card rendering with "OPEN" text

**Shared Component (if applicable):**
- `travelblogs/src/components/entries/entry-card.tsx` - Reusable entry card component
- Check if one card component is used for both views

### Design Considerations

- **Background color**: Use a subtle color like `bg-gray-50` or `bg-gray-100` for hover
- **Transition**: Keep it smooth with `duration-200` or `duration-150`
- **Cursor**: Ensure `cursor-pointer` is set on the entire card
- **Touch devices**: Hover effects won't show on mobile, ensure cards are still clearly tappable

### Testing Checklist

**Visual Testing:**
- [ ] Shared trip view: No "LESEN"/"READ" text visible
- [ ] Authenticated trip view: No "OPEN" text visible
- [ ] Hover on card: Background changes to visible color
- [ ] Hover transition is smooth
- [ ] Consistent hover behavior across both views

**Keyboard Navigation:**
- [ ] Tab through cards: Focus state matches hover state
- [ ] Enter key: Navigates to entry detail page
- [ ] Focus ring visible for accessibility

**Responsive Testing:**
- [ ] Desktop: Hover effects work properly
- [ ] Tablet: Touch interaction works (tap to navigate)
- [ ] Mobile: Cards are clearly tappable without hover

## Definition of Done

- [ ] "LESEN"/"READ" text removed from shared view cards
- [ ] "OPEN" text removed from authenticated view cards
- [ ] Cards have enhanced hover state with background color change
- [ ] Hover behavior is consistent across shared and authenticated views
- [ ] Keyboard focus state matches hover state
- [ ] Smooth transition applied to hover effects
- [ ] Tested on desktop, tablet, and mobile
- [ ] Code reviewed and approved

## Dependencies

None - this is a standalone UI improvement.

## Estimated Effort

**Small** - Primarily CSS/styling changes with minimal component logic updates.

## Design Notes

**Current State:**
- Subtle border change on hover
- Redundant "LESEN"/"OPEN" text labels

**Desired State:**
- No text labels (cleaner design)
- Clear background color change on hover (e.g., white → light gray)
- Smooth transition for professional feel
- Consistent across all views

## Dev Notes

### Current Implementation Analysis

**File:** `travelblogs/src/components/trips/trip-overview.tsx` (476 lines)

**Entry Card Rendering:** Lines 369-467

**Text Label Location:** Lines 433-435
```tsx
<span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1F6F78]">
  {t('trips.read')}
</span>
```

This renders "READ" (English) or "LESEN" (German) on every entry card.

**Current Hover Styling:** Line 440
```tsx
cardClassName = "... hover:border-[#1F6F78]/40 hover:shadow-sm"
```

Only applies border color change and shadow on hover - **no background change**.

**Card Structure:**
```tsx
// Lines 374-436 (simplified)
const content = (
  <>
    <div className="..."> {/* Preview image */} </div>
    <div className="..."> {/* Entry metadata: date, title, tags */} </div>
    <span> {t('trips.read')} </span> {/* ← REMOVE THIS */}
  </>
);

const cardClassName = isSelected
  ? "... border-[#1F6F78] ..."  // Selected state
  : "... hover:border-[#1F6F78]/40 hover:shadow-sm";  // ← ENHANCE THIS
```

### Implementation Strategy

**Step 1: Remove Text Label (Lines 433-435)**

Delete these 3 lines entirely:
```tsx
<span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1F6F78]">
  {t('trips.read')}
</span>
```

**Step 2: Enhance Hover Styling (Line 440)**

Current:
```tsx
"flex flex-wrap items-center gap-4 rounded-2xl border border-black/10 bg-white p-4 transition hover:border-[#1F6F78]/40 hover:shadow-sm"
```

Enhanced:
```tsx
"flex flex-wrap items-center gap-4 rounded-2xl border border-black/10 bg-white p-4 transition-colors duration-200 hover:border-[#1F6F78]/40 hover:bg-[#FBF7F1]/50 hover:shadow-sm focus-visible:border-[#1F6F78]/40 focus-visible:bg-[#FBF7F1]/50"
```

Changes:
- Add `transition-colors duration-200` for smooth hover
- Add `hover:bg-[#FBF7F1]/50` for background color change (#FBF7F1 is page background)
- Add `focus-visible:` states for keyboard navigation accessibility

**Background Color Choice:**
- `#FBF7F1` is the existing page background color (already used throughout)
- `/50` opacity makes it subtle (50% opacity)
- Matches design system color palette

### File Structure Requirements

**Files to Modify:**

1. **`travelblogs/src/components/trips/trip-overview.tsx`**
   - Line 433-435: DELETE text label span
   - Line 440: UPDATE hover className with enhanced styles
   - No other changes required

**Files to Verify:**

2. **No other components need changes**
   - Entry cards only rendered in trip-overview.tsx
   - Both shared and authenticated views use the same component
   - One change fixes both views ✓

**Do NOT modify:**
- Translation files (trips.read key can stay, just unused)
- Entry reader components
- Other card components

### Testing Requirements

**Manual Testing:**

1. **Text Label Removal:**
   - Navigate to `/trips/{tripId}` (authenticated)
   - Verify NO "OPEN" text on right side of cards
   - Navigate to `/trips/share/{token}` (shared)
   - Verify NO "LESEN"/"READ" text on right side of cards

2. **Enhanced Hover State:**
   - Hover over entry card
   - Verify background color changes to light beige/cream
   - Verify border color changes (existing behavior preserved)
   - Verify transition is smooth (no instant snap)

3. **Keyboard Navigation:**
   - Tab through entry cards using keyboard
   - Verify focused card shows same visual feedback as hover
   - Verify focus ring visible for accessibility

4. **Responsive:**
   - Test on desktop, tablet, mobile
   - Verify cards remain tappable on touch devices
   - Verify hover effects work on desktop only

**Automated Testing:**

No new tests required - existing tests should pass:
- `tests/components/trip-overview.test.tsx`
- Verify cards still render with correct structure
- Verify links still work

### Architecture Compliance

- Tailwind CSS for all styling ✓
- No new dependencies ✓
- Preserve semantic HTML ✓
- Maintain accessibility (ARIA attributes, focus states) ✓
- Follow existing color palette (#FBF7F1 page background) ✓

### Library & Framework Requirements

**Tailwind CSS:**
- `hover:bg-[#FBF7F1]/50` - Background color on hover
- `transition-colors` - Smooth color transition
- `duration-200` - 200ms transition duration
- `focus-visible:` - Keyboard focus styles

**Next.js Link Component:**
- Already in use for entry cards
- Hover/focus styles apply to Link component

### Previous Story Intelligence

**Story 8.2 Context (Show Tags on Trip Overview Entry Cards):**
- Entry cards already render tags (lines 419-431)
- Card structure established with preview image, metadata, tags

**Story 3.3 Context (Trip Overview with Latest Entries):**
- Trip overview component created
- Entry card layout finalized
- Hover border change added initially

**Key Learnings:**
- Trip overview is mature component with established patterns
- Color palette uses #FBF7F1 (page background), #1F6F78 (accent teal)
- Existing hover states use `hover:border-[#1F6F78]/40`
- Card structure uses flex layout with gap-4

### Git Intelligence Summary

**Recent Commits:**
- 45d79ca - Story 13.3: Optimize Image loading
- 289e91f - Bugfix: Editor makes selected text bold
- b10a358 - Story 12.6: Replace tags in story

**Commit Message Pattern:**

Expected commit for this story:
```
Story 13.5: Improve entry card hover interactions

- Remove "READ"/"LESEN" text label from entry cards (line 433-435)
- Add background color change on hover (#FBF7F1/50)
- Add smooth transition-colors animation (200ms)
- Add focus-visible states for keyboard navigation
- Cleaner, more modern card interaction design

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Latest Technical Information

**Tailwind CSS Best Practices (2026):**

1. **Hover States:**
   - Use `hover:` prefix for desktop hover interactions
   - Combine with `transition-colors` for smooth animations
   - Duration 150-200ms recommended for color changes

2. **Focus States:**
   - Use `focus-visible:` instead of `focus:` (avoids mouse click focus ring)
   - Mirror hover styles for consistency
   - Ensure keyboard navigation is accessible

3. **Color Opacity:**
   - Use `/50` suffix for 50% opacity
   - Maintains color consistency with design system
   - Lighter than solid color for subtle effect

4. **Transition Performance:**
   - `transition-colors` is performant (GPU-accelerated)
   - Avoid `transition-all` (can cause janky animations)
   - 200ms duration is sweet spot for perceived smoothness

**No security implications** - purely visual/CSS changes.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

Story updated by SM agent (Bob) to add comprehensive dev context and mark ready-for-dev.

### Completion Notes List

**Story Update Process:**

1. ✅ Story file already existed (created previously)
2. ✅ Found trip-overview.tsx component (476 lines)
3. ✅ Located text label at lines 433-435: `{t('trips.read')}`
4. ✅ Analyzed current hover styling at line 440
5. ✅ Identified exact changes needed (delete 3 lines, update 1 line)
6. ✅ Confirmed color palette: #FBF7F1 (page background)
7. ✅ Added comprehensive dev context with line numbers
8. ✅ Updated status from `backlog` to `ready-for-dev`

**Context Sources:**

- Trip overview component: `travelblogs/src/components/trips/trip-overview.tsx` (476 lines analyzed)
- Entry card rendering: Lines 369-467
- Text label: Lines 433-435
- Hover styling: Line 440
- Project color palette: #FBF7F1, #1F6F78

**Key Findings:**

- **Simple implementation:** Delete 3 lines + update 1 className
- Text label uses translation key: `t('trips.read')`
- Current hover only changes border color and shadow
- Need to add background color hover for better UX
- Same component used for both shared and authenticated views

**Story Status:**

- Status: `ready-for-dev` ✓
- Sprint status will be updated upon workflow completion
- Developer can implement in ~5-10 minutes
- Estimated effort: Small (CSS changes only)

### File List

- travelblogs/src/components/trips/trip-overview.tsx (TO MODIFY - delete lines 433-435, update line 440)
