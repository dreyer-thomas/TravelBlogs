# Story 13.4: Migrate Middleware to Proxy Convention

Status: backlog

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
