---
baseline_commit: 41f695cd93c65916d627b95c96bb10483fd539f3
---

# Story 4.6: Contextual Share-Link Preview Images

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator sharing a trip or entry link,
I want the link preview (in WhatsApp/iMessage/Slack, etc.) to show the actual shared content's photo and title,
so that recipients see a meaningful preview instead of a generic site icon.

## Acceptance Criteria

1. **Given** a day entry has a cover image or media photo
   **When** someone pastes that entry's share link into a messaging app
   **Then** the link preview shows that entry's photo, with the entry's title and the trip's title as a byline
2. **Given** a trip has a cover image
   **When** someone pastes the trip's share link
   **Then** the link preview shows the trip's cover photo and the trip's title
3. **Given** an entry or trip has no usable image (no cover image, and no image-type media)
   **When** someone pastes its share link
   **Then** the link preview falls back to the generic TravelBlogs compass design, with no error
4. **Given** either share page is loaded directly in a browser
   **When** the page head is inspected
   **Then** the tab title and meta description reflect the entry's/trip's own title, not the generic site-wide copy

## Tasks / Subtasks

- [x] Add shared filesystem-path helper (AC: 1, 2, 3)
  - [x] Add `resolveUploadFilePath(url: string): string | null` to `travelblogs/src/utils/media.ts`. It must: return `null` if `url` doesn't start with `/uploads/`; otherwise join `resolveUploadRoot()` (import from `../utils/trip-export`) with the URL's relative remainder, mirroring the logic in `mapUploadUrlToPath` (export route) and `mapUploadUrlToRelativePath` (restore route)
  - [x] Refactor `travelblogs/src/app/api/trips/[id]/export/route.ts`'s `mapUploadUrlToPath` and `travelblogs/src/app/api/trips/restore/route.ts`'s `mapUploadUrlToRelativePath` to delegate to the new shared helper instead of duplicating the `/uploads/` stripping logic
  - [x] Run `export-trip.test.ts` and `restore-trip.test.ts` after the refactor to confirm no behavior change
- [x] Export `inferMediaType` from `travelblogs/src/utils/entry-reader.ts` (AC: 1)
  - [x] Change `const inferMediaType = ...` to `export const inferMediaType = ...` (no logic change; already returns `"image" | "video" | null` by extension)
- [x] Extract a shared OG fallback renderer (AC: 3)
  - [x] Add a small reusable function (e.g. `renderCompassFallback(title: string, description: string)` in a new `travelblogs/src/components/brand/og-fallback.tsx`) that returns the same generic-card JSX currently inlined in `travelblogs/src/app/opengraph-image.tsx`, so the sitewide image and the two new share-route images all render an identical fallback without copy-pasting the layout three times
  - [x] Update `travelblogs/src/app/opengraph-image.tsx` to use the extracted renderer (behavior must stay identical — `brand-icons.test.tsx` must keep passing unmodified)
- [x] Add trip share preview image + metadata (AC: 2, 3, 4)
  - [x] Add `travelblogs/src/app/trips/share/[token]/opengraph-image.tsx`: given `params.token`, fetch `${baseUrl}/api/trips/share/${token}` (same pattern as `loadSharedTrip` in the sibling `page.tsx` — `getRequestBaseUrl(await headers())`, `cache: "no-store"`); if the response has no trip or trip has no `coverImageUrl`, render the fallback; otherwise resolve the cover image via `resolveUploadFilePath`, read it with `fs.promises.readFile`, base64-embed it in a `next/og` `ImageResponse`; any missing/unreadable file must also fall back, never throw or 500
  - [x] Add `generateMetadata` to `travelblogs/src/app/trips/share/[token]/page.tsx`: fetch the same trip data, set `title` to the trip's title and `description`/`openGraph`/`twitter` fields accordingly; if the token is invalid/revoked (trip data unavailable), fall back to the generic site title/description — do not leak trip existence or details
- [x] Add entry share preview image + metadata (AC: 1, 3, 4)
  - [x] Add `travelblogs/src/app/trips/share/[token]/entries/[entryId]/opengraph-image.tsx`: given `params.token, params.entryId`, fetch the entry via `${baseUrl}/api/trips/share/${token}/entries/${entryId}` (same pattern as `loadSharedEntry` in the sibling `page.tsx`); pick the hero image using `coverImageUrl`, else the first media item where `inferMediaType(item.url) === "image"`; resolve/read/embed as above; fall back (no throw) when nothing usable is found or the file can't be read
  - [x] For the byline, also fetch the trip's title via `${baseUrl}/api/trips/share/${token}` (same call the entry `page.tsx` already makes for `heroMapLocations`) — needed because the entry API response has no trip title field
  - [x] Add `generateMetadata` to `travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx`: set `title` to the entry's title (with the trip's title as byline, e.g. `` `${entry.title} — ${trip.title}` ``) and `description`/`openGraph`/`twitter` accordingly; fall back to generic site copy if the token/entry is invalid — do not leak content
- [x] Tests (AC: 1-4)
  - [x] Unit tests for `resolveUploadFilePath` and the now-exported `inferMediaType` (extend `travelblogs/tests/utils/entry-media.test.ts` and `travelblogs/tests/utils/entry-reader-mapper.test.ts`, or add sibling test files following the same naming)
  - [x] Component tests for both new `opengraph-image.tsx` routes, following the `describe("opengraph-image", ...)` pattern in `travelblogs/tests/components/brand-icons.test.tsx` (mock `next/headers` and `fetch`): valid image → PNG at declared size; no image → fallback PNG (no throw); unreadable file (mock `fs.readFile` rejection) → fallback PNG, not a 500/throw
  - [x] Tests for both new `generateMetadata` functions: valid token → entry/trip title present in returned metadata; invalid/revoked token → generic fallback metadata, no leaked data
- [x] Verification (all ACs)
  - [x] Run the full test suite — no regressions
  - [x] Run `npm run typecheck` and `npm run build` — both must pass with zero errors before this story can move to review (project-wide gate added 2026-07-19)

## Dev Notes

- Relevant architecture patterns and constraints
  - **Security-critical:** the OG image and metadata handlers MUST go through the existing public share API routes (`/api/trips/share/[token]` and `/api/trips/share/[token]/entries/[entryId]`) exactly like the sibling `page.tsx` files do — never query Prisma directly from `opengraph-image.tsx`/`generateMetadata`. Those API routes are what enforce token validity (see Story 4.5); bypassing them would let a preview image leak content from a revoked or invalid share link.
  - Next.js (App Router) file conventions: `opengraph-image.tsx` in a route segment folder receives the same `params` as that segment's `page.tsx` and is picked up automatically for that segment's Open Graph/Twitter image — no manual wiring needed in `page.tsx` beyond adding `generateMetadata`.
  - `generateMetadata` and the `opengraph-image.tsx` default export both run independently per-request and will each re-fetch the share API — this mirrors the existing double-fetch pattern already present in the entry `page.tsx` (it separately fetches the entry and, when there's a location, the trip) and is an accepted tradeoff, not a regression to fix.
  - All fetches to internal share API routes must use `cache: "no-store"` and `getRequestBaseUrl(await headers())` for the base URL, matching `loadSharedTrip`/`loadSharedEntry` in the existing page components.
  - Images must be embedded as base64 data URIs read from local disk via `resolveUploadFilePath` + `fs.promises.readFile` — no network fetch of the image, no new dependencies (`next/og`'s `ImageResponse` is already used sitewide).
  - Any failure path (no image, unresolvable path, unreadable file) must degrade to the generic compass fallback and never throw/500 — messaging apps unfurl links opportunistically and a 500 here would be a visible regression.
  - Uploaded media/cover files are HEIC-converted to JPG server-side before storage (Story 15.5), so extension-based mime inference for the data URI only needs to cover the standard web formats already in play (jpg/png/webp); treat anything else as "no usable image".
  - This project's Definition of Done now includes a hard gate: `npm run typecheck` and `npm run build` must both pass with zero errors before a story can move to "review" (added same day as this story, commit `41f695c`). Don't defer build/type errors.
- Source tree components to touch
  - New: `travelblogs/src/app/trips/share/[token]/opengraph-image.tsx`
  - New: `travelblogs/src/app/trips/share/[token]/entries/[entryId]/opengraph-image.tsx`
  - New: `travelblogs/src/components/brand/og-fallback.tsx` (extracted fallback renderer)
  - Modify: `travelblogs/src/app/trips/share/[token]/page.tsx` (add `generateMetadata`)
  - Modify: `travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx` (add `generateMetadata`)
  - Modify: `travelblogs/src/utils/media.ts` (add `resolveUploadFilePath`)
  - Modify: `travelblogs/src/utils/entry-reader.ts` (export `inferMediaType`)
  - Modify: `travelblogs/src/app/opengraph-image.tsx` (use extracted fallback renderer)
  - Modify: `travelblogs/src/app/api/trips/[id]/export/route.ts` and `travelblogs/src/app/api/trips/restore/route.ts` (delegate to `resolveUploadFilePath`)
  - Tests: `travelblogs/tests/components/brand-icons.test.tsx` (must keep passing unmodified), plus new/extended test files listed in Tasks
- Testing standards summary
  - Tests live in central `travelblogs/tests/` (no co-located tests), organized under `tests/api`, `tests/components`, `tests/utils`.
  - Mock `next/headers` (`vi.mock`) and global `fetch` for route-level tests, following `brand-icons.test.tsx` and the existing `page.tsx` test conventions.
  - API error format in tests must use `{ data: null, error: { code, message } }`.

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
  - New special files follow existing Next.js file-convention precedent (`src/app/opengraph-image.tsx`, `src/app/apple-icon.tsx`) — same `next/og` `ImageResponse` usage, same `@/` import-alias style used in those two files (the sibling `page.tsx` files in this route use relative imports instead; that's pre-existing and unrelated — new special files should follow the `@/`-alias precedent set by the other OG/icon special files).
  - `resolveUploadFilePath` belongs in `src/utils/media.ts` per the sprint change proposal, even though `resolveUploadRoot` (which it wraps) lives in `src/utils/trip-export.ts` — import it across files; `trip-export.ts` has no reverse dependency on `media.ts`, so no circular-import risk.
- Detected conflicts or variances (with rationale)
  - None expected. This is additive (two new special files, two `generateMetadata` additions) plus a non-behavioral dedup refactor of already-duplicated path logic.

### References

- Full story text, ACs, and technical/testing requirements: [Source: _bmad-output/planning-artifacts/epics.md#Story 4.6: Contextual Share-Link Preview Images]
- Origin and rationale for this story (sprint change proposal): [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-07-19.md]
- Sitewide OG image / CompassMark pattern to reuse for fallback: [Source: travelblogs/src/app/opengraph-image.tsx], [Source: travelblogs/src/components/brand/compass-mark.tsx]
- Existing upload-root/path-resolution logic being consolidated: [Source: travelblogs/src/app/api/trips/[id]/export/route.ts#mapUploadUrlToPath], [Source: travelblogs/src/app/api/trips/restore/route.ts#mapUploadUrlToRelativePath], [Source: travelblogs/src/utils/trip-export.ts#resolveUploadRoot]
- Share route data shapes: [Source: travelblogs/src/app/api/trips/share/[token]/entries/[entryId]/route.ts], [Source: travelblogs/src/types/trip-overview.ts]
- Token-validation guarantee this story must not weaken: [Source: _bmad-output/implementation-artifacts/4-5-invalidate-shared-entry-pages-on-revoke.md]
- Project-wide build/typecheck completion gate: [Source: .claude/skills/bmad-dev-story/SKILL.md]
- General coding conventions: [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

- `npx vitest run tests/api/trips/export-trip.test.ts tests/api/trips/restore-trip.test.ts` — confirmed no behavior change after the `resolveUploadFilePath` refactor
- `npx vitest run tests/components/brand-icons.test.tsx` — confirmed sitewide OG image/apple-icon unchanged after fallback extraction
- `npm run test` — 108 test files / 839 passed, 1 pre-existing skip, no regressions
- `npm run typecheck` — zero errors
- `npm run build` — zero errors; new routes `/trips/share/[token]/opengraph-image` and `/trips/share/[token]/entries/[entryId]/opengraph-image` present in route manifest
- **Post-deploy prod bug found and fixed:** after deploying, real link-preview crawlers still got a generic gray box (no compass fallback, no custom image/title) on every trip. Root cause: `src/proxy.ts`'s `publicTripEntryView` allowlist never accounted for the two new `opengraph-image` path shapes, so the auth middleware classified them as protected routes and redirected anonymous crawler requests to `/sign-in` instead of serving the image. Fixed by extending `publicTripEntryView` to allow `/trips/share/{token}/opengraph-image` and `/trips/share/{token}/entries/{entryId}/opengraph-image`; added 2 regression tests to `tests/api/auth/proxy.test.ts` (14 tests total, all passing). Full suite/typecheck/build re-verified clean after this fix.

### Completion Notes List

- Added `resolveUploadFilePath` to `src/utils/media.ts` and refactored the export/restore routes' local mapping helpers to delegate to it (derive `relative` via `path.relative(uploadRoot, absolute)` instead of re-stripping the `/uploads/` prefix). Verified byte-for-byte behavior via the existing export/restore test suites.
- Exported `inferMediaType` from `entry-reader.ts` (no logic change).
- Extracted `renderCompassFallback` into `src/components/brand/og-fallback.tsx`; the sitewide `opengraph-image.tsx` and both new share-route images now render an identical fallback card.
- Added a small `getImageMimeTypeFromUrl` helper to `media.ts` (jpg/jpeg/png/webp only, per Dev Notes on HEIC being converted server-side) so both new OG image routes can build a correct data-URI mime type without duplicating the extension-mapping logic.
- Built the two new `opengraph-image.tsx` routes (`runtime = "nodejs"` since they need `fs.promises.readFile`, unlike the edge-compatible sitewide one). Both go exclusively through the public `/api/trips/share/...` routes (never Prisma directly), matching the token-validation guarantee from Story 4.5. Any failure — no trip/entry, no image, unreadable file — degrades to the exact generic sitewide fallback (never a trip/entry-specific fallback), matching AC3 literally.
- Added `generateMetadata` to both share `page.tsx` files. Added new `share.tripDescription` / `share.entryDescription` translation keys (English + German, with `{{title}}`/`{{entryTitle}}`/`{{tripTitle}}` placeholders replaced manually, following the existing `slideshowLoading` interpolation convention) so the metadata description is localized rather than hardcoded English. Invalid/revoked tokens fall back to the exact generic site title/description with no trip/entry data leaked (verified via a `JSON.stringify(metadata)` containment check in tests).
- Considered whether importing `resolveUploadRoot`/`node:path` into `media.ts` (which is also imported by several "use client" components) would break the client bundle; confirmed via `npm run build` that tree-shaking eliminates the now-unused-on-client code path with zero errors.
- Test suite additions: unit tests for `resolveUploadFilePath` / `getImageMimeTypeFromUrl` (`entry-media.test.ts`) and `inferMediaType` (`entry-reader-mapper.test.ts`); component tests for both `opengraph-image.tsx` routes covering valid-image, no-image, invalid-token, and unreadable-file paths (mocking `node:fs`'s `readFile` to reject once for the unreadable-file case); metadata tests for both `generateMetadata` functions covering valid-token and invalid-token paths.

### File List

- Modified: `travelblogs/src/utils/media.ts`
- Modified: `travelblogs/src/utils/entry-reader.ts`
- Modified: `travelblogs/src/app/opengraph-image.tsx`
- Modified: `travelblogs/src/app/api/trips/[id]/export/route.ts`
- Modified: `travelblogs/src/app/api/trips/restore/route.ts`
- Modified: `travelblogs/src/app/trips/share/[token]/page.tsx`
- Modified: `travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx`
- Modified: `travelblogs/src/utils/i18n.ts`
- Modified: `travelblogs/src/proxy.ts`
- New: `travelblogs/src/components/brand/og-fallback.tsx`
- New: `travelblogs/src/app/trips/share/[token]/opengraph-image.tsx`
- New: `travelblogs/src/app/trips/share/[token]/entries/[entryId]/opengraph-image.tsx`
- Modified: `travelblogs/tests/utils/entry-media.test.ts`
- Modified: `travelblogs/tests/utils/entry-reader-mapper.test.ts`
- Modified: `travelblogs/tests/api/auth/proxy.test.ts`
- New: `travelblogs/tests/components/trip-share-opengraph-image.test.tsx`
- New: `travelblogs/tests/components/entry-share-opengraph-image.test.tsx`
- New: `travelblogs/tests/components/trip-share-metadata.test.tsx`
- New: `travelblogs/tests/components/entry-share-metadata.test.tsx`
