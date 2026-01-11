# Sprint Change Proposal
**Date:** 2026-01-11
**Project:** TravelBlogs
**Prepared by:** Bob (Scrum Master)

---

## 1. Issue Summary

### Problem Statement
Security vulnerability in shared link functionality - unauthenticated users accessing trips via share link can navigate to the all-trips list (`/trips`) through a visible "Back to Trips" link, allowing them to see all trips in the system despite not being authenticated.

### Discovery Context
- **When:** Discovered during manual testing of share link functionality
- **How:** User created a share link and opened it in unauthenticated context
- **Share URL Format:** `http://localhost:3000/trips/share/{token}`

### Evidence
- Share link page (`/src/app/trips/share/[token]/page.tsx:102`) passes `backToTripsHref="/trips"` prop to `TripOverview` component
- This renders a visible "← Back to Trips" link for unauthenticated users
- While middleware protects the `/trips` route (will redirect to sign-in), the link should not be visible at all for shared users
- Authenticated users viewing their own trips correctly see this link

---

## 2. Impact Analysis

### Epic Impact
**Status:** No formal epics defined for this project
**Assessment:** N/A - This is a bug fix in existing functionality

### Story Impact
**Current Stories:** No formal story tracking in place
**New Story Required:** Yes - Create bug fix story for share link navigation leak

### Artifact Conflicts

#### Code/Architecture
**Affected Files:**
- `/src/app/trips/share/[token]/page.tsx` (line 102) - PRIMARY FIX
- `/src/components/trips/trip-overview.tsx` (lines 35, 146-153) - No changes needed (already handles optional prop)
- `/src/middleware.ts` (lines 5-24, 47-49) - No changes needed (already protects routes)

**Architecture Status:**
- ✅ Backend security is intact - middleware correctly blocks unauthenticated access to `/trips`
- ❌ Frontend UI leaks navigation that shouldn't be visible
- ✅ Map page correctly stays in shared context (`/trips/share/{token}/map`)

#### Testing Impact
**Test Files to Update:**
- `/tests/components/shared-trip-page.test.tsx` - Verify no back link rendered
- Add E2E test: Share link users cannot see or access trip list navigation

---

## 3. Recommended Approach

### Selected Path: **Direct Adjustment**

**What we're doing:**
Remove `backToTripsHref` prop from the shared trip page component instantiation. The `TripOverview` component already handles this as an optional prop - when undefined, it simply doesn't render the back link.

**Why this approach:**
- **Minimal change:** Single line removal, zero architectural changes
- **Low risk:** Isolated change, optional prop already designed for this use case
- **Quick implementation:** Can be done and tested in < 30 minutes
- **No side effects:** Authenticated users unaffected (different route, prop intact)
- **Maintainable:** Follows existing pattern (map page uses same approach)

**Effort Estimate:** LOW
**Risk Level:** LOW
**Timeline Impact:** None - Can be implemented immediately

---

## 4. Detailed Change Proposals

### Change #1: Remove Back Navigation from Shared Trip Page

**File:** `/src/app/trips/share/[token]/page.tsx`
**Line:** 102
**Change Type:** Remove prop

**BEFORE:**
```tsx
return (
  <SharedTripGuard token={token}>
    <TripOverview
      trip={data.trip}
      entries={data.entries}
      entryLinkBase={`/trips/share/${token}/entries`}
      backToTripsHref="/trips"
      mapHref={`/trips/share/${token}/map`}
    />
  </SharedTripGuard>
);
```

**AFTER:**
```tsx
return (
  <SharedTripGuard token={token}>
    <TripOverview
      trip={data.trip}
      entries={data.entries}
      entryLinkBase={`/trips/share/${token}/entries`}
      mapHref={`/trips/share/${token}/map`}
    />
  </SharedTripGuard>
);
```

**Technical Notes:**
- `TripOverview` component type definition (line 35): `backToTripsHref?: string` (optional)
- Rendering logic (lines 146-153): Conditionally renders only when prop is defined
- No breaking changes - component designed to handle missing prop
- Pattern already used in `/src/app/trips/share/[token]/map/page.tsx` (line 112) which correctly keeps users in shared context

---

## 5. Implementation Handoff

### Change Scope Classification: **MINOR**

This is a simple bug fix that can be implemented directly by the development team without backlog reorganization or architectural review.

### Handoff: Development Team

**Story to Create:**
```markdown
**Story:** Fix Share Link Navigation Leak

**Type:** Bug Fix

**Description:**
Unauthenticated users accessing trips via share link can see a "Back to Trips"
link that navigates to the authenticated trips list. While middleware correctly
blocks access, the link should not be visible at all for shared users.

**Acceptance Criteria:**
- [ ] Share link users do NOT see "Back to Trips" link
- [ ] Authenticated users viewing their own trips STILL see "Back to Trips" link
- [ ] Share link users can still navigate to map view (`/trips/share/{token}/map`)
- [ ] Map page correctly returns to shared trip view
- [ ] Middleware continues to block unauthenticated access to `/trips`
- [ ] Unit test: Verify TripOverview does not render back link when prop omitted
- [ ] E2E test: Share link navigation isolated to shared context only

**Technical Implementation:**
1. Edit `/src/app/trips/share/[token]/page.tsx` line 102
2. Remove `backToTripsHref="/trips"` prop from TripOverview component
3. Verify authenticated trip overview still has prop at `/src/app/trips/[tripId]/overview/page.tsx:126`
4. Update/add tests as specified in acceptance criteria
5. Manual verification: Open share link in incognito, confirm no "Back to Trips" link

**Files Changed:**
- `/src/app/trips/share/[token]/page.tsx` (remove 1 line)
- `/tests/components/shared-trip-page.test.tsx` (update assertions)
- Add E2E test for share link navigation isolation

**Effort:** 30 minutes
**Priority:** High (security/UX issue)
```

### Success Criteria
1. ✅ Code change deployed and merged
2. ✅ All tests passing (unit + E2E)
3. ✅ Manual verification in dev/staging environment
4. ✅ No regression in authenticated user experience

---

## 6. Next Steps

1. **Immediate:** Create story in backlog/sprint tracking
2. **Development:** Implement fix per technical specification above
3. **Testing:** Execute acceptance criteria validation
4. **Review:** Code review focusing on authenticated vs. unauthenticated paths
5. **Deploy:** Merge and deploy to production

---

**Proposal Status:** ✅ Ready for Implementation
**Approval Required From:** Tommy (Product Owner)
