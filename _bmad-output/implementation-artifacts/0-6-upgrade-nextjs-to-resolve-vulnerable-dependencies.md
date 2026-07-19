---
baseline_commit: 65e16e56b974d670c34337c28664b31e963564e3
---

# Story 0.6: Upgrade Next.js to Resolve Vulnerable Dependencies

Status: ready-for-dev

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

- [ ] Bump Next.js to `16.2.10` (AC: 1, 2)
  - [ ] In `travelblogs/package.json` `dependencies`, bump `"next"` from `"16.1.0"` to `"16.2.10"`
  - [ ] In the same file's `devDependencies`, bump `"eslint-config-next"` from `"16.1.0"` to `"16.2.10"` to keep the lint config in lockstep with the `next` version (confirmed `eslint-config-next@16.2.10` exists on npm)
  - [ ] Do **not** run `npm audit fix --force` — depending on whether Story 0.5 (Prisma) has already landed, it may also touch the Prisma chain or downgrade `next-auth`→`3.29.10` (Story 0.7's scope, out of scope here). Edit the two version strings directly, then run `npm install` from `travelblogs/` to regenerate `package-lock.json`
- [ ] Verify the vulnerable chain is resolved (AC: 1, 3)
  - [ ] Run `npm run audit` (or `npm audit`) from `travelblogs/`
  - [ ] Confirm neither `next` nor its bundled `node_modules/next/node_modules/postcss` appear in the output
  - [ ] Confirm the only vulnerabilities still permitted to remain are `next-auth`/`uuid` (Story 0.7's scope) and, if Story 0.5 has not yet landed, the Prisma dev-tooling chain (Story 0.5's scope) — this story must not touch either
  - [ ] Add a short addendum to `_bmad-output/implementation-artifacts/0-4-dependency-vulnerability-gate.md`'s Completion Notes recording that the `next`/`postcss` portion of the waived baseline has been resolved by this story, per AC 3
- [ ] Verify application behavior is unaffected (AC: 2)
  - [ ] Run `npm test` (vitest) from `travelblogs/` — confirm no regressions vs. the current baseline (108 test files / 848 passed / 1 skipped as of Story 0.4/0.5; re-baseline if Story 0.5 has landed and changed this count)
  - [ ] Run `npm run typecheck` — must be clean (0 errors)
  - [ ] Run `npm run build` — production build must succeed with no Next.js-related errors
  - [ ] Start the app (`npm run dev` or the production `start` script, which runs the custom `server.js`) and manually smoke-test: sign-in (`0-1`), viewing a trip (App Router routes), and at least one shared-link route under `src/app/trips/share/[token]/...`
  - [ ] Manually verify `src/proxy.ts` (145 lines — the proxy-gated route allowlist added in `13-4-migrate-middleware-to-proxy`) still enforces auth-redirects correctly on a protected route and still allows the public share routes through
  - [ ] Re-check `next.config.ts`'s `experimental.proxyClientMaxBodySize` and `experimental.serverActions.bodySizeLimit` settings still take effect (e.g. via a media upload) — these are experimental-flag surface area most likely to shift between Next minor versions
- [ ] Update project context (Technical Requirements)
  - [ ] In `_bmad-output/project-context.md`, update the `Next.js (create-next-app latest) + App Router` line under "Technology Stack & Versions" to note the pinned version, e.g. `Next.js 16.2.10 + App Router`

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

### Debug Log References

### Completion Notes List

### File List
