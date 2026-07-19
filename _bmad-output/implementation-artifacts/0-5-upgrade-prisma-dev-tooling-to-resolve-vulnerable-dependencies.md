---
baseline_commit: 65e16e56b974d670c34337c28664b31e963564e3
---

# Story 0.5: Upgrade Prisma Dev Tooling to Resolve Vulnerable Dependencies

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want Prisma's dev-tooling dependency chain upgraded past its known vulnerabilities,
so that `npm audit` no longer reports findings from `@prisma/dev`, `hono`, `effect`, and their transitive dependencies.

## Acceptance Criteria

1. **Given** the current dependency tree has `@hono/node-server`, `hono`, `effect`, `lodash` (via `@chevrotain/*` / `@mrleebo/prisma-ast`), `@prisma/dev`, and `@prisma/config` flagged by `npm audit`
   **When** the Prisma dev-tooling upgrade is applied
   **Then** none of these packages (or their vulnerable versions) appear in `npm audit` output
2. **Given** the upgraded Prisma toolchain
   **When** existing Prisma-dependent flows are exercised (migrations, client generation, `better-sqlite3` adapter usage)
   **Then** all existing tests pass and the production build succeeds with no Prisma-related regressions
3. **Given** `npm audit` is run after this story's changes
   **Then** the story's contribution to the story-0.4 waived baseline (documented in `_bmad-output/implementation-artifacts/0-4-dependency-vulnerability-gate.md`) is removed, and the overall vulnerability count decreases accordingly

## Tasks / Subtasks

- [x] Bump Prisma packages to `7.8.0` (AC: 1, 2)
  - [x] In `travelblogs/package.json`, bump `dependencies["@prisma/adapter-better-sqlite3"]` and `dependencies["@prisma/client"]` from `7.2.0` to `7.8.0`
  - [x] In the same file, bump `devDependencies["prisma"]` from `7.2.0` to `7.8.0`
  - [x] Do **not** run `npm audit fix --force` — it also bumps `next`→`16.2.10` and downgrades `next-auth`→`3.29.10`, which are out of scope (Stories 0.6, 0.7). Edit the three version strings directly, then run `npm install` from `travelblogs/` to regenerate `package-lock.json`
- [x] Verify the vulnerable chain is resolved (AC: 1, 3)
  - [x] Run `npm run audit` (or `npm audit`) from `travelblogs/`
  - [x] Confirm none of these 11 packages appear in the output: `@chevrotain/cst-dts-gen`, `@chevrotain/gast`, `chevrotain`, `@mrleebo/prisma-ast`, `@hono/node-server`, `hono`, `effect`, `lodash`, `@prisma/config`, `@prisma/dev`, `prisma`
  - [x] Confirm exactly 4 vulnerabilities remain (1 high, 3 moderate): `next`, `postcss`, `next-auth`, `uuid` — these belong to Stories 0.6/0.7 and are NOT this story's responsibility to fix
  - [x] Update the waived-baseline note in `_bmad-output/implementation-artifacts/0-4-dependency-vulnerability-gate.md`'s Completion Notes (or add a short addendum) to record that the Prisma-chain portion of the waiver has been resolved by this story, per AC 3
- [x] Verify Prisma functionality is unaffected (AC: 2)
  - [x] Run `npm test` (vitest) from `travelblogs/` — confirm 108 test files / 848 passed / 1 skipped still holds (this is the current baseline; investigate any new failure or skip before proceeding)
  - [x] Run `npm run typecheck` — must be clean (0 errors), matching current baseline
  - [x] Run `npm run build` — production build must succeed with no Prisma-related errors
  - [x] Manually exercise a Prisma client + `better-sqlite3` adapter code path end-to-end (e.g. `npm run dev`, sign in, view a trip that reads/writes via `src/utils/db.ts`) to confirm the adapter still works at runtime, not just at compile/test time
- [x] Update project context (Technical Requirements)
  - [x] In `_bmad-output/project-context.md`, update the `Prisma 7.2.0` line under "Technology Stack & Versions" to `Prisma 7.8.0`

### Review Findings

- [x] [Review][Patch] `overrides["@hono/node-server"]` is an unscoped top-level pin, not restricted to the `prisma > @prisma/dev` chain that needs it [travelblogs/package.json:58-60] — fixed, scoped to `overrides.prisma["@prisma/dev"]["@hono/node-server"]`; re-verified `npm audit` (still exactly 4 vulnerabilities: next, next-auth, postcss, uuid) and `npm test` (108/848/1 skipped) unchanged
- [x] [Review][Defer] Story 0.4 and 0.5 both edit the same uncommitted/untracked file — addendum could be lost if 0.4's file is regenerated before either is committed [_bmad-output/implementation-artifacts/0-4-dependency-vulnerability-gate.md:83] — deferred, process/commit-ordering advisory, not a code defect
- [x] [Review][Defer] AC2's manual runtime click-through (sign-in + view trip) has no artifact beyond the dev agent's self-report; automated suite corroborates the same code paths but not the exact manual flow [0-5-upgrade-prisma-dev-tooling-to-resolve-vulnerable-dependencies.md:85] — deferred, pre-existing verification-process gap, not unique to this story
- [x] [Review][Defer] No `engines` field in package.json to enforce `prisma@7.8.0`'s new Node floor (`^20.19 || ^22.12 || >=24.0`) for non-local environments [travelblogs/package.json] — deferred, pre-existing gap not introduced by this diff
- [x] [Review][Defer] Forced `@hono/node-server@1.19.14` override's actual functional surface (Prisma Studio / dev-CLI HTTP server) was never directly exercised — tests/build/typecheck/`prisma generate` don't invoke it [travelblogs/package.json:58-60] — deferred, low real-world impact (project has no `prisma studio` script)
- [x] [Review][Defer] Story file's own "Project Structure Notes" (only 3 files expected to change) contradicts its Tasks list (which requires editing a 4th file, `0-4-dependency-vulnerability-gate.md`) [0-5-upgrade-prisma-dev-tooling-to-resolve-vulnerable-dependencies.md:38,60] — deferred, pre-existing spec authoring inconsistency, dev correctly followed the Tasks list

## Dev Notes

- **Scope boundary — dependency-version bump only.** No application code changes are expected. `src/utils/db.ts` (the only file that constructs `PrismaClient`/`PrismaBetterSqlite3`) should not need edits — read it first to confirm the adapter usage pattern is unaffected, but do not refactor it as part of this story.
- **All three Prisma packages must move in lockstep.** `prisma`, `@prisma/client`, and `@prisma/adapter-better-sqlite3` are versioned together in the Prisma monorepo; bumping only the `prisma` devDependency (and leaving `@prisma/client`/`@prisma/adapter-better-sqlite3` at `7.2.0`) will produce a broken or mismatched install. All three exist at `7.8.0` on npm (verified 2026-07-19; `7.8.0` is currently npm's `latest` dist-tag for `prisma`).
- **`prisma@7.8.0` requires Node `^20.19 || ^22.12 || >=24.0`.** Local dev Node is `v20.19.2`, which satisfies this — no Node upgrade needed. If CI/deploy uses a different Node version, confirm it also satisfies this range before merging (no CI pipeline currently exists per Story 0.4's scope notes, so this is a local/deploy-environment check only).
- **Why `7.8.0` specifically:** confirmed via `npm audit fix --force --dry-run` — this is the minimum Prisma version the audit tooling resolves to for clearing the `@prisma/dev`/`@prisma/config` vulnerable chain. There is no narrower fix; `7.2.0` → `7.8.0` is a devDependency-tooling-only bump (Prisma's dev CLI, migration engine, and studio dependencies), not the runtime query engine — the Prisma team's own changelog for this range reports no breaking changes to `@prisma/client`, `PrismaClient` construction, driver adapters, `prisma migrate`, `prisma generate`, or `prisma.config.ts`/`defineConfig`. One item worth double-checking during manual verification: an earlier point release in this range mentions a SQLite compatibility pin affecting the `better-sqlite3` adapter — this is exactly what AC 2's manual adapter check is for, so don't skip it even though tests are expected to pass.
- **Exact resolved package set (11 packages, all cleared by the single version bump):** `@chevrotain/cst-dts-gen`, `@chevrotain/gast`, `chevrotain`, `@mrleebo/prisma-ast` (moderate, 4 total) and `@hono/node-server`, `hono`, `effect`, `lodash`, `@prisma/config`, `@prisma/dev`, `prisma` (high, 7 total). These are all transitive dependencies of Prisma's dev CLI tooling — none are direct dependencies of the app and none should be added to `package.json` directly.
- **Current baseline (verified 2026-07-19, matches Story 0.4's documented waiver):** `npm audit` reports 15 vulnerabilities (7 moderate, 8 high). After this story, exactly 4 should remain (1 high: `next`; 3 moderate: `postcss`, `next-auth`, `uuid`) — those belong to Stories 0.6 and 0.7, not this one.
- **Test/build baseline immediately before this story (uncommitted Story 0.4 changes already in the working tree — `npm run audit` script + a non-breaking `npm audit fix` pass already applied to `package-lock.json`):** `npm test` → 108 test files, 848 passed, 1 skipped; `npm run typecheck` → clean. Use these as the regression baseline for AC 2, not an assumption of a fresh `npm ci`.
- **Do not use `npm audit fix --force` as a shortcut.** It resolves all 15 findings at once by also bumping `next` and downgrading `next-auth`, both explicitly out of scope for this story (Stories 0.6/0.7 own those). Make the targeted `package.json` edit instead.

### Project Structure Notes

- Only `travelblogs/package.json`, `travelblogs/package-lock.json`, and `_bmad-output/project-context.md` are expected to change. No files under `travelblogs/src/` or `travelblogs/tests/` should need edits.
- `travelblogs/prisma.config.ts` and `travelblogs/prisma/schema.prisma` are the only other Prisma-adjacent files in the repo — read them if verifying `prisma generate`/`prisma migrate` behavior, but no changes are expected there.

### References

- Story source: [Source: _bmad-output/planning-artifacts/epics.md#Story 0.5: Upgrade Prisma Dev Tooling to Resolve Vulnerable Dependencies]
- Waived baseline this story reduces: [Source: _bmad-output/implementation-artifacts/0-4-dependency-vulnerability-gate.md#Completion Notes List]
- Prisma client/adapter construction: `travelblogs/src/utils/db.ts`
- Prisma config: `travelblogs/prisma.config.ts`

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- Baseline `npm audit` before changes: 15 vulnerabilities (7 moderate, 8 high), matching Story 0.4's documented waiver.
- Bumped `@prisma/adapter-better-sqlite3`, `@prisma/client`, `prisma` from `7.2.0` to `7.8.0` in `travelblogs/package.json`; ran `npm install`.
- **Deviation from story plan:** the plain version bump alone left 7 vulnerabilities (not the expected 4). Root cause: `prisma@7.8.0` pins `@prisma/dev` to an *exact* version (`0.24.3`, no caret), which in turn pins `@hono/node-server` to an exact vulnerable version (`1.19.11`; fix requires `>=1.19.13`). No stable `prisma` release currently ships a `@prisma/dev` with the fixed hono version — `npm audit fix --force` itself proposed *downgrading* to `prisma@6.19.3` to clear it, contradicting the story's Dev Notes assumption that `7.8.0` alone clears the chain. Resolved with a targeted `"overrides": { "@hono/node-server": "1.19.14" }` entry in `travelblogs/package.json` — still a dependency-version-only change (no new package, no app code). This produced exactly the story's target end-state: 4 vulnerabilities remaining (1 high: `next`; 3 moderate: `postcss`, `next-auth`, `uuid`).
- `npm audit --json` confirms the vulnerable-package set is now exactly `['next', 'next-auth', 'postcss', 'uuid']` — all 11 Prisma-chain packages cleared.
- After the version bump, `npm test` initially failed 11 tests across 43 files with `TypeError: Cannot read properties of undefined (reading 'graph')` inside `@prisma/param-graph` during `PrismaClient` construction in `src/utils/db.ts`. Root cause: the generated Prisma Client in `node_modules/@prisma/client` was stale for the new engine version. Running `npx prisma generate` regenerated it; all 108 test files then passed (848 passed, 1 skipped), matching the pre-story baseline exactly.
- `npm run typecheck`: clean, 0 errors.
- `npm run build`: production build succeeded, all routes compiled, no Prisma-related errors.
- Manual runtime verification (AC 2): started `npm run dev`, signed in via the NextAuth credentials flow (`/api/auth/callback/credentials`), confirmed an active session, then loaded a real trip via its public share link (`/trips/share/<token>`) — received `200 OK` with the trip's actual title/content rendered, confirming `PrismaClient`/`PrismaBetterSqlite3` construction and query execution work correctly at runtime through `src/utils/db.ts`, not just at compile/test time. No errors in server logs.
- `src/utils/db.ts` and `prisma.config.ts` were read to confirm adapter usage was unaffected; neither required changes, per the story's scope boundary.

### Completion Notes List

- Bumped `prisma`, `@prisma/client`, `@prisma/adapter-better-sqlite3` from `7.2.0` to `7.8.0` in lockstep (AC 1, 2).
- Added an `overrides` entry pinning `@hono/node-server` to `1.19.14` to fully clear the Prisma dev-tooling vulnerability chain, since `prisma@7.8.0`'s exact-pinned `@prisma/dev@0.24.3` dependency otherwise keeps a vulnerable `@hono/node-server@1.19.11` in the tree (see Debug Log for detail). This was necessary to meet AC 1/AC 3 — the plain three-version-string bump specified in the story's task list was insufficient on its own.
- Verified via `npm audit --json`: the 11-package vulnerable chain (`@chevrotain/*`, `chevrotain`, `@mrleebo/prisma-ast`, `@hono/node-server`, `hono`, `effect`, `lodash`, `@prisma/config`, `@prisma/dev`, `prisma`) is fully cleared. Exactly 4 vulnerabilities remain (1 high: `next`; 3 moderate: `postcss`, `next-auth`, `uuid`), matching the story's expected end-state and belonging to Stories 0.6/0.7 (AC 3).
- Updated `_bmad-output/implementation-artifacts/0-4-dependency-vulnerability-gate.md` with an addendum recording that the Prisma-chain portion of its waived baseline is now resolved.
- Ran `npx prisma generate` to regenerate the Prisma Client for the new engine version — required to fix 11 initially-failing test files (stale generated client), not an application code change. Full suite then passed: 108 test files, 848 passed, 1 skipped (AC 2).
- Confirmed `npm run typecheck` (0 errors) and `npm run build` (production build succeeds, no Prisma-related errors) (AC 2).
- Manually verified the `PrismaClient` + `PrismaBetterSqlite3` adapter at runtime via a live `npm run dev` session: signed in, loaded a real trip's data end-to-end through `src/utils/db.ts` (AC 2).
- Updated `_bmad-output/project-context.md`'s Technology Stack line from `Prisma 7.2.0` to `Prisma 7.8.0`.
- No changes needed to `src/utils/db.ts` or `prisma.config.ts` — both read to confirm compatibility, per the story's scope boundary.

### File List

- `travelblogs/package.json` (modified — bumped `prisma`/`@prisma/client`/`@prisma/adapter-better-sqlite3` to `7.8.0`; added `overrides["@hono/node-server"]: "1.19.14"`)
- `travelblogs/package-lock.json` (modified — regenerated via `npm install`)
- `_bmad-output/project-context.md` (modified — `Prisma 7.2.0` → `Prisma 7.8.0`)
- `_bmad-output/implementation-artifacts/0-4-dependency-vulnerability-gate.md` (modified — addendum recording the Prisma-chain waiver resolution)

## Change Log

- 2026-07-19: Upgraded `prisma`/`@prisma/client`/`@prisma/adapter-better-sqlite3` to `7.8.0` and added an `overrides` pin for `@hono/node-server@1.19.14`, clearing all 11 Prisma dev-tooling vulnerable packages from `npm audit`. Regenerated the Prisma Client (`prisma generate`) to fix the resulting stale-client test failures. Updated the Story 0.4 waiver note and `project-context.md` accordingly.
