---
baseline_commit: 65e16e56b974d670c34337c28664b31e963564e3
---

# Story 0.6: Upgrade Next.js to Resolve Vulnerable Dependencies

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want Next.js upgraded past its known vulnerabilities,
so that `npm audit` no longer reports findings from `next` and its bundled `postcss`.

## Acceptance Criteria

1. **Given** the current dependency tree has `next` and `next`'s bundled `postcss` flagged by `npm audit`
   **When** the Next.js upgrade is applied
   **Then** neither package (nor their vulnerable versions) appears in `npm audit` output
2. **Given** the upgraded Next.js version
   **When** the full application is exercised (dev server, all existing routes, the production build)
   **Then** all existing tests pass, the production build succeeds, and no App Router/middleware/proxy behavior regresses (see `13-4-migrate-middleware-to-proxy` for current proxy setup that must keep working)
3. **Given** `npm audit` is run after this story's changes
   **Then** the story's contribution to the story-0.4 waived baseline is removed, and the overall vulnerability count decreases accordingly

## Tasks / Subtasks

- [x] Bump Next.js to `16.2.10` (AC: 1, 2)
  - [x] In `travelblogs/package.json` `dependencies`, bump `"next"` from `"16.1.0"` to `"16.2.10"`
  - [x] In the same file's `devDependencies`, bump `"eslint-config-next"` from `"16.1.0"` to `"16.2.10"` to keep the lint config in lockstep with the `next` version (confirmed `eslint-config-next@16.2.10` exists on npm)
  - [x] Do **not** run `npm audit fix --force` — depending on whether Story 0.5 (Prisma) has already landed, it may also touch the Prisma chain or downgrade `next-auth`→`3.29.10` (Story 0.7's scope, out of scope here). Edit the two version strings directly, then run `npm install` from `travelblogs/` to regenerate `package-lock.json`
- [x] Verify the vulnerable chain is resolved (AC: 1, 3)
  - [x] Run `npm run audit` (or `npm audit`) from `travelblogs/`
  - [x] Confirm neither `next` nor its bundled `node_modules/next/node_modules/postcss` appear in the output
  - [x] Confirm the only vulnerabilities still permitted to remain are `next-auth`/`uuid` (Story 0.7's scope) and, if Story 0.5 has not yet landed, the Prisma dev-tooling chain (Story 0.5's scope) — this story must not touch either
  - [x] Add a short addendum to `_bmad-output/implementation-artifacts/0-4-dependency-vulnerability-gate.md`'s Completion Notes recording that the `next`/`postcss` portion of the waived baseline has been resolved by this story, per AC 3
- [x] Verify application behavior is unaffected (AC: 2)
  - [x] Run `npm test` (vitest) from `travelblogs/` — confirm no regressions vs. the current baseline (108 test files / 848 passed / 1 skipped as of Story 0.4/0.5; re-baseline if Story 0.5 has landed and changed this count)
  - [x] Run `npm run typecheck` — must be clean (0 errors)
  - [x] Run `npm run build` — production build must succeed with no Next.js-related errors
  - [x] Start the app (`npm run dev` or the production `start` script, which runs the custom `server.js`) and manually smoke-test: sign-in (`0-1`), viewing a trip (App Router routes), and at least one shared-link route under `src/app/trips/share/[token]/...`
  - [x] Manually verify `src/proxy.ts` (145 lines — the proxy-gated route allowlist added in `13-4-migrate-middleware-to-proxy`) still enforces auth-redirects correctly on a protected route and still allows the public share routes through
  - [x] Re-check `next.config.ts`'s `experimental.proxyClientMaxBodySize` and `experimental.serverActions.bodySizeLimit` settings still take effect (e.g. via a media upload) — these are experimental-flag surface area most likely to shift between Next minor versions
- [x] Update project context (Technical Requirements)
  - [x] In `_bmad-output/project-context.md`, update the `Next.js (create-next-app latest) + App Router` line under "Technology Stack & Versions" to note the pinned version, e.g. `Next.js 16.2.10 + App Router`

### Review Findings

- [x] [Review][Patch] `trip-share-opengraph-image.test.tsx` has the same fetch-mock/wasm vulnerability as the fixed `entry-share-opengraph-image.test.tsx`, but currently passes only by accident — The story's root-cause fix (scoping `vi.stubGlobal("fetch", ...)` mocks to `/api/` URLs and passing the internal wasm-loading `fetch` call through to the real `fetch`) was applied only to `entry-share-opengraph-image.test.tsx`. `tests/components/trip-share-opengraph-image.test.tsx` renders the same `next/og` `ImageResponse` via the same wasm-loading path and uses the identical unconditional `vi.stubGlobal("fetch", fetchMock)` blanket mock. Reproduced directly during review: replicating that file's exact test setup *without* its own `vi.mock("node:fs", ...)` wrapper reproduces the exact same `CompileError: WebAssembly.instantiate(): expected magic word` failure entry-share had pre-fix. The file currently passes only because its own (functionally unrelated) `node:fs` mock happens to reroute `@vercel/og`'s Node-target wasm loader away from the `fetch(file://...)` path — an accidental, unexplained side effect, not a structural difference between the two routes. [travelblogs/tests/components/trip-share-opengraph-image.test.tsx] — **fixed:** now uses the shared `mockAppFetch` helper (see below); verified `npx vitest run tests/components/trip-share-opengraph-image.test.tsx` still passes (5/5) with the same behavior guaranteed by design, not by accident.
- [x] [Review][Patch] Unsound `as string` cast in the fetch-mock passthrough branch (7 occurrences) — `isAppApiUrl` is typed `(input: unknown): input is string`; in the `!isAppApiUrl(url)` branch TypeScript does not narrow `url` (it stays `unknown`), so `realFetch(url as string, init)` is an unchecked cast. Real `fetch`'s `RequestInfo` can be `string | URL | Request`; nothing in this codebase currently calls `fetch` with a non-string, so it isn't a runtime bug today, but the cast would silently hide a real type mismatch if that ever changed. [travelblogs/tests/components/entry-share-opengraph-image.test.tsx:91,135,180,228,271,296,327] — **fixed:** the new shared `mockAppFetch` helper accepts `RequestInfo | URL` and never casts to `string`; `npm run typecheck` clean.
- [x] [Review][Patch] Six-way duplicated fetch-passthrough guard — the `if (!isAppApiUrl(url)) { return realFetch(url as string, init); }` block is copy-pasted verbatim into all 7 `mockImplementation` callbacks instead of being factored into one small shared helper (e.g. a `mockAppFetch(handler)` wrapper around `vi.fn()`). This bloats the diff and makes it easy for a future 8th test in this file to omit the guard and reintroduce the wasm-loading regression this story just fixed. [travelblogs/tests/components/entry-share-opengraph-image.test.tsx] — **fixed:** extracted `mockAppFetch(handler)` into `travelblogs/tests/components/mock-app-fetch.ts`, shared by both `entry-share-opengraph-image.test.tsx` and `trip-share-opengraph-image.test.tsx` (which also needed it, per the finding above). Full suite re-verified: 108 files / 848 passed / 1 skipped, `npm run typecheck` clean, `npm run build` succeeds, `npm run lint` shows only pre-existing errors unrelated to these files.

## Dev Notes

- **Scope boundary — dependency-version bump only.** No application code changes are expected. `next.config.ts`, `server.js`, and `src/proxy.ts` should not need edits — read them first (already summarized below) to confirm nothing in this Next version range requires a config change, but do not refactor them as part of this story.
- **Why `16.2.10` specifically:** confirmed via `npm audit fix --force --dry-run` (2026-07-19) — this is the version `next` resolves to for clearing its vulnerable-versions range (`9.3.4-canary.0 - 16.3.0-canary.5`) and the bundled vulnerable `postcss` (`<8.5.10`, resolves to `8.4.31` at `16.2.10`). `16.1.0` → `16.2.10` is a same-major, minor+patch bump (confirmed on npm registry) — not a breaking major version, consistent with the epic's requirement to confirm this before committing.
- **Custom server risk area:** this app does not use `next start` — `travelblogs/package.json`'s `start`/`start:https` scripts run `node server.js`, a custom HTTPS/HTTP server built with Next's programmatic `next(...)` API (see `server.js`). Custom-server integrations are the most likely place for a Next minor bump to introduce a subtle behavior change; the manual dev-server + production-build + smoke-test steps above are not optional filler, they are the primary regression check for this story.
- **`eslint-config-next` must move with `next`.** It's currently pinned to the same `16.1.0` value; leaving it behind after the bump would desync lint rules from the installed Next version. `eslint-config-next@16.2.10` is confirmed to exist on npm.
- **Vulnerability baseline is in flux — do not trust a cached count.** As of this story's drafting (2026-07-19), `npm audit` still reports the full 15-vulnerability baseline documented in Story 0.4 (7 moderate, 8 high), but Story 0.5 (Prisma dev-tooling upgrade) is actively in progress in parallel (`package.json`'s `prisma`/`@prisma/client`/`@prisma/adapter-better-sqlite3` had already moved to `7.8.0` mid-draft, ahead of its own lockfile regeneration/audit verification). **Run `npm run audit` fresh at the start of implementation** rather than assuming either the 15-count baseline or Story 0.5's target 4-count baseline. Either way, this story's scope is strictly the `next` + bundled `postcss` findings — leave any Prisma-chain or `next-auth`/`uuid` findings (in whatever state they're in) alone.
- **Exact resolved package set for this story:** `next` (high — 22 distinct advisories rolled into one audit entry, covering DoS, CSRF bypass, cache poisoning, XSS, proxy/middleware bypass, and SSRF classes) and its bundled `node_modules/next/node_modules/postcss` (moderate — XSS via unescaped `</style>` in CSS stringify output). Both clear at `next@16.2.10`.
- **Do not use `npm audit fix --force` as a shortcut.** Depending on repo state it may also resolve findings outside this story's scope (Prisma chain if Story 0.5 hasn't landed; `next-auth`→`3.29.10` downgrade, which is Story 0.7's explicit territory and must not be applied here). Make the targeted `package.json` edits instead.
- **Precedent for this exact style of story:** Story 0.5 (`0-5-upgrade-prisma-dev-tooling-to-resolve-vulnerable-dependencies.md`) is the sibling story for the Prisma chain, following the identical pattern (targeted version bump in `package.json`, `npm install` to regenerate the lockfile, verify via `npm run audit`/`npm test`/`npm run typecheck`/`npm run build`, update `project-context.md`). Follow that story's structure and rigor.

### Project Structure Notes

- Only `travelblogs/package.json`, `travelblogs/package-lock.json`, and `_bmad-output/project-context.md` are expected to change. No files under `travelblogs/src/` or `travelblogs/tests/` should need edits.
- `travelblogs/next.config.ts`, `travelblogs/server.js`, and `travelblogs/src/proxy.ts` are the Next.js-adjacent files most exposed to a version bump — read them to verify no behavior changes, but no edits are expected there absent a genuine regression.

### References

- Story source: [Source: _bmad-output/planning-artifacts/epics.md#Story 0.6: Upgrade Next.js to Resolve Vulnerable Dependencies]
- Waived baseline this story reduces: [Source: _bmad-output/implementation-artifacts/0-4-dependency-vulnerability-gate.md#Completion Notes List]
- Sibling story (same pattern, different package): [Source: _bmad-output/implementation-artifacts/0-5-upgrade-prisma-dev-tooling-to-resolve-vulnerable-dependencies.md]
- Proxy/middleware behavior that must not regress: `travelblogs/src/proxy.ts`, [Source: _bmad-output/implementation-artifacts/13-4-migrate-middleware-to-proxy.md]
- Next.js config and custom server: `travelblogs/next.config.ts`, `travelblogs/server.js`

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- Baseline `npm audit` before changes: 4 vulnerabilities (1 high: `next`; 3 moderate: `postcss`, `next-auth`, `uuid`), matching Story 0.5's documented end-state.
- **Deviation from story plan:** bumping `next`/`eslint-config-next` to `16.2.10` alone cleared the `next` (high) finding but left `postcss` (moderate) — `next@16.2.10` (the latest stable 16.x release; only `16.3.0` canary/preview builds exist beyond it) pins its bundled `node_modules/next/node_modules/postcss` to an *exact* vulnerable version (`8.4.31`, no caret range), contradicting the story's Dev Notes assumption that `16.2.10` alone clears the bundled `postcss`. Resolved with a targeted `"overrides": { "next": { "postcss": "8.5.10" } }` entry in `travelblogs/package.json` (same pattern as Story 0.5's `@hono/node-server` override) — confirmed via `cat node_modules/next/node_modules/postcss/package.json` that `8.5.10` is actually installed post-override. Still a dependency-version-only change (no new package, no app code).
- `npm run audit` after the override: exactly 2 vulnerabilities remain (both moderate: `next-auth`, `uuid`) — `next` and `postcss` are both fully absent from the report, satisfying AC 1. The remaining 2 belong to Story 0.7 and are accepted as a continued, documented waiver (consistent with Story 0.4's original waiver mechanism and Story 0.5's precedent of proceeding to review with out-of-scope findings remaining).
- **Second deviation — real test regression, not just a plan discrepancy:** `npm test` initially failed 7 of 7 tests in `tests/components/entry-share-opengraph-image.test.tsx` with `CompileError: WebAssembly.instantiate(): expected magic word ... found 7b 22 64 61` (`{"da` — the start of the tests' mocked JSON response body). Root cause: `next@16.2.10`'s bundled `@vercel/og` loads its `yoga.wasm` binary via a `fetch()` call to a `file://` URL (confirmed by reading the minified loader in `node_modules/next/dist/compiled/@vercel/og/index.node.js`), whereas the test file's `vi.stubGlobal("fetch", fetchMock)` mocks unconditionally intercepted *every* `fetch` call, including this internal wasm load, and returned the mocked trip-API JSON instead of wasm bytes. This is a genuine upstream behavior change in the Next-bundled `@vercel/og` version, not an application bug — real usage (dev server smoke test, see below) renders `ImageResponse` PNGs correctly since the real global `fetch` handles `file://` URLs. Fixed by scoping each test's fetch mock to only intercept calls matching `/api/` (this app's own endpoints), delegating everything else to the real `fetch` via a `realFetch = globalThis.fetch` captured before stubbing. All 7 tests pass afterward; full suite unchanged at 108 files / 848 passed / 1 skipped.
- `npm run typecheck`: clean, 0 errors.
- `npm run build`: succeeds (1 non-blocking Turbopack NFT-tracing warning on `/api/uploads/[...path]/route.ts`, pre-existing filesystem-operation pattern in that route, unrelated to this story's scope — build still completes and all routes compile).
- Manual smoke test via `npm run dev`: signed in through the real NextAuth credentials flow (`/api/auth/callback/credentials`), confirmed an authenticated request to the protected `/trips` route returns 200 (no redirect), confirmed an unauthenticated request to `/trips` redirects (307) to `/sign-in?callbackUrl=...` per `src/proxy.ts`, and confirmed a public share route (`/trips/share/[token]`, `.../map`, `.../opengraph-image`, and `.../entries/[id]/opengraph-image`) all return 200 without an auth redirect — the latter two confirm the real (non-mocked) `ImageResponse`/wasm rendering path works end-to-end post-upgrade. `next.config.ts`'s `experimental.proxyClientMaxBodySize`/`experimental.serverActions.bodySizeLimit` keys were accepted by both `next dev` and `next build` with no "unrecognized experimental flag" warning, and the build output echoed both values back, confirming Next 16.2.10 still recognizes this experimental config surface.

### Completion Notes List

- Bumped `next` and `eslint-config-next` from `16.1.0` to `16.2.10` in `travelblogs/package.json` (AC 1, 2).
- Added an `overrides` entry pinning the `postcss` bundled inside `next` to `8.5.10`, since `next@16.2.10` otherwise pins an exact vulnerable `postcss@8.4.31` with no caret range — required to actually clear AC 1's `postcss` finding (see Debug Log for detail; the plain version bump alone was insufficient).
- Verified via `npm run audit`: `next` and `postcss` are fully cleared. Exactly 2 vulnerabilities remain (`next-auth`, `uuid`, both moderate) — Story 0.7's scope, documented as a continued waiver (AC 3).
- Added an addendum to `_bmad-output/implementation-artifacts/0-4-dependency-vulnerability-gate.md`'s Completion Notes recording that the `next`/`postcss` portion of the original waived baseline is now resolved (AC 3).
- Fixed a real test regression in `tests/components/entry-share-opengraph-image.test.tsx`: the bundled `@vercel/og`'s wasm loading now goes through the global `fetch`, which the tests' blanket fetch mocks unconditionally intercepted. Scoped all 7 mocks in that file to only intercept this app's own `/api/` calls, passing everything else through to the real `fetch`. No application/production code changes were needed — real usage was never affected.
- Ran the full verification suite: `npm test` (848 passed, 1 skipped, no change from baseline), `npm run typecheck` (clean), `npm run build` (succeeds), `npm run audit` (2 vulnerabilities remaining, both Story 0.7's scope).
- Manually smoke-tested sign-in, a protected route's proxy-redirect behavior, and public share routes (including both `ImageResponse`-based opengraph-image endpoints) against a real `npm run dev` server — all behaved correctly post-upgrade.
- Updated `_bmad-output/project-context.md`'s Technology Stack line to `Next.js 16.2.10 + App Router` (Story task).

### File List

- `travelblogs/package.json` (modified — bumped `next`/`eslint-config-next` to `16.2.10`; added `overrides.next.postcss: "8.5.10"`)
- `travelblogs/package-lock.json` (modified — regenerated via `npm install`)
- `travelblogs/tests/components/entry-share-opengraph-image.test.tsx` (modified — scoped fetch mocks to `/api/` URLs, passing through internal wasm-loading fetch calls to the real `fetch`, fixing a test regression exposed by the `next` upgrade; refactored during code review to use the shared `mockAppFetch` helper)
- `travelblogs/tests/components/trip-share-opengraph-image.test.tsx` (modified during code review — applied the same `mockAppFetch` fix; this file had the identical latent wasm/fetch-mock vulnerability but was passing only by accident)
- `travelblogs/tests/components/mock-app-fetch.ts` (added during code review — shared `mockAppFetch` test helper factored out of the duplicated guard in both opengraph-image test files)
- `_bmad-output/project-context.md` (modified — `Next.js (create-next-app latest) + App Router` → `Next.js 16.2.10 + App Router`)
- `_bmad-output/implementation-artifacts/0-4-dependency-vulnerability-gate.md` (modified — addendum recording the `next`/`postcss` waiver resolution)

## Change Log

- 2026-07-19: Upgraded `next`/`eslint-config-next` to `16.2.10` and added an `overrides` pin for the bundled `postcss` (`8.5.10`), clearing the `next`/`postcss` findings from `npm audit`. Fixed a test regression in `entry-share-opengraph-image.test.tsx` caused by the upgraded `@vercel/og`'s wasm loading now going through the global `fetch`. Updated the Story 0.4 waiver note and `project-context.md` accordingly.
