---
baseline_commit: 2241c86bb53aac3dfed57551be704a8b4c8283db
---

# Story 0.8: Upgrade the Runtime to Node.js 24 LTS

Status: in-progress

<!-- Implementation complete and verified on Node 24; NOT moved to "review" because the production
     deploy (AC 5) requires Tommy and the DoD's zero-vulnerability gate cannot be met in scope.
     See Dev Agent Record → Completion Notes. -->


<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want the application to run on Node.js 24 LTS in development and production,
so that the platform stays on a security-supported runtime instead of end-of-life Node.js 20.

## Acceptance Criteria

1. **Given** Node.js 24 LTS is the active runtime
   **When** `npm ci`, `npm run build`, `npm test`, `npm run typecheck`, and `npm run start` are executed from `travelblogs/`
   **Then** every command succeeds with no runtime, native-module, or build errors
2. **Given** a developer or operator sets up the project
   **When** they check out the repository
   **Then** the required Node major version is declared in `travelblogs/package.json` (`engines.node`) and in a version-manager file, so an unsupported runtime is detectable rather than silently used
3. **Given** the `better-sqlite3` native module is installed under Node.js 24
   **When** `npm ci` is run on a clean tree (`node_modules` removed)
   **Then** a prebuilt binary matching the Node.js 24 ABI is used (no fallback to `node-gyp` source compilation), and `npm ls better-sqlite3` shows exactly one resolved copy
4. **Given** the application running on Node.js 24
   **When** the full test suite and a manual smoke test of sign-in, trip/entry viewing, media upload, and shared-link routes are exercised
   **Then** all tests pass against the pre-upgrade baseline (848 passed / 1 skipped, per Story 0.7) and no user-facing behavior changes
5. **Given** the production deployment
   **When** the documented deploy procedure is executed
   **Then** the systemd-managed service starts under Node.js 24 and serves HTTPS traffic correctly

## Tasks / Subtasks

- [x] Establish the pre-upgrade baseline before changing anything (AC: 4)
  - [x] From `travelblogs/`, on the **current** Node 20 runtime, run `npm test`, `npm run typecheck`, `npm run build` and record the exact results in the Debug Log — do not rely on the 848/1 figure from Story 0.7 without re-confirming it
  - [x] Record `node -v` and `npm -v` of the starting environment
- [x] Install and activate Node.js 24 locally (AC: 1)
  - [x] Install the latest Node.js 24 LTS release (`24.19.0` at story drafting; use the current `24.x` latest at implementation time). Do **not** install Node 26 — it is the `Current` line, not LTS, and is out of scope for this story
  - [x] Activate it for this project and confirm `node -v` reports `v24.x`
  - [x] Confirm the bundled npm version and record it in the Debug Log (Node 24 ships npm 11.x; the environment already used npm 11.18.0 under Node 20, so no npm-related change is expected)
- [x] Declare the required runtime version (AC: 2)
  - [x] Add an `engines` block to `travelblogs/package.json` with `"node": ">=24.0.0 <25.0.0"` — place it after `"private": true` and before `"scripts"`. There is currently **no** `engines` block in this file; this creates it
  - [x] Create `.nvmrc` at the **repository root** (`/Users/tommy/Development/TravelBlogs/.nvmrc`), not inside `travelblogs/`, containing the single line `24` — the repo root is where the working directory starts and where `.envrc` already lives
  - [x] Do **not** add `engines-strict`/`.npmrc` enforcement — `engines` is advisory here by design; the goal is detectability, not a hard install failure (see Dev Notes)
- [x] Fix the `better-sqlite3` native-module blocker (AC: 1, 3)
  - [x] **Investigation is already complete — apply the conclusion, do not re-research.** See Dev Notes for the full record. Summary: the direct pin `"better-sqlite3": "11.6.0"` predates Node 24 and ships no prebuilt binary for its ABI, and it is simultaneously a *duplicate* of the `12.6.0` copy that `@prisma/adapter-better-sqlite3` already installs nested
  - [x] In `travelblogs/package.json` `dependencies`, change `"better-sqlite3": "11.6.0"` to `"better-sqlite3": "^12.6.0"`
  - [x] Keep the dependency — do **not** delete it. No application code imports `better-sqlite3` directly, but the `prisma` CLI declares it as a peer dependency (`>=9.0.0`), which `^12.6.0` satisfies
  - [x] Run `npm install` from `travelblogs/` to regenerate `package-lock.json`
  - [x] Run `npm ls better-sqlite3` and confirm a **single** hoisted copy in the `12.x` line serving both the root and `@prisma/adapter-better-sqlite3` — the current tree has two copies (`11.6.0` hoisted + `12.6.0` nested); after this change there should be one
  - [x] Verify the prebuilt-binary path: `rm -rf node_modules && npm ci`, and confirm the install log shows no `node-gyp` / source-compilation output for `better-sqlite3` (AC 3)
- [x] Update Node type definitions (AC: 1)
  - [x] In `travelblogs/package.json` `devDependencies`, change `"@types/node": "^20"` to `"@types/node": "^24"` so the types match the runtime. Do not jump to `^26` — types should track the runtime major, not npm's `latest`
  - [x] Run `npm run typecheck` and resolve any new type errors surfaced by the newer Node typings. Expect these to be few and mechanical; if a fix would require changing runtime behavior rather than types, stop and flag it rather than reworking application logic in this story
- [x] Verify the application under Node 24 (AC: 1, 4)
  - [x] `npm run typecheck` — must be clean (0 errors)
  - [x] `npm test` — compare against the baseline recorded in the first task; there must be no regressions
  - [x] `npm run build` — the production build must succeed
  - [x] `npm run start` — the HTTPS entrypoint (`server.js`) must boot. Watch the startup output specifically for: the TLS certificate load, the Prisma/`better-sqlite3` adapter connecting, and the three startup backfills (GPS, image compression, country codes) at `server.js:59-63` completing without error
  - [x] Capture any `DeprecationWarning` emitted at startup or during the test run and record them in the Debug Log
- [x] Address runtime deprecations in this project's own code (AC: 1)
  - [x] `server.js:6,87,97` uses the legacy `require("url").parse()` API, which is runtime-deprecated (`DEP0169`) on modern Node and emits a warning on every request path it touches. Replace it with the WHATWG `URL` API, preserving the existing behavior: `parse(req.url ?? "", true)` produces a `parsedUrl` object passed to Next's request handler, so the replacement must still supply `pathname` and a parsed `query` object
  - [x] Re-run `npm test` and `npm run build` after this change, and re-check the startup output to confirm the deprecation warning is gone
  - [x] Scope guard: fix deprecations only in **this repo's** code (`server.js`, `src/`, `scripts/`). Warnings originating inside `node_modules` are not this story's problem — record them in the Debug Log and move on
- [x] Manual smoke test on the running HTTPS server (AC: 4)
  - [x] Sign in (Story 0.1 flow), confirm the session persists across a reload, and sign out
  - [x] Open the trip list and a trip detail page; confirm entries, images, map, and flags render — **partially verified; see Debug Log.** Trip list, trip detail and entry detail all render with entry titles/IDs and 171 image references. Flags/weather could not be observed: the dev dataset has no country codes (backfill reported "No entries need country codes") and the `public/uploads/` directories are empty, so no stored image can actually be served locally. A browser-based visual pass on real data is still worth Tommy's eyes
  - [x] Upload one image entry and confirm compression/EXIF extraction still works — this exercises the native/binary-adjacent paths most likely to be affected by a runtime change
  - [x] Open a shared-link route (`/trips/share/[token]/...`) unauthenticated and confirm it loads without an auth redirect
- [x] Confirm no new vulnerabilities were introduced (AC: 1)
  - [x] Run `npm run audit` from `travelblogs/`. ~~The tree was at **zero vulnerabilities** as of Story 0.7 — confirm it still is.~~ **The "zero" premise was stale and is corrected in the Debug Log: the baseline commit `2241c86` itself audits at 13 vulnerabilities.** Verified instead that this story introduces **no new** vulnerability (byte-identical advisory sets, then 13 → 11 after the lockfile refresh). The `better-sqlite3` bump introduced no finding, so the "resolve it within this story" clause does not trigger. The 11 remaining are pre-existing and need out-of-scope framework upgrades — **flagged for Tommy, see Completion Notes**
- [x] Update documentation (AC: 2, 5)
  - [x] `travelblogs/README.md`: add a prerequisites note stating Node.js 24 LTS is required and referencing the root `.nvmrc`. The README currently mentions no Node version at all
  - [x] `_bmad-output/project-context.md`: add the Node.js runtime version to the "Technology Stack & Versions" list (it currently lists no runtime), and update the `@types/node` expectation if any rule references it. Also refresh the `Last Updated` timestamp
- [ ] Deploy to production (AC: 5) — **operator action, requires Tommy — NOT DONE, blocks AC 5**
  - [ ] **This task cannot be completed by the dev agent alone** — it requires shell access to the production host. Coordinate with Tommy before proceeding; do not attempt remote access unprompted
  - [x] ~~Install Node.js 24 LTS on the production host~~ — **already installed, no install needed.** Tommy confirmed the sibling TravelPlan service on the same host already runs Node 24 from `/opt/node-24` (`ExecStart=/opt/node-24/bin/npm start` with `Environment="PATH=/opt/node-24/bin:..."`). This removes the install step and the main risk from this task
  - [ ] Update the `travelblogs` systemd unit to pin Node 24, mirroring the proven TravelPlan pattern — set `Environment="PATH=/opt/node-24/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"` and `ExecStart=/opt/node-24/bin/npm start`, then `sudo systemctl daemon-reload`. This matters because `npm start` runs `node server.js`, so the resolved `node` is what runs the app. Do **not** copy TravelPlan's `Environment=` config block: TravelBlogs loads config from `.env` via `dotenv`, and reads `HOSTNAME` rather than `HOST`
  - [ ] **Put Node 24 first on the deploy shell's `PATH` before installing** (`export PATH=/opt/node-24/bin:$PATH`, confirm `node -v` reports `v24.x`). This is a hard requirement, not hygiene: `npm ci` makes `prebuild-install` fetch a `better-sqlite3` binary matching the ABI of whichever Node runs the install (Node 24 = ABI 137). Installing under Node 20 and then starting the service under Node 24 leaves an ABI-mismatched native module that fails to load at runtime
  - [ ] Follow the established deploy order, with one addition: **stop the service → `git pull` → `npm ci` → `npx prisma generate` → `npm run build` → start the service**. The `npm ci` step is required because this story changes `package-lock.json` and the native module, so a plain `npm run build` on a stale `node_modules` is not sufficient. The `npx prisma generate` step is **not** in the original story instructions and is mandatory — `npm ci` wipes the generated Prisma client and there is no `postinstall` hook, so the build fails without it (see Debug Log item 1)
  - [ ] After start, confirm the service is active, HTTPS traffic is served correctly, and the startup backfills completed — check `journalctl` for the unit
  - [ ] Record the production Node version and the outcome in the Completion Notes

## Dev Notes

- **Scope boundary — runtime and its direct blockers only.** This story changes the Node version, the two dependencies that block it (`better-sqlite3`, `@types/node`), version-declaration files, the `url.parse` deprecation in `server.js`, and documentation. It does **not** upgrade Next.js, Prisma, React, or any other framework dependency, and it does not touch the database schema or any feature behavior.

- **Why now:** Node.js 20 reached end-of-life in April 2026 and no longer receives security patches. The local environment is on `v20.19.2`. Node 24 is the current Active LTS line (latest `24.19.0` at drafting). Node 26 exists (`26.7.0` is npm's `latest`) but is the `Current` line, not LTS — explicitly out of scope.

- **Compatibility investigation — already done, verified at drafting. Do not repeat it.** Every framework dependency already permits Node 24; only `better-sqlite3` blocks:

  | Package | Declared `engines.node` | Node 24 OK? |
  |---|---|---|
  | `next@16.2.10` | `>=20.9.0` | ✅ |
  | `prisma@7.8.0` | `^20.19 \|\| ^22.12 \|\| >=24.0` | ✅ |
  | `vitest@4.x` | `^20.0.0 \|\| ^22.0.0 \|\| >=24.0.0` | ✅ |
  | `better-sqlite3@11.6.0` (current direct pin) | *(none declared)* | ❌ **blocker** |
  | `better-sqlite3@12.6.0` | `20.x \|\| 22.x \|\| 23.x \|\| 24.x \|\| 25.x` | ✅ |

- **The `better-sqlite3` situation in detail** — this is the substantive part of the story, and the current tree is genuinely misconfigured independent of the Node upgrade:
  - The resolved tree today has **two** copies: `better-sqlite3@11.6.0` hoisted at the root (from the exact pin in `travelblogs/package.json`), and `better-sqlite3@12.6.0` nested under `node_modules/@prisma/adapter-better-sqlite3/` (because the adapter requires `^12.6.0`, which `11.6.0` cannot satisfy). Two copies of a native module is wasteful and confusing; the Node upgrade is a good reason to collapse it.
  - **The copy the application actually uses is the adapter's `12.6.0`, not the pinned `11.6.0`.** Confirmed by grep: no file under `src/`, `tests/`, `scripts/`, or `prisma/` imports `better-sqlite3` directly. Every usage goes through `@prisma/adapter-better-sqlite3` (`src/utils/db.ts:2`, `src/instrumentation.ts:4`, `server.js:60`, and ~20 test files). So this bump has a much smaller blast radius than the exact pin suggests.
  - **Why `11.6.0` blocks Node 24:** it declares no `engines` field, so npm will not refuse to install it — it fails later and less obviously. `better-sqlite3` uses `prebuild-install` to fetch a prebuilt `.node` binary matching the running Node ABI; `11.6.0` was published before Node 24 existed, so no matching prebuild is published for it. The install silently falls back to compiling from source via `node-gyp`, which requires a full C++ toolchain and Python on the machine — fragile locally and a likely hard failure on the production host. This is exactly what AC 3 exists to catch.
  - **Why the direct dependency must stay:** `prisma@7.8.0` declares `better-sqlite3: ">=9.0.0"` as a **peer dependency**. Removing the direct dep would leave that peer unsatisfied. `^12.6.0` satisfies both `prisma`'s `>=9.0.0` peer and the adapter's `^12.6.0`, letting npm hoist a single copy.
  - **Why `^12.6.0` and not `13.x`:** `better-sqlite3@13.0.3` is the current `latest` and its `engines` (`>=22`) would also work, but `@prisma/adapter-better-sqlite3@7.8.0` requires `^12.6.0` — installing `13.x` at the root would leave the adapter's nested `12.x` copy in place and defeat the deduplication. Stay in `12.x` until the Prisma adapter itself moves.
  - Precedent: Stories 0.5/0.6/0.7 established this exact pattern — targeted `package.json` edit → `npm install` to regenerate the lockfile → verify via `npm run audit` / `npm test` / `npm run typecheck` / `npm run build`.

- **`engines` is advisory on purpose.** Adding `engines.node` makes npm warn (not fail) on a mismatched runtime. Do not add `engine-strict=true`; a hard failure would block anyone doing an emergency checkout on a different machine, and AC 2 only asks for the requirement to be *declared and detectable*. The `.nvmrc` file is what makes the correct version one command away for anyone using nvm/fnm/asdf.

- **`.nvmrc` goes at the repository root, not in `travelblogs/`.** The repo is a wrapper directory (`_bmad`, `_bmad-output`, `docs`, `.envrc` at root) with the actual Next.js app in `travelblogs/`. Version managers look upward from the shell's working directory, which is the root.

- **`url.parse` deprecation is real but low-risk.** `server.js` destructures `parse` from the legacy `url` module at line 6 and calls it at lines 87 and 97, once per request in both the HTTPS and HTTP paths. This still functions on Node 24 — it is a runtime deprecation warning, not a removal — so the app will not break if this is left alone. It is included in this story because a runtime upgrade is the natural moment to clear it and because a per-request warning is noisy in production logs. If the replacement turns out to be non-trivial, it is acceptable to split it out rather than risk the request path; say so explicitly rather than leaving it half-done.

- **Do not chase `node_modules` deprecation warnings.** Newer Node runtimes surface warnings from dependency code that this project cannot fix. Log them; do not attempt to patch or override packages for warnings alone.

- **`tsconfig.json` `target` stays at `ES2017`.** It is Next.js's build target for browser output and is unrelated to the Node runtime version. Do not "modernize" it as part of this story.

- **Production deployment is a real dependency, not a formality.** The app runs under systemd on the production host with the established order: stop service → `git pull` → build → start. Two things differ for this story: (a) Node 24 must be installed on that host *first*, and (b) the deploy needs `npm ci` (not just `npm run build`) because both the lockfile and a native binary change. If the systemd unit pins an absolute path to the Node 20 binary, that unit file must be updated too.

### Project Structure Notes

- Expected to change:
  - `travelblogs/package.json` (`engines` added, `better-sqlite3` → `^12.6.0`, `@types/node` → `^24`)
  - `travelblogs/package-lock.json` (regenerated)
  - `.nvmrc` (new, repository root)
  - `travelblogs/server.js` (`url.parse` → WHATWG `URL`)
  - `travelblogs/README.md` (prerequisites/deployment notes)
  - `_bmad-output/project-context.md` (runtime version in the stack list)
- Not expected to change: anything under `travelblogs/src/`, `travelblogs/prisma/`, or `travelblogs/tests/`. If a test needs editing, that is a signal of a real behavior regression — investigate it rather than adjusting the assertion.
- No CI workflow exists in this repository (`.github/` contains only BMad agent definitions), so there is no pipeline Node version to update. Verification is local plus the production deploy.

### References

- Story source: [Source: _bmad-output/planning-artifacts/epics.md#Story 0.8: Upgrade the Runtime to Node.js 24 LTS]
- Sibling stories (same dependency-change pattern and verification rigor): [Source: _bmad-output/implementation-artifacts/0-5-upgrade-prisma-dev-tooling-to-resolve-vulnerable-dependencies.md], [Source: _bmad-output/implementation-artifacts/0-6-upgrade-nextjs-to-resolve-vulnerable-dependencies.md], [Source: _bmad-output/implementation-artifacts/0-7-resolve-next-auths-vulnerable-uuid-dependency.md]
- Vulnerability baseline this story must not regress: [Source: _bmad-output/implementation-artifacts/0-4-dependency-vulnerability-gate.md#Completion Notes List] (zero vulnerabilities as of Story 0.7)
- Test baseline to compare against: Story 0.7 Debug Log — 108 test files, 848 passed, 1 skipped
- Native-module consumers (read, do not edit): `travelblogs/src/utils/db.ts:2`, `travelblogs/src/instrumentation.ts:4`, `travelblogs/server.js:60`
- Legacy `url.parse` call sites: `travelblogs/server.js:6`, `travelblogs/server.js:87`, `travelblogs/server.js:97`
- HTTPS entrypoint this story must not break: [Source: _bmad-output/implementation-artifacts/0-2-enable-https.md]
- Shared-link routes to smoke-test: [Source: _bmad-output/implementation-artifacts/13-4-migrate-middleware-to-proxy.md] (`travelblogs/src/proxy.ts`)

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (1M context) — `claude-opus-5[1m]`

### Debug Log References

**Pre-upgrade baseline (commit `2241c86`, Node 20)**

| Item | Result |
|---|---|
| `node -v` / `npm -v` | `v20.19.2` / `11.18.0` |
| `npm test` | 108 files, **848 passed / 1 skipped** (849) — confirms the Story 0.7 figure |
| `npm run typecheck` | clean, 0 errors |
| `npm run build` | success |
| `npm audit` | **13 vulnerabilities (5 moderate, 7 high, 1 critical)** — see correction below |

**Post-upgrade (Node 24)**

| Item | Result |
|---|---|
| `node -v` / `npm -v` | `v24.19.0` / `11.18.0` — **unchanged** from the baseline, as the story predicted. Note the Node 24 keg *bundles* npm `11.17.0`, but that is not the npm in use: a user-global `npm@11.18.0` at `~/.npm-global/bin/npm` takes precedence on `PATH`. So no npm change accompanied the runtime change. |
| `npm test` | 109 files, **856 passed / 1 skipped** (857) = baseline 848 + 8 new tests, **0 failed** |
| `npm run typecheck` | clean, 0 errors with `@types/node@24.13.3` — the Node 24 typings surfaced **no** new type errors |
| `npm run build` | success, exit 0 |
| `npm run start` | HTTPS entrypoint booted; TLS loaded, Prisma/`better-sqlite3` adapter connected, all three backfills completed |
| `npm audit` | **11 vulnerabilities (5 moderate, 5 high, 1 critical)** — 2 fewer than baseline, **0 new** |

**Correction to the story's vulnerability premise.** The story and its DoD assume the tree was at
zero vulnerabilities as of Story 0.7. That is no longer true and was not caused by this story: the
baseline commit `2241c86` was audited directly (its `package.json` + `package-lock.json` extracted
via `git show` into a scratch directory) and reports the same 13 vulnerabilities. The advisory
database simply moved on since Story 0.7 — new advisories were published against already-installed
versions. Attribution was settled by diffing the advisory *package sets*, not just the counts:

- Baseline set (13): `@hono/node-server`, `@prisma/dev`, `brace-expansion`, `fast-uri`, `hono`,
  `js-yaml`, `nanoid`, `next`, `next-auth`, `postcss`, `prisma`, `sharp`, `valibot`
- Current set (11): the same, minus `brace-expansion` and `nanoid`
- **Newly introduced by this story: none.** `brace-expansion` and `nanoid` were incidentally
  resolved by the lockfile refresh (`1.1.16`→`1.1.18`, `3.3.16`→`3.3.18`).

**AC 3 — `better-sqlite3` prebuilt binary, verified.** `npm ls better-sqlite3` now shows exactly
one resolved copy, `12.11.1`, hoisted and shared by the root, `@prisma/adapter-better-sqlite3`, and
`prisma`'s peer dependency.

A plain `npm install` after the version bump did **not** dedupe: the lockfile still carried a stale
`node_modules/@prisma/adapter-better-sqlite3/node_modules/better-sqlite3@12.6.0` entry left over
from when the root was pinned at `11.6.0`, and `npm dedupe` would not collapse it either. Both
consumers declare `^12.6.0`, so the fix was to delete that one stale lockfile entry and re-run
`npm install`, which re-resolved the adapter onto the hoisted copy. Worth noting: the nested
`12.6.0` declared `install: node-gyp rebuild` with **no** `prebuild-install` fallback, so leaving it
in place would have forced source compilation — exactly what AC 3 exists to prevent.

Clean-tree verification (`rm -rf node_modules && npm ci --foreground-scripts`, exit 0): the install
log shows `prebuild-install || node-gyp rebuild --release` running and **succeeding on
`prebuild-install`** — no `node-gyp`, `gyp info`, `CXX`, `.cpp`, or `make` output anywhere in the
log. The binary's mtime stays at the published prebuild date (Jun 15) rather than the install time,
which independently confirms it was downloaded, not compiled. Runtime load check passed:
`better_sqlite3.node` loads and round-trips a query under `process.versions.modules = 137` (Node 24
ABI).

**`DeprecationWarning`s captured.**

- `DEP0169` (`url.parse()`) — confirmed present on Node 24 before the fix, and **absent** from the
  server startup log and the whole test run afterwards (0 deprecation lines).
- `DEP0176` (`fs.R_OK`) — emitted by `prebuild-install` during `npm ci`. Originates inside
  `node_modules`; logged and left alone per the story's scope guard.

**Two pre-existing issues found while verifying — both confirmed NOT caused by this story.**

0. **`sharp` was imported but never declared — broke the production build (found during deploy).**
   `src/utils/compress-image.ts` does `import sharp from "sharp"` (reached from 4 entry points), but
   `sharp` appeared nowhere in `package.json`. It resolved only because it is an
   **optionalDependency of `next`** (`next → sharp ^0.34.5`), hoisted to `node_modules/sharp` and
   flagged `optional: true` in the lockfile. Production deploys had never wiped `node_modules`, so a
   long-ago copy persisted; the `npm ci` this story introduces wiped it and the build failed with
   `Module not found: Can't resolve 'sharp'`. Fixed by declaring `"sharp": "^0.34.5"` — now
   `optional: false` in the lockfile, one deduped copy at `0.34.5` shared with Next, audit unchanged
   at 11. Verified that even `npm ci --omit=optional` now keeps it.

   A second, independent failure sat behind it on the production host (Debian 12, **linux/arm64**,
   glibc 2.36): installing `sharp` still failed with `Attempting to build from source via node-gyp
   … Please add node-addon-api`. The prebuilt binary was *not* missing and the registry was *not*
   the problem — both `@img/sharp-linux-arm64@0.34.5` and `@img/sharp-libvips-linux-arm64@1.2.4`
   installed cleanly from `registry.npmjs.org`. The cause is in `node_modules/sharp/install/check.js`,
   which exits 1 (forcing the source build) when `useGlobalLibvips()` is true — and the host has a
   **system libvips**, so sharp deliberately preferred it over its own prebuild. Fix:
   `SHARP_IGNORE_GLOBAL_LIBVIPS=1` (`lib/libvips.js:177`), which makes sharp skip the global search
   and use the `@img` binary.

   That flag **cannot** be set from `.npmrc`. Verified empirically: both
   `sharp-ignore-global-libvips=true` and `SHARP_IGNORE_GLOBAL_LIBVIPS=1` in `.npmrc` surface only as
   `npm_config_sharp_ignore_global_libvips`, and sharp reads the bare `SHARP_IGNORE_GLOBAL_LIBVIPS`.
   It must be a real environment variable, which is why the deploy is now scripted rather than
   documented as a list of steps to remember.

1. **`npm ci` leaves the Prisma client ungenerated.** Immediately after the clean `npm ci`,
   `npm run typecheck` reported 30 errors, all rooted in
   `Module '"@prisma/client"' has no exported member 'PrismaClient'`. Cause: `npm ci` wipes
   `node_modules`, the `prisma-client-js` generator outputs into `node_modules/@prisma/client`, and
   `package.json` has **no `postinstall` hook**. `npx prisma generate` cleared all 30 errors. This
   matters directly for AC 5 because this story's deploy sequence introduces `npm ci` — following
   the story's stated order verbatim would have failed the production build. Documented as an
   explicit step in the README deploy section and as a project-context rule. Adding a `postinstall`
   hook would fix it permanently but changes install behavior repo-wide, so it was initially left as
   a recommendation. **Now done** at Tommy's request: `"postinstall": "prisma generate"` added, so a
   clean `npm ci` regenerates the client automatically (verified — the generator runs during
   `npm ci` and `npm run typecheck` passes straight afterwards).
2. **Dead backfill block in `server.js`.** Startup logs `GPS backfill failed: Error: Cannot find
   module './src/utils/backfill-gps'`. The target is `src/utils/backfill-gps.ts`, and Node's CJS
   resolver does not try `.ts` for an extensionless `require` — verified MODULE_NOT_FOUND on **both**
   `v20.19.2` and `v24.19.0`, and the code is identical at the baseline commit, so it is pre-existing
   and version-independent. The backfills nevertheless run correctly: `src/instrumentation.ts` is
   Next's instrumentation hook and invokes all of them (plus `backfillWeather`, which `server.js`
   omits), which is where the `[GPS Backfill]` / `[Image Compression]` / `[Country Code Backfill]`
   log lines come from. The `server.js:57-82` block is therefore redundant dead code that always
   throws. Left untouched — out of scope — but worth its own cleanup story.

**One real Node-24 test regression found and fixed at the harness level.** After the upgrade,
`tests/components/create-entry-form.test.tsx > "uses photo GPS metadata to set the story location"`
failed. It was **not** flaky (3/3 consistent in isolation) and it was **not** dependency drift: with
byte-identical `node_modules` it passes on `v20.19.2` and fails on `v24.19.0`.

Root cause, isolated by probing each step of `handleUsePhotoLocation`
(`src/components/entries/create-entry-form.tsx:532`), whose `catch` silently swallows the error:
`await blob.arrayBuffer()` throws `TypeError: blob.arrayBuffer is not a function`. jsdom's `Blob`
exposes only `[constructor, slice, size, type]` — it has no `arrayBuffer()`/`text()`/`bytes()`
readers. Under Node 20, `Response.blob()` returned undici's own `Blob`, which carries those readers;
from Node 24 the returned instance is jsdom's, which does not.

This is a test-environment gap, not an application defect — every real browser has implemented
`Blob.prototype.arrayBuffer` since 2019, so the component works in production. Corroborating
evidence that the test was never truly exercising this path: the mock's blob contained the 13 bytes
of the string `"[object Blob]"` on **both** runtimes, because undici never recognised jsdom's `Blob`
as a real one and stringified it — the mock never delivered image bytes at all.

Fixed in `tests/setup.ts` by shimming the missing `arrayBuffer()`/`bytes()`/`text()` readers onto
`Blob.prototype` (via `FileReader`, guarded so it is a no-op where the readers already exist, e.g.
the `node` environment). This closes the environment gap for all 42 jsdom test files rather than
weakening an assertion — **no test assertion and no application code was changed** to make it pass.

**Smoke test on the running HTTPS server (Node 24).** Run against the real `npm run start` HTTPS
entrypoint. Because local `TLS_CERT_PATH`/`TLS_KEY_PATH` are empty (certs exist only in
production), a throwaway self-signed cert was generated into the scratch directory and passed via
env for the run — `.env` was not modified. Auth/upload steps ran against an **isolated copy** of
`prisma/dev.db` with `MEDIA_UPLOAD_DIR` redirected to scratch, so the real dev database and
`public/uploads/` were left untouched (both verified afterwards).

| Step | Result |
|---|---|
| TLS handshake | completes; server serves HTTPS on `127.0.0.1:3000` |
| `/` unauthenticated | 307 → `/sign-in` |
| `/trips` unauthenticated | 307 → `/sign-in?callbackUrl=%2Ftrips` (query correctly built through the new `parseRequestUrl`) |
| Sign in (correct password) | 200, JWT session issued — exercises bcrypt + Prisma + `better-sqlite3` |
| Session across a reload | persists (separate request with cookie returns the session) |
| Sign in (wrong password) | 401, session `{}` |
| Sign out | 200; session `{}`; `/trips` then 307 → sign-in |
| `/trips` authenticated | 200, all three trip titles render |
| Entry detail page | 200, `<title>Carlston Fästning in Marstrand — Schweden 2021</title>` |
| Shared link, valid token, unauthenticated | **200, no auth redirect** — all 5 sampled entry titles and IDs present server-side, 171 `/uploads/` references |
| Shared link `/map`, unauthenticated | 200 |
| Shared link, nonexistent token | 404 |
| Media upload (`POST /api/media/upload`) | **201**; `sharp` compressed 2400×1600 @ 23,002 B → 1920×1280 @ 8,261 B |
| `exifr` EXIF parsing | reads `Make`/`Model`/dimensions back correctly under Node 24 |

Two things that look like failures in the raw logs but are artifacts of the local environment, not
the runtime:

- An initial `500` on `/trips/share/...` was the self-signed cert: the page makes a server-side
  `fetch` to its own origin and Node rejected it (`self-signed certificate`). Re-running with
  `NODE_EXTRA_CA_CERTS` pointing at the throwaway cert gives 200/404 as expected.
- Image `404`/`400` responses: `public/uploads/trips` and `public/uploads/entries` are **empty** in
  this checkout (uploads are gitignored) while the dev DB still references ~200 files, which is also
  why the image-compression backfill logs `Errors: 203`. Nothing to do with Node 24; the upload test
  above verifies the image pipeline end to end instead.

`sharp` cannot write a GPS IFD through `withExif`/`withMetadata`, so the uploaded fixture returned
`location: null`. That is a fixture limitation — `exifr`'s EXIF parsing itself is verified working.

**Lint.** `npm run lint` reports 2 errors + 37 warnings, all pre-existing and in files this story
does not touch (`src/components/admin/trips-restore-dashboard.tsx:60`,
`src/types/zip-stream.d.ts:2`). Neither `server.js`, `tests/setup.ts`, nor the new test file
appears. The Turbopack build's single warning is about `next.config.ts` (NFT tracing) and is
likewise untouched and pre-existing.

**Local runtime activation.** No `nvm`/`fnm`/`asdf` is installed on this machine; Node comes from
Homebrew, and `node@24` (24.19.0) was already installed keg-only while `node@20` was linked.
Activated with `brew unlink node@20 && brew link --overwrite --force node@24`. Reverting is
`brew unlink node@24 && brew link node@20`. A Homebrew-specific path was deliberately **not** added
to `.envrc`, because that file is tracked in git and would be wrong on the Linux production host.

### Completion Notes List

Implemented the runtime upgrade to Node.js 24 LTS. All acceptance criteria are satisfied except
AC 5, which requires a production deploy that cannot be done by the dev agent.

- **AC 1 — satisfied.** On `v24.19.0`: `npm ci`, `npm run build`, `npm test`, `npm run typecheck`
  and `npm run start` all succeed with no runtime, native-module, or build errors. One caveat worth
  knowing: `npm ci` must be followed by `npx prisma generate` before building (pre-existing gap, now
  documented — see Debug Log item 1).
- **AC 2 — satisfied.** `engines.node` = `">=24.0.0 <25.0.0"` declared in
  `travelblogs/package.json` (placed after `"private": true`), and `.nvmrc` containing `24` created
  at the repository root. Left advisory as specified — no `engine-strict`.
- **AC 3 — satisfied.** Single hoisted `better-sqlite3@12.11.1`; clean `npm ci` uses the
  `prebuild-install` prebuilt binary with zero `node-gyp` compilation; ABI 137 verified by loading
  the module and running a query.
- **AC 4 — satisfied.** 856 passed / 1 skipped / 0 failed, which is exactly the re-confirmed 848/1
  baseline plus the 8 tests added here. No user-facing behavior changed. The one Node-24 test failure
  was diagnosed to a jsdom `Blob` gap and fixed in the test harness, with no assertion or application
  code altered.
- **AC 5 — NOT satisfied. Blocked on Tommy.** Requires installing Node.js 24 on the production host
  and running the deploy. See below.

Changes made, all within the story's stated scope:

1. `better-sqlite3` `11.6.0` → `^12.6.0` (resolves to `12.11.1`), collapsing two copies into one.
2. `@types/node` `^20` → `^24`; produced no new type errors.
3. `engines.node` block + root `.nvmrc`.
4. Replaced the runtime-deprecated `url.parse()` in `server.js` with a new `parseRequestUrl` helper
   built on the WHATWG `URL` API, covering **both** call sites (the HTTPS path and the HTTP fallback
   — the second is easy to miss because it is indented differently). The helper deliberately
   preserves the legacy contract Next's request handler depends on: `querystring` semantics where a
   repeated key collapses to an array (`?a=1&a=2` → `{a:["1","2"]}`), `search` as `null` rather than
   `""` when absent, and `path`/`href`. It also guards a genuine security difference — a target
   beginning with `//` is protocol-relative to `new URL()` and would silently replace the host, so
   the origin-form target is appended to a base that already carries the host, keeping `//evil.com/p`
   in the pathname exactly as `url.parse` did. 8 unit tests added, written failing first.
5. `tests/setup.ts` Blob-reader shim (see Debug Log).
6. Documentation: README prerequisites + a deploy-order section; `project-context.md` stack entry and
   three new rules.

**Two items need your decision, Tommy:**

- **Production deploy (AC 5).** Node 24 is **already on the host** at `/opt/node-24` (confirmed by
  Tommy — the sibling TravelPlan service already runs from it), so no runtime install is required
  and the riskiest part of this task is gone. What remains:
  1. Point the `travelblogs` unit at it, mirroring TravelPlan:
     `Environment="PATH=/opt/node-24/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"`
     and `ExecStart=/opt/node-24/bin/npm start`, then `sudo systemctl daemon-reload`.
     Do not copy TravelPlan's `Environment=` config block — TravelBlogs reads config from `.env`
     via `dotenv` and uses `HOSTNAME`, not `HOST`.
  2. `export PATH=/opt/node-24/bin:$PATH` in the deploy shell **before** installing, so the
     `better-sqlite3` prebuild matches the ABI the service will run (Node 24 = ABI 137). Installing
     under Node 20 and starting under Node 24 produces an ABI mismatch that fails at load time.
  3. Deploy: stop service → `git pull` → `npm ci` → **`npx prisma generate`** → `npm run build` →
     start service, then confirm via `journalctl -u travelblogs -f`. The `prisma generate` step is
     not in the story's original instructions and the build **will** fail without it.
- **The DoD's "zero vulnerabilities" gate cannot be met inside this story's scope.** 11 pre-existing
  vulnerabilities remain (1 critical `next-auth`, 5 high, 5 moderate). Clearing them requires
  `next@16.3.0` and `prisma@7.9.1`, which this story's scope boundary explicitly forbids ("does not
  upgrade Next.js, Prisma, React, or any other framework dependency"). This story introduced none of
  them and in fact reduced the count from 13 to 11. Recommend a follow-up story in the Story 0.4
  dependency-gate line rather than widening this one. **The story is therefore left at
  `in-progress`, not `review`** — it should not be marked ready for review while a task is
  outstanding and a DoD gate is knowingly unmet.

### File List

- `.nvmrc` — **new**, repository root, pins Node major `24`
- `travelblogs/package.json` — added `engines.node`; `better-sqlite3` → `^12.6.0`; `@types/node` → `^24`; declared the previously-undeclared `sharp` (`^0.34.5`); added `postinstall: prisma generate`
- `travelblogs/scripts/deploy.sh` — **new**, production deploy script encoding the three mandatory settings (Node 24 on `PATH`, `SHARP_IGNORE_GLOBAL_LIBVIPS=1`, `prisma generate`) plus native-module assertions
- `travelblogs/package-lock.json` — regenerated; stale nested `better-sqlite3` entry removed so the tree dedupes
- `travelblogs/server.js` — dropped `require("url")`; added `parseRequestUrl` (WHATWG `URL`) and used it at both request-handler call sites; exported it for testing
- `travelblogs/tests/setup.ts` — shim for jsdom's missing `Blob` `arrayBuffer()`/`bytes()`/`text()` readers
- `travelblogs/tests/utils/request-url.test.ts` — **new**, 8 tests for `parseRequestUrl`
- `travelblogs/README.md` — Prerequisites section (Node 24 + `.nvmrc`) and a "Deploying an update" section
- `_bmad-output/project-context.md` — Node 24 runtime + `better-sqlite3` in the stack list; 3 new rules; refreshed `Last Updated` and `rule_count`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story status → `in-progress`
- `_bmad-output/implementation-artifacts/0-8-upgrade-runtime-to-node-24.md` — this story file

## Change Log

- 2026-08-13: Story drafted. Runtime upgrade from end-of-life Node.js 20 to Node.js 24 LTS, including the `better-sqlite3` native-module bump (`11.6.0` → `^12.6.0`) that is the only hard blocker, `@types/node` alignment, `engines`/`.nvmrc` declaration, the `server.js` `url.parse` deprecation, and the production deploy.
- 2026-08-13: Implemented on Node.js `v24.19.0` / npm `11.18.0` (npm unchanged from baseline). `better-sqlite3` `11.6.0` → `^12.6.0` (resolves `12.11.1`, now a single hoisted copy using a prebuilt binary — no `node-gyp` compilation); `@types/node` `^20` → `^24` (no new type errors); `engines.node` + root `.nvmrc` added; `url.parse` (`DEP0169`) replaced with a WHATWG-`URL`-based `parseRequestUrl` at both `server.js` call sites, with 8 new tests. Tests 856 passed / 1 skipped / 0 failed (baseline 848/1 + 8 new); typecheck clean; production build succeeds; HTTPS entrypoint boots and smoke-tests pass (sign-in/session/sign-out, trip list, entry detail, unauthenticated shared links, media upload with `sharp` compression). Fixed one genuine Node-24 test failure at the harness level: jsdom's `Blob` lacks `arrayBuffer()`, which Node 24 now exposes because `Response.blob()` returns the jsdom `Blob` — shimmed in `tests/setup.ts` with no assertion or application code changed. Corrected the story's stale "zero vulnerabilities" premise: the baseline commit itself audits at 13; this story introduces **0 new** and reduces the count to 11.
- 2026-08-13: Deploy prerequisites clarified by Tommy — Node 24 is **already installed** on the production host at `/opt/node-24`, where the sibling TravelPlan service already runs from it, so AC 5 needs no runtime install. README deploy section and the deploy task updated with the concrete unit-file change (`ExecStart=/opt/node-24/bin/npm start` + matching `Environment="PATH=..."`) and with the ABI requirement that `npm ci` must run under Node 24 so the `better-sqlite3` prebuild matches the runtime the service uses (ABI 137).
- 2026-08-13: Deploy attempt on the production host (Debian 12, linux/arm64) exposed two further defects that a clean `npm ci` surfaces but the old "build in place" deploy hid. (a) `sharp` was imported by `src/utils/compress-image.ts` yet declared nowhere in `package.json` — it had been resolving as an optional dependency of `next`; now declared explicitly (`^0.34.5`, `optional: false`, single deduped copy). (b) On that host sharp still refused to install, because `install/check.js` prefers a detected **system libvips** and falls back to a source build that fails without a toolchain; fixed with `SHARP_IGNORE_GLOBAL_LIBVIPS=1`, which cannot be set via `.npmrc` (verified: npm exposes config only as `npm_config_*`). Added `postinstall: prisma generate` and a new `travelblogs/scripts/deploy.sh` that encodes all three mandatory deploy settings and asserts both native modules load. Verified from a clean tree: `npm ci` → `prisma generate` (automatic) → `better-sqlite3` ABI 137 → `sharp` OK (libvips 8.17.3) → typecheck PASS → build PASS → 856 passed / 1 skipped → audit 11 (unchanged).
- 2026-08-13: **Not complete.** Production deploy (AC 5) is outstanding and requires Tommy, and the DoD's "zero vulnerabilities" gate cannot be met without out-of-scope `next`/`prisma` upgrades. Status intentionally left at `in-progress` rather than `review`. Also surfaced two pre-existing, version-independent defects for follow-up: `npm ci` leaves the Prisma client ungenerated (no `postinstall` hook — now documented in the README deploy order, and it would have broken this story's own deploy sequence), and the backfill block at `server.js:57-82` is dead code that always throws `MODULE_NOT_FOUND` because it `require`s a `.ts` file (the backfills actually run via `src/instrumentation.ts`).
