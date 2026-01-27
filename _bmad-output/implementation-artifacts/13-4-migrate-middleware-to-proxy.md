# Story 13.4: Migrate Middleware to Proxy Convention

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **the middleware file to use the new Next.js "proxy" convention instead of the deprecated "middleware" convention**,
so that **the codebase follows Next.js best practices and eliminates deprecation warnings**.

## Context

Next.js is deprecating the `middleware.ts` file convention in favor of `proxy.ts`. The current middleware handles authentication and route protection using next-auth JWT tokens.

Current deprecation warning:
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
```

The middleware currently:
- Checks if users must change their password and redirects them
- Protects routes that require authentication (trips, entries, account pages)
- Allows public access to shared trip views
- Redirects unauthenticated users to sign-in page

## Acceptance Criteria

### AC 1: Proxy File Created
**Given** the Next.js project structure
**When** I check the src directory
**Then** a `proxy.ts` file exists instead of `middleware.ts`
**And** the file exports the same authentication logic

### AC 2: No Deprecation Warning
**Given** the development server is running
**When** I check the console output
**Then** there is NO warning about "middleware" file convention being deprecated

### AC 3: Authentication Still Works
**Given** I am not signed in
**When** I try to access a protected route like `/trips`
**Then** I am redirected to `/sign-in` with the appropriate callback URL
**And** after signing in, I am redirected back to my original destination

### AC 4: Public Routes Still Accessible
**Given** I am not signed in
**When** I access a shared trip link like `/trips/share/{token}`
**Then** I can view the content without being redirected to sign-in

### AC 5: Password Change Redirect Works
**Given** I am signed in with a user that must change password
**When** I try to access any route except `/account/password`
**Then** I am redirected to the password change page

## Implementation Notes

### Migration Steps

According to Next.js documentation, the migration from `middleware.ts` to `proxy.ts` involves:

1. **Rename the file**: `src/middleware.ts` → `src/proxy.ts`
2. **Update the export name** (if required by new convention)
3. **Verify the config matcher** still works
4. **Test all authentication flows**

### Current Middleware Logic to Preserve

The current `middleware.ts` includes:
- `publicTripEntryView()` - Identifies public share routes
- `isProtectedPath()` - Determines if route requires auth
- `buildRelativeRedirect()` - Creates redirect with callback URL
- `isAllowedMustChangeApi()` - Allows password change API calls
- Main middleware function with JWT token checking
- Config matcher for routes: `/trips/:path*`, `/entries/:path*`, `/account/:path*`, `/api/:path*`

All this logic must be preserved in the new `proxy.ts` file.

### Files to Modify

- Rename: `travelblogs/src/middleware.ts` → `travelblogs/src/proxy.ts`
- Verify: No other files import or reference `middleware.ts` directly

### Testing Checklist

- [ ] Dev server starts without deprecation warning
- [ ] Unauthenticated user redirected to sign-in when accessing `/trips`
- [ ] After sign-in, user redirected back to original URL
- [ ] Public share links work without authentication
- [ ] Users with mustChangePassword flag redirected to password change page
- [ ] Password change API calls work during forced password change
- [ ] All existing authentication tests still pass

## Definition of Done

- [ ] `proxy.ts` file created with all middleware logic
- [ ] `middleware.ts` file removed
- [ ] No deprecation warnings in dev server console
- [ ] All authentication flows tested and working
- [ ] Existing tests pass
- [ ] Code reviewed and approved

## Dependencies

None - this is a straightforward file rename/migration.

## Estimated Effort

**XSmall** - Simple file rename and verification, minimal logic changes expected.

## References

- [Next.js Middleware to Proxy Migration Guide](https://nextjs.org/docs/messages/middleware-to-proxy)
- Current middleware: [travelblogs/src/middleware.ts](travelblogs/src/middleware.ts)
- Project context: [_bmad-output/project-context.md](_bmad-output/project-context.md)

## Dev Notes

### Current Middleware Analysis

**File:** `travelblogs/src/middleware.ts` (119 lines)

**Key Functions:**
- `publicTripEntryView(pathname)` (lines 5-29) - Identifies public share routes
  - `/trips/share/{token}` - Public trip view
  - `/trips/share/{token}/map` - Public trip map
  - `/trips/share/{token}/entries/{entryId}` - Public entry view
  - `/trips/view/{token}` - Alternative public view
- `isProtectedPath(pathname)` (lines 31-61) - Route protection logic
  - Excludes: `/api/auth/*`, public paths, `/sign-in`
  - Includes: `/trips/*`, `/entries/*`, `/account/password`
- `getCallbackUrl(request)` (lines 63-64) - Extracts callback URL
- `buildRelativeRedirect(pathname, request)` (lines 66-72) - Creates redirect with callback
- `isAllowedMustChangeApi(pathname)` (lines 74-84) - Allows password change API
  - `/api/auth/*` - Auth endpoints
  - `/api/users/{id}/password` - Password change endpoint
- `middleware(request)` (lines 86-109) - Main middleware function
  - Checks JWT token for `mustChangePassword` flag
  - Redirects to `/account/password` if flag set
  - Protects routes requiring authentication
  - Redirects unauthenticated users to `/sign-in`

**Config Matcher:** (lines 111-118)
- `/trips/:path*`
- `/entries/:path*`
- `/account/:path*`
- `/api/:path*`

**Dependencies:**
- `next/server` - NextResponse, NextRequest
- `next-auth/jwt` - getToken

### Migration Strategy

**Step 1: Rename File**
```bash
mv travelblogs/src/middleware.ts travelblogs/src/proxy.ts
```

**Step 2: Verify Export (NO CHANGE EXPECTED)**

According to Next.js 16 documentation, the export structure remains the same:
- Named export: `export const middleware = async (request: NextRequest) => { ... }`
- Config export: `export const config = { matcher: [...] }`

**No code changes required** - only file rename.

**Step 3: Test All Flows**

Critical test scenarios:
1. Unauthenticated access to `/trips` → Redirects to `/sign-in?callbackUrl=/trips`
2. Sign in → Redirects back to original URL via callback
3. Public share link `/trips/share/{token}` → Accessible without auth
4. User with `mustChangePassword=true` → Redirects to `/account/password`
5. Password change API calls → Allowed during forced password change
6. Dev server starts → No deprecation warning

### Previous Story Intelligence

**Story 5.2 Context (User Sign-In):**
- Authentication uses Auth.js (NextAuth) with JWT sessions
- JWT tokens stored in cookies
- `getToken()` retrieves JWT from request

**Story 5.14 Context (Relative Redirects for Sign-In):**
- `buildRelativeRedirect()` function ensures relative redirects
- Callback URL preserved through sign-in flow
- Prevents redirect loops

**Story 4.5 Context (Invalidate Shared Entry Pages on Revoke):**
- Public share routes use `/trips/share/{token}` pattern
- Middleware must allow public access to these routes

**Key Learnings:**
- Middleware is critical for auth flow - must preserve all logic
- Callback URL handling is essential for UX
- Public share routes must remain accessible
- Password change redirect prevents locked-out users from accessing other routes

### Architecture Compliance

- File naming: `proxy.ts` (new Next.js convention) ✓
- No new dependencies required ✓
- Preserve all existing logic ✓
- JWT session pattern unchanged ✓
- Relative redirect pattern preserved ✓

### Library & Framework Requirements

**Next.js 16.x Proxy Convention:**
- File location: `src/proxy.ts` (same as middleware.ts)
- Export structure: Same as middleware (named export + config)
- Functionality: Identical to middleware
- Migration: File rename only, no code changes

**Next.js Server (next/server):**
- `NextRequest` - Request object with enhanced methods
- `NextResponse` - Response object with redirect, next()

**Auth.js / NextAuth (next-auth/jwt):**
- `getToken({ req })` - Retrieves JWT token from request
- Token shape: `{ mustChangePassword?: boolean, ... }`

### File Structure Requirements

**Files to Modify:**

1. **Rename:** `travelblogs/src/middleware.ts` → `travelblogs/src/proxy.ts`
   - NO code changes required
   - File contents remain identical

**Files to Verify:**

2. **Check imports:** Ensure no files directly import `middleware.ts`
   - Grep search shows: No direct imports found ✓

**Do NOT modify:**
- Auth.js configuration (`travelblogs/src/auth.ts`)
- Sign-in page (`travelblogs/src/app/sign-in/page.tsx`)
- Password change page (`travelblogs/src/app/account/password/page.tsx`)
- API routes

### Testing Requirements

**Manual Testing (Browser):**

1. **Unauthenticated Redirect:**
   - Sign out
   - Navigate to `/trips`
   - Verify redirect to `/sign-in?callbackUrl=%2Ftrips`
   - Sign in
   - Verify redirect back to `/trips`

2. **Public Share Access:**
   - Sign out
   - Navigate to `/trips/share/{valid-token}`
   - Verify page loads without redirect
   - Verify entry content visible

3. **Password Change Redirect:**
   - Sign in as user with `mustChangePassword=true`
   - Try to access `/trips`
   - Verify redirect to `/account/password`
   - Verify callback URL preserved

4. **Dev Server Warning:**
   - Stop dev server
   - Rename file to `proxy.ts`
   - Start dev server: `npm run dev`
   - Check console output
   - Verify NO deprecation warning about "middleware" convention

**Automated Testing:**

No new tests required - existing auth flow tests should pass:
- `tests/api/auth/*` - Auth API tests
- Integration tests for protected routes
- Sign-in flow tests

**Verification checklist:**
```bash
# 1. Rename file
mv travelblogs/src/middleware.ts travelblogs/src/proxy.ts

# 2. Start dev server
cd travelblogs && npm run dev

# 3. Check for deprecation warning (should be NONE)
# Look in terminal output for: "middleware" file convention is deprecated

# 4. Run existing tests
npm test

# 5. Manual browser testing (see above)
```

### Project Structure Notes

**Current Project Structure:**
```
travelblogs/
├── src/
│   ├── middleware.ts  ← RENAME TO proxy.ts
│   ├── auth.ts  ← Auth.js config (do not modify)
│   ├── app/
│   │   ├── sign-in/
│   │   │   └── page.tsx  ← Sign-in page
│   │   ├── account/
│   │   │   └── password/
│   │   │       └── page.tsx  ← Password change page
│   │   ├── trips/
│   │   │   └── share/
│   │   │       └── [token]/
│   │   │           └── page.tsx  ← Public share view
│   │   └── api/
│   │       ├── auth/  ← Auth endpoints
│   │       └── users/
│   │           └── [id]/
│   │               └── password/
│   │                   └── route.ts  ← Password change API
```

**After Migration:**
```
travelblogs/
├── src/
│   ├── proxy.ts  ← RENAMED from middleware.ts
│   └── (everything else unchanged)
```

### Git Intelligence Summary

**Recent Commits:**
- 45d79ca - Story 13.3: Optimize Image loading
- 289e91f - Bugfix: Editor makes selected text bold
- b10a358 - Story 12.6: Replace tags in story
- 97f8a25 - Bugfix: delete story had hidden dialog
- b252bd4 - Story 12: Bugfix 1

**Commit Message Pattern:**

Expected commit for this story:
```
Story 13.4: Migrate middleware to proxy convention

- Rename src/middleware.ts to src/proxy.ts
- Eliminates Next.js deprecation warning
- No code changes required - file rename only
- All authentication flows preserved and tested

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Latest Technical Information

**Next.js 16.x Middleware → Proxy Migration:**

According to Next.js 16 documentation:
- **Deprecated:** `src/middleware.ts`
- **New convention:** `src/proxy.ts`
- **Reason:** Clarifies that the file acts as a proxy layer, not middleware in the traditional sense
- **Breaking changes:** None - only file name change required
- **Timeline:** Deprecation warning in Next.js 16, removal likely in Next.js 17

**Migration is simple:**
1. Rename file: `middleware.ts` → `proxy.ts`
2. No code changes needed
3. Export structure remains identical
4. Config matcher unchanged
5. All functionality preserved

**No security implications** - this is purely a naming convention change.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

Story updated by SM agent (Bob) to add comprehensive dev context and mark ready-for-dev.

### Completion Notes List

**Implementation Process:**

1. ✅ Renamed `travelblogs/src/middleware.ts` → `travelblogs/src/proxy.ts`
2. ✅ Updated export name: `export const middleware` → `export const proxy`
3. ✅ Updated test import: `middleware.test.ts` now imports `proxy as middleware`
4. ✅ Verified all 729 tests pass (93 test files)
5. ✅ Confirmed dev server starts without deprecation warning
6. ✅ All authentication logic preserved (no code changes to logic)

**Test Results:**

- Test Files: 93 passed (93 total)
- Tests: 729 passed, 1 skipped (730 total)
- Duration: ~14-19 seconds
- Middleware test suite: All 12 middleware tests passing
- No regressions detected

**Dev Server Verification:**

- Next.js 16.1.0 (Turbopack)
- ✅ No deprecation warning: "middleware file convention is deprecated"
- ✓ Ready in 425ms
- Server started successfully on http://localhost:3000

**Key Findings:**

- Migration required TWO changes (not just file rename):
  1. File rename: `middleware.ts` → `proxy.ts`
  2. Export rename: `export const middleware` → `export const proxy`
- Next.js requires the exported function to be named `proxy` in proxy.ts
- All authentication logic preserved exactly as-is (119 lines unchanged)
- Test file updated to import `proxy as middleware` for compatibility

**Story Status:**

- Status: `review` ✓
- Sprint status: Will be updated in Step 5
- All acceptance criteria satisfied
- Code review completed with fixes applied

**Code Review Fixes Applied (2026-01-27):**

1. ✅ Removed dead code: Unused `redirectPath` variable in `buildRelativeRedirect()` (line 68)
2. ✅ Added TypeScript type safety: Created `AuthToken` interface for JWT token shape
3. ✅ Renamed test file: `middleware.test.ts` → `proxy.test.ts` for naming consistency
4. ✅ Added JSDoc: Comprehensive documentation for exported `proxy` function
5. ✅ All 729 tests still passing after fixes

**Final Test Results:**
- Test Files: 93 passed (93 total)
- Tests: 729 passed, 1 skipped (730 total)
- Duration: ~15 seconds
- Proxy test suite: All 12 tests passing ✓

### Change Log

- 2026-01-27: Story 13.4 implemented and tested - Migrated middleware.ts to proxy.ts convention per Next.js 16.x requirements
- 2026-01-27: Code review completed - Fixed 4 issues (3 HIGH, 1 MEDIUM), all tests passing

### File List

- travelblogs/src/proxy.ts (renamed from middleware.ts, updated export name, added TypeScript types, added JSDoc, removed dead code)
- travelblogs/tests/api/auth/proxy.test.ts (renamed from middleware.test.ts, updated import to use proxy)
