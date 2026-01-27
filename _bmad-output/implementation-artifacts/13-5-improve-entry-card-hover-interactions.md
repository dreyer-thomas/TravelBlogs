# Story 13.5: Improve Entry Card Hover Interactions

Status: backlog

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
