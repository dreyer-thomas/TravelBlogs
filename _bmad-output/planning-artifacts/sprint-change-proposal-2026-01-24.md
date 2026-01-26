# Sprint Change Proposal - Entry Hero Layout Refinement

**Date:** 2026-01-24
**Project:** TravelBlogs
**Submitted by:** Bob (Scrum Master)
**Change Scope:** Minor - Direct Implementation

---

## 1. Issue Summary

### Problem Statement

Story 13.1 implemented a two-column equal-split layout (hero image | map) that doesn't match the user's design preference. The user wants the hero image to be prominent and large with the map as a smaller overlay, similar to the previous overlay pattern but with refined positioning for country and weather information.

### Context

The issue was discovered by the user (Tommy) when viewing an entry at:
`http://localhost:3000/trips/share/__k5r3BNhk8xyu5duyP-F_JKzGQpIWQ31VjsXqHFmeM/entries/cmjpoh2m70003us2fad1zptr6`

After Story 13.1 was marked complete, the user reviewed the implementation and determined that the two-column layout reduces the visual impact of the hero image, which is a core element of the "media-first" design philosophy.

### Evidence

- User feedback: "I am not so happy with the new layout of this page"
- Specific request: "I would like to have the hero image larger again but still in the area and the map as overlay smaller on the lower right side as we had it previously"
- Design intent: Hero image should be prominent and immersive, with metadata as contextual overlays rather than equal-weight columns

---

## 2. Impact Analysis

### Epic Impact

- **Epic 13**: Not formally documented in epics.md
- **Story 13.1**: Complete, remains as-is (design exploration/experiment)
- **Story 13.2**: NEW - will implement refined overlaid hero layout
- **Conclusion**: No epic-level changes required; treat as iterative design refinement

### Story Impact

**Current Stories:**
- Story 13.1 (done) - Two-column layout experiment
  - Stays in codebase history
  - Unified header structure (valuable work to preserve)

**New Stories:**
- Story 13.2 (backlog → ready-for-dev) - Overlaid hero layout
  - Builds on 13.1's unified header
  - Implements overlaid map, country, weather positioning

**Future Stories:**
- No impact on future stories

### Artifact Conflicts

**PRD (prd.md):**
- Status: ✅ No changes needed
- Reasoning: PRD specifies "media-first entry pages" (FR17) but doesn't prescribe specific layout patterns

**Architecture (architecture.md):**
- Status: ✅ No changes needed
- Reasoning: Architecture mentions "media-first layouts" as UX principle but doesn't define component-level patterns

**UX Design Specification (ux-design-specification.md):**
- Status: ⚠️ Update required
- Section: Entry Reader component (lines 399-407)
- Change: Update "Anatomy" to specify overlaid hero pattern with map/country/weather overlay positions
- Impact: Documentation clarity only

**Other Artifacts:**
- Status: ✅ No changes needed
- Reasoning: No deployment, infrastructure, testing strategy, or CI/CD impacts

### Technical Impact

**Code Changes:**
- File: `travelblogs/src/components/entries/entry-reader.tsx` (lines 275-427)
- Scope: Modify hero section layout from grid to overlaid positioning
- Risk: Low - reverting to previously-working overlay pattern with refinements

**Test Changes:**
- File: `travelblogs/tests/components/entry-reader.test.tsx`
- Scope: Update test expectations for overlay positioning
- Risk: Low - standard test maintenance

---

## 3. Recommended Approach

### Selected Path: Option 1 - Direct Adjustment via New Story 13.2

**Approach:**
Create new Story 13.2 to implement overlaid hero layout with refined positioning specifications.

**Rationale:**

1. **Clean history tracking**: Story 13.1 remains as design exploration; Story 13.2 is production implementation
2. **Low effort**: Single component modification, builds on 13.1's unified header structure
3. **Low risk**: Reverting to overlaid pattern (previously working) with user-specified refinements
4. **No scope impact**: Isolated visual change, no PRD/Architecture/MVP impact
5. **Quick turnaround**: Can be implemented immediately with clear specifications

**Effort Estimate:** Low (4-6 hours: story creation + implementation + testing + UX spec update)

**Risk Assessment:** Low
- Technical risk: Minimal - well-understood layout patterns
- User acceptance risk: Minimal - directly addresses user's stated preference
- Timeline risk: None - isolated change, no dependencies

**Trade-offs:**
- Story 13.1 becomes "design experiment" rather than final implementation
- Additional story in sprint backlog (minimal overhead)

**Alternatives Considered:**

**Option 2: Rollback Story 13.1**
- Rejected: Loses valuable unified header work from 13.1
- Same implementation effort as Option 1 but worse history tracking

**Option 3: PRD/MVP Review**
- Rejected: Not applicable - MVP scope unaffected, this is UX refinement only

---

## 4. Detailed Change Proposals

### Change 1: Create Story 13.2 File

**Action:** Create new story file
**File:** `_bmad-output/implementation-artifacts/13-2-entry-hero-overlaid-map-layout.md`

**Story Summary:**
- **User Story**: As a viewer, I want the entry detail page hero to display a large hero image with map and metadata as overlays, so that the hero image is prominent and immersive while keeping location and weather context visible.

**Key Acceptance Criteria:**
1. Hero image is large and prominent, contained within hero area with padding/margins
2. Map renders as small overlay on lower right corner (approx 200-250px width)
3. Country flag + name overlay on upper left corner of map
4. Weather icon + temperature overlay on upper right corner of hero
5. Preserve unified header from Story 13.1 (date, title, tags above hero)
6. Mobile: stacked layout; Desktop: overlaid layout

**Justification:** Clear specification prevents ambiguity and ensures user's design vision is implemented correctly.

---

### Change 2: Update Sprint Status Tracking

**Action:** Add Story 13.2 to sprint tracking
**File:** `_bmad-output/implementation-artifacts/sprint-status.yaml`

**OLD:**
```yaml
  epic-13: in-progress
  13-1-entry-hero-two-column-layout: done
  epic-13-retrospective: optional
```

**NEW:**
```yaml
  epic-13: in-progress
  13-1-entry-hero-two-column-layout: done
  13-2-entry-hero-overlaid-map-layout: backlog
  epic-13-retrospective: optional
```

**Justification:** Maintains accurate sprint tracking, enables workflow automation for story creation and development.

---

### Change 3: Update UX Design Specification

**Action:** Clarify Entry Reader component anatomy
**File:** `_bmad-output/ux-design-specification.md`
**Section:** Entry Reader component (lines 399-407)

**OLD:**
```markdown
**Anatomy:** Title, meta, media gallery, text body, map snippet.
```

**NEW:**
```markdown
**Anatomy:** Header (date, title, tags) above hero; large hero image with padding; map overlay (lower right corner); country overlay (upper left of map); weather overlay (upper right of hero); text body; media gallery.
```

**Justification:** Documents the canonical Entry Reader layout pattern for future reference and consistency across similar components.

---

## 5. Implementation Handoff

### Change Scope Classification

**Scope:** Minor - Direct implementation by development team

**Characteristics:**
- Single component modification
- No architectural changes
- No PRD scope impact
- Isolated visual/layout change
- Clear user requirements

### Handoff Recipients and Responsibilities

**Scrum Master (Bob / Tommy):**
- Create Story 13.2 file with detailed acceptance criteria
- Update sprint-status.yaml to track Story 13.2
- Transition Story 13.2 from backlog → ready-for-dev
- Coordinate with Dev agent for implementation

**Dev Agent:**
- Implement Story 13.2 per acceptance criteria
- Modify `entry-reader.tsx` for overlaid layout
- Update `entry-reader.test.tsx` with new expectations
- Update UX spec Entry Reader section
- Run tests and validate implementation
- Mark Story 13.2 as complete

### Success Criteria

**Implementation Complete When:**
1. ✅ Story 13.2 file created and marked ready-for-dev
2. ✅ Hero image is large with padding, map overlaid on lower right
3. ✅ Country label overlaid on map upper left
4. ✅ Weather overlaid on hero upper right
5. ✅ Mobile responsive (stacked layout)
6. ✅ All tests pass
7. ✅ UX spec updated with refined anatomy
8. ✅ User (Tommy) reviews and approves implementation

### Timeline and Dependencies

**Timeline:** Immediate implementation (1-2 hours dev time)
**Dependencies:** None - can proceed immediately
**Blockers:** None identified

---

## 6. Conclusion

This sprint change addresses a design preference mismatch discovered after Story 13.1 completion. By creating Story 13.2, we maintain clean history while implementing the user's preferred overlaid hero layout. The change is low-risk, low-effort, and has no impact on PRD, Architecture, or MVP scope.

**Recommended Action:** Approve proposal and proceed with Story 13.2 creation and implementation.

---

**Proposal Status:** Ready for approval
**Next Steps:** User approval → SM creates Story 13.2 → Dev implements → User validates
