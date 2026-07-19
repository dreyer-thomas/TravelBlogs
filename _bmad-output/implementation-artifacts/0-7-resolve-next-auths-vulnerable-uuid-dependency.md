---
baseline_commit: 65e16e56b974d670c34337c28664b31e963564e3
---

# Story 0.7: Resolve next-auth's Vulnerable uuid Dependency

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want the vulnerable `uuid` dependency pulled in by `next-auth` resolved,
so that `npm audit` no longer reports this finding.

## Acceptance Criteria

1. **Given** `npm audit fix --force`'s suggested resolution is to downgrade `next-auth` from `4.24.13` to `3.29.10` (a major-version downgrade)
   **When** this story investigates the actual fix
   **Then** the vulnerability is resolved via an upgrade or patch that does **not** reduce `next-auth`'s major version (e.g. a newer `next-auth`/Auth.js release that drops the vulnerable `uuid` dependency, or a direct `uuid` override), unless investigation shows no such path exists — in which case the downgrade option is presented to the user for an explicit decision before implementation proceeds
2. **Given** the resolved dependency
   **When** existing sign-in, session, and account-deactivation flows are exercised (Stories 0.1, 0.3, 5.2)
   **Then** all existing authentication tests pass with no regressions
3. **Given** `npm audit` is run after this story's changes
   **Then** `uuid` no longer appears in `npm audit` output, and the story's contribution to the story-0.4 waived baseline is removed

## Tasks / Subtasks

- [ ] Apply the `uuid` override — do not touch `next-auth` itself (AC: 1)
  - [ ] **This story's investigation is already complete — do not re-research options; apply the override directly.** See Dev Notes for the full investigation record: no `next-auth@4.x` release (through the currently-installed `4.24.14`) drops the `uuid` dependency — every 4.x version on npm pins `uuid: ^8.3.2`. The only release line that removes `uuid` entirely is `next-auth@5`/`@auth/core` (currently `5.0.0-beta.31`, pre-1.0, with breaking config/API changes) — not viable for this story. AC 1's fallback path applies: use a direct `uuid` override.
  - [ ] In `travelblogs/package.json`, add `"uuid": "^14.0.1"` to the existing top-level `"overrides"` block (currently `{ "@hono/node-server": "1.19.14" }` from Story 0.5's Prisma work — add alongside it, do not replace it)
  - [ ] Run `npm install` from `travelblogs/` to apply the override and regenerate `package-lock.json`
  - [ ] Confirm the resolved tree now has a single `uuid@14.0.1` (or whatever `^14.0.1` resolves to) under `next-auth` via `npm ls uuid`
- [ ] Verify the vulnerable dependency is resolved (AC: 1, 3)
  - [ ] Run `npm run audit` (or `npm audit`) from `travelblogs/`
  - [ ] Confirm `uuid` no longer appears in the output
  - [ ] Confirm `next-auth` itself no longer appears in the output as a `uuid`-related finding (the separate `next-auth` moderate finding in the current tree is caused by this same `uuid` transitive dependency — check that it clears too; if `next-auth` still shows a *different*, unrelated finding after the override, that is out of this story's scope and should be flagged, not silently fixed)
  - [ ] Confirm the only vulnerabilities still permitted to remain (if Story 0.5/0.6 have not yet fully landed) are the Prisma dev-tooling chain (Story 0.5) and/or `next`/`postcss` (Story 0.6) — this story must not touch either
  - [ ] Add a short addendum to `_bmad-output/implementation-artifacts/0-4-dependency-vulnerability-gate.md`'s Completion Notes recording that the `uuid`/`next-auth` portion of the waived baseline has been resolved by this story, per AC 3
- [ ] Verify authentication behavior is unaffected (AC: 2)
  - [ ] Run `npm test` (vitest) from `travelblogs/` — pay particular attention to `tests/api/auth/credentials.test.ts`, `tests/api/auth/proxy.test.ts`, and `tests/components/sign-in-page.test.tsx`; confirm no regressions vs. the current baseline (re-baseline the pass count if Stories 0.5/0.6 have landed and changed it)
  - [ ] Run `npm run typecheck` — must be clean (0 errors)
  - [ ] Run `npm run build` — production build must succeed
  - [ ] Manually smoke-test: sign in (Story 0.1 flow), sign out, and reload the app to confirm the session persists (JWT round-trip exercises the `uuid.v4()` call this override touches — see Dev Notes) — a broken `jti` generation would surface as a session/JWT decode failure at sign-in, not a compile error
  - [ ] Manually verify a deactivated account (Story 0.3) is still correctly denied sign-in with "Account is inactive"
- [ ] Update project context (only if needed)
  - [ ] `_bmad-output/project-context.md`'s `Auth.js (NextAuth) 4.24.13` line does **not** need to change — `next-auth`'s own version is untouched by this story, only its transitive `uuid` dependency is overridden. Do not edit this line.

## Dev Notes

- **Scope boundary — dependency override only, no application code changes.** `next-auth`'s own version stays at `^4.24.13` (currently resolving to `4.24.14`). Only `travelblogs/package.json`'s `overrides` block and the regenerated `package-lock.json` should change. No files under `travelblogs/src/` should need edits.
- **Investigation already done — apply the conclusion, don't repeat the research.** This is the specific finding, verified 2026-07-19:
  - Current tree: `next-auth@4.24.14` → `uuid@8.3.2`. `npm audit` flags `uuid` moderate (`GHSA-w5hq-g745-h8pq`, missing buffer bounds check in v3/v5/v6, range `<11.1.1`) and a related `next-auth` moderate finding whose `fixAvailable` is `next-auth@3.29.10` (the major-version downgrade AC 1 explicitly rejects).
  - Checked every `next-auth@4.x` version's published `dependencies` on the npm registry, from `4.0.0` through the current `latest` (`4.24.14`): **all of them pin `uuid: ^8.3.2`.** There is no 4.x patch/minor release that upgrades or drops `uuid`.
  - `next-auth@5` (dist-tag `beta`, currently `5.0.0-beta.31`) replaced the internal JWT/uuid usage entirely — its only runtime dependency is `@auth/core` (`0.41.2`), which does **not** depend on `uuid` at all. This is the "release that drops the vulnerable uuid dependency" AC 1 anticipates, but it is pre-1.0 beta software with a different API surface (provider config shape, `signIn`/`signOut`/`auth()` helpers, session handling) — adopting it is a substantially larger, breaking change than this story's scope (a dependency-version fix only, per the epic's explicit instruction not to change the auth provider or session strategy). **Not used for this story.**
  - Conclusion: no non-downgrade `next-auth` release exists that resolves this. AC 1's override fallback applies.
  - **Where `uuid` is actually used** (confirmed by reading `node_modules/next-auth/jwt/index.js:17,44`): `next-auth`'s JWT encoding calls `uuid.v4()` once, to set the `jti` (JWT ID) claim when signing a session token. This is the only call site in the installed `next-auth` version.
  - **Override compatibility confirmed:** `uuid@11.1.1` (the minimum non-vulnerable version) and the current `latest` (`uuid@14.0.1`) both still export a CJS build reachable via `require("uuid")` (`package.json` `exports["."].node.require` → `./dist/cjs/index.js` for `11.1.1`), and both still export a `v4` named function — the only API `next-auth`'s installed version touches. `require("uuid").v4` continues to resolve correctly under the override; no shim or `require` interop workaround is needed. **Use `^14.0.1`** (current latest at investigation time) rather than pinning the exact minimum-fix version, matching the precedent set by Stories 0.5/0.6 of resolving to current-latest where compatible rather than the bare minimum.
  - `npm ls uuid` in the current tree shows `uuid` has exactly one consumer (`next-auth`) — no other package in the dependency tree touches it, so this override has no other blast radius to check.
- **`overrides` mechanism already exists in this file — extend it, don't create a new one.** `travelblogs/package.json` already has an `"overrides": { "@hono/node-server": "1.19.14" }` block from Story 0.5's Prisma dev-tooling work. Add `"uuid": "^14.0.1"` as a second key in the same object.
- **This story's changes land on top of in-flight Stories 0.5/0.6.** At this story's drafting (2026-07-19), Story 0.5 (Prisma) is `in-progress` and has already partially modified `travelblogs/package.json`/`package-lock.json` (prisma-related packages bumped to `7.8.0`) and Story 0.6 (Next.js) is `ready-for-dev` (not yet started, `next` still at `16.1.0`). **Run `npm run audit` fresh at the start of implementation** rather than assuming a specific baseline count — this story's scope is strictly the `uuid`/`next-auth` finding; leave any Prisma-chain or `next`/`postcss` findings (in whatever state they're in) alone.
- **Do not use `npm audit fix --force`.** It will suggest (and if blindly accepted, apply) the `next-auth@3.29.10` downgrade this story exists specifically to avoid, and may also touch the Prisma/Next chains outside this story's scope. Apply the targeted `overrides` edit instead.
- **Precedent for this exact story pattern:** Stories 0.5 and 0.6 are the sibling stories for the Prisma and Next.js vulnerability chains, following an identical pattern (targeted `package.json` edit → `npm install` to regenerate the lockfile → verify via `npm run audit`/`npm test`/`npm run typecheck`/`npm run build`). This story follows the same verification rigor, but the edit itself is an `overrides` entry rather than a direct dependency version bump, since the vulnerable package is transitive.

### Project Structure Notes

- Only `travelblogs/package.json`, `travelblogs/package-lock.json`, and `_bmad-output/implementation-artifacts/0-4-dependency-vulnerability-gate.md` (Completion Notes addendum) are expected to change. No files under `travelblogs/src/` or `travelblogs/tests/` should need edits — this is a dependency-resolution fix, not a behavior change.
- Relevant existing auth test files (read, do not need to edit, unless a genuine regression surfaces): `travelblogs/tests/api/auth/credentials.test.ts`, `travelblogs/tests/api/auth/proxy.test.ts`, `travelblogs/tests/components/sign-in-page.test.tsx`.
- `next-auth`'s JWT/uuid usage lives in its own package code (`node_modules/next-auth/jwt/index.js`), not in this repo's `src/` — nothing there is expected to change.

### References

- Story source: [Source: _bmad-output/planning-artifacts/epics.md#Story 0.7: Resolve next-auth's Vulnerable uuid Dependency]
- Waived baseline this story reduces: [Source: _bmad-output/implementation-artifacts/0-4-dependency-vulnerability-gate.md#Completion Notes List]
- Sibling stories (same pattern, different package): [Source: _bmad-output/implementation-artifacts/0-5-upgrade-prisma-dev-tooling-to-resolve-vulnerable-dependencies.md], [Source: _bmad-output/implementation-artifacts/0-6-upgrade-nextjs-to-resolve-vulnerable-dependencies.md]
- Existing `overrides` block to extend: `travelblogs/package.json` (`overrides.@hono/node-server`, added by Story 0.5)
- `uuid` call site inside next-auth: `travelblogs/node_modules/next-auth/jwt/index.js:17,44` (`require("uuid")`, `.v4()` for JWT `jti`)
- Auth flows this story must not regress: Story 0.1 (creator sign-in), Story 0.3 (deactivate account), Story 5.2 (multi-user sign-in)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
