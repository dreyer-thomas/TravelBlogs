---
baseline_commit: 9113818a16a8e7e36e8769158ab11ea5519d8f8b
---

# Story 16.1: Count Page Views for Shared Trips and Entries

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a trip owner,
I want page views of my publicly shared trip and its entries to be counted,
so that I can tell whether anyone is actually reading my blog — without collecting any personal data.

## Acceptance Criteria

1. **Anonymous trip page views are counted**
   - Given an anonymous visitor opens `/trips/share/{token}`
   - When the page has rendered
   - Then the view count for that trip and the current UTC day is incremented by exactly 1

2. **Anonymous entry page views are counted**
   - Given an anonymous visitor opens `/trips/share/{token}/entries/{entryId}`
   - When the page has rendered
   - Then the view count for that entry and the current UTC day is incremented by exactly 1
   - And the trip counter is **not** also incremented (trip and entry counters are independent)

3. **Counted exactly once per page view**
   - Given a visitor opens a shared page once
   - When the request completes
   - Then the counter increases by 1 and not by 2
   - And counting does **not** happen inside `GET /api/trips/share/[token]`, which is called twice during SSR *and* re-polled every 10 seconds by `SharedTripGuard` (see Dev Notes)

4. **Daily buckets**
   - Given views arrive for the same trip on the same UTC day
   - When they are counted
   - Then they accumulate in a single row
   - And a view on the next UTC day creates a new row, leaving the previous day's value unchanged

5. **Signed-in users are not counted**
   - Given a request carries a valid session (owner, contributor, viewer or admin)
   - When the beacon endpoint is called
   - Then no counter is incremented
   - And the response reports `counted: false`

6. **Known bots are not counted**
   - Given a request's `User-Agent` matches the bot pattern list
   - When the beacon endpoint is called
   - Then no counter is incremented
   - And the `User-Agent` value is never written to the database or to application logs

7. **No personal data is stored**
   - Given any number of views have been counted
   - When the stored rows are inspected
   - Then each row contains only: a target reference (`tripId` or `entryId`), a UTC day, and an integer count
   - And no IP address, `User-Agent`, referrer, per-visitor timestamp, cookie, or any other visitor-identifying value is persisted anywhere
   - And no cookie, `localStorage` or `sessionStorage` entry is written on the visitor's device

8. **Invalid targets are rejected**
   - Given the share token does not exist or has been revoked
   - When the beacon endpoint is called
   - Then it responds `404` with `{ data: null, error: { code: "NOT_FOUND", message } }` and increments nothing
   - And given an `entryId` that does not belong to the token's trip
   - Then it responds `404` and increments nothing

9. **Counters survive deletion of their target cleanly**
   - Given a trip or entry is deleted through the existing delete endpoints
   - When the deletion completes
   - Then its view rows are removed with it and no orphan rows remain

## Tasks / Subtasks

- [x] Add view-count schema (AC: 1, 2, 4, 7, 9)
  - [x] In `prisma/schema.prisma`, add `TripView`: `id String @id @default(cuid())`, `tripId String`, `day DateTime`, `views Int @default(0)`, relation `trip Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)`, `@@unique([tripId, day])`
  - [x] Add `EntryView`: same shape keyed on `entryId`, relation to `Entry` with `onDelete: Cascade`, `@@unique([entryId, day])`
  - [x] Add back-relations `views TripView[]` on `Trip` and `views EntryView[]` on `Entry`
  - [x] Generate the migration: `npx prisma migrate dev --name add_view_counts` (timestamped dir, matching `prisma/migrations/2026*_add_*`)
  - [x] Verify the generated SQL contains `ON DELETE CASCADE` on both foreign keys
- [x] Add the counting utility (AC: 1, 2, 4, 6)
  - [x] Create `src/utils/view-counter.ts` exporting `startOfUtcDay(date?)`, `isBotUserAgent(userAgent)`, `recordTripView(tripId)`, `recordEntryView(entryId)`
  - [x] `startOfUtcDay` returns `new Date(Date.UTC(y, m, d))` — never local time
  - [x] Both record functions upsert with `views: { increment: 1 }` and retry once as an `update` on `P2002` (see snippet in Dev Notes)
  - [x] `isBotUserAgent` is a local regex array; it reads the value in memory and returns a boolean — it never logs or stores it
- [x] Add the beacon endpoint (AC: 1, 2, 5, 6, 8)
  - [x] Create `src/app/api/trips/share/[token]/view/route.ts` exporting `POST`
  - [x] Copy the file conventions from the sibling `src/app/api/trips/share/[token]/route.ts`: `export const runtime = "nodejs"`, `export const dynamic = "force-dynamic"`, local `cacheHeaders = { "Cache-Control": "no-store" }` and local `jsonError(status, code, message)` helper
  - [x] Parse the optional body with `await request.json().catch(() => ({}))` and validate with Zod: `z.object({ entryId: z.string().min(1).optional() })`; invalid body → `400 VALIDATION_ERROR`
  - [x] Resolve the token via `prisma.tripShareLink.findUnique({ where: { token }, select: { tripId: true } })`; missing → `404 NOT_FOUND`
  - [x] If `entryId` is present, load the entry and verify `entry.tripId === shareLink.tripId`; otherwise `404 NOT_FOUND`
  - [x] Skip counting (respond `200` with `counted: false`) when `await getToken({ req: request })` returns a token
  - [x] Skip counting (respond `200` with `counted: false`) when `isBotUserAgent(request.headers.get("user-agent"))`
  - [x] Otherwise call `recordEntryView(entryId)` when `entryId` was given, else `recordTripView(shareLink.tripId)`
  - [x] Respond `{ data: { counted: boolean }, error: null }` with the `cacheHeaders`
  - [x] Wrap in try/catch and `console.error("Failed to record view", error)` — never include the `User-Agent` in the log
- [x] Add the client beacon (AC: 1, 2, 3, 7)
  - [x] Create `src/components/trips/view-beacon.tsx` — `"use client"`, default export `ViewBeacon`, props `{ token: string; entryId?: string }`, returns `null`
  - [x] Fire one `fetch` POST in a `useEffect`, guarded by a `useRef` flag so React Strict Mode's double effect in dev does not double-count; use `keepalive: true` and swallow all errors
  - [x] Mount it **inside** `<SharedTripGuard>` on `src/app/trips/share/[token]/page.tsx` (no `entryId`) and on `src/app/trips/share/[token]/entries/[entryId]/page.tsx` (with `entryId`)
  - [x] Do **not** mount it on `src/app/trips/share/[token]/map/page.tsx` — the map page is an explicit epic non-goal
  - [x] Write nothing to `localStorage`, `sessionStorage` or cookies
- [x] Tests (AC: 1-9)
  - [x] `tests/api/trips/share-view-counter.test.ts` — DB-backed route test following `tests/api/entries/delete-entry.test.ts`
  - [x] Cases: anonymous trip view increments; anonymous entry view increments and leaves the trip row untouched; two views same UTC day accumulate in one row; a view stamped on the next UTC day creates a second row and leaves the first unchanged; signed-in request increments nothing and returns `counted: false`; bot `User-Agent` increments nothing; unknown/revoked token → `404`; `entryId` from another trip → `404`; deleting the trip and deleting the entry each remove their view rows
  - [x] `tests/components/view-beacon.test.tsx` — asserts exactly one POST per mount and that no storage APIs are touched
  - [x] Run `npm run test`, `npm run lint` and `npm run typecheck` from `travelblogs/` before marking the story done

### Review Findings

_Adversarial code review, 2026-09-21 — 3 layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor). 3 decision-needed (all resolved), 13 patch, 1 action, 5 deferred, 6 dismissed as noise._

- [ ] [Review][Action] Dependency sweep bundled into a feature story — 11 packages upgraded (`next` 16.2.10→16.3.5, `prisma`/`@prisma/*` 7.8.0→7.10.0, `next-auth` 4.24.13→4.24.15, `sharp` 0.34→0.35, `vitest` 4.0→4.1, `@tiptap/*` ×7 3.15→3.31) under a view-counter heading, with no AC or Task authorizing it. Also silently reverses the scoped overrides added by stories 0-5, 0-6 and 0-7 (`uuid` is back to 11.1.1 from the pinned 14.0.1). `npm audit` is genuinely clean (verified: 0 vulnerabilities) and the full suite passes, but the feature can no longer be reverted without reverting the security work. **RESOLVED 2026-09-21 (Tommy): split into its own commit.** The dependency remediation must be committed separately from the view-counter feature so either can be reverted independently — the prod deploy path is `git pull → npm run build → restart`, so a Next minor riding along widens this deploy's blast radius. Rationale already recorded in `deferred-work.md`.
- [x] [Review][Patch] Requests with no `User-Agent` header are counted as human views [travelblogs/src/utils/view-counter.ts:39-41] — `if (!userAgent) return false` means the entire AC 6 bot filter is bypassed by omitting one header; `/curl\//i` in particular is defeated by `curl -A ''`. Strictly AC 6 is satisfied (it only requires excluding UAs that *match* the list). **RESOLVED 2026-09-21 (Tommy): treat an absent User-Agent as a bot** — return `true` for null/empty. Every real browser sends a UA, so the false-positive risk on humans is negligible and the bypass closes.
- [x] [Review][Patch] `hasSession` fails open, counting signed-in editors as anonymous views [travelblogs/src/app/api/trips/share/[token]/view/route.ts:44-51] — bare `catch { return false }` on an authorization check, with no `console.error`. A missing or rotated `NEXTAUTH_SECRET` — or the `getToken()` uncaught throw this story's own notes credit next-auth 4.24.15 with fixing — silently voids AC 5 with zero signal. **RESOLVED 2026-09-21 (Tommy): fail closed and log** — on throw, treat the request as carrying a session (do not count) and `console.error`. Errs toward undercounting rather than silently inflating counts with editors' own page loads.
- [x] [Review][Patch] **HIGH** — `ViewBeacon` never fires again when `entryId` changes, so every entry after the first is uncounted [travelblogs/src/components/trips/view-beacon.tsx:19-38] — `hasSentRef` is checked before the deps and never reset, making `[entryId, token]` dead. `EntryReader` renders prev/next links between sibling `[entryId]` segments, where the App Router reconciles rather than remounts. Proven empirically: re-rendering with `entry-1` then `entry-2` fires exactly one POST, for `entry-1` only. A reader paging through 10 entries records 1 entry view. Violates AC 2. Fix: key the ref on `` `${token}:${entryId ?? ""}` `` and compare instead of using a boolean.
- [x] [Review][Patch] Strike the false "byte-identical" claim from Completion Notes — the notes state `package.json` and `package-lock.json` are "byte-identical to the baseline commit" ~20 lines above a table upgrading 11 packages in those exact files. `package.json` differs from `9113818` by 43 lines. ("No new runtime dependencies" is true and can stay.)
- [x] [Review][Patch] `_bmad-output/project-context.md` stack versions are now stale [_bmad-output/project-context.md:21,25,28] — still reads Next.js 16.2.10, Prisma 7.8.0, NextAuth 4.24.13, all three changed by this diff. It is the declared source of truth for future story context-engineering, and is absent from the File List.
- [x] [Review][Patch] npm `overrides` widened from scoped to tree-wide [travelblogs/package.json] — the replaced entries used the nested form (`"next": { "postcss": ... }`) which genuinely scoped the pin; `"deepmerge-ts": "^8.0.2"` and `"mysql2": "^3.24.4"` are top-level and apply to the whole graph, contradicting the note that they "sit in the prisma CLI tree". Both also force versions past an upstream exact pin — `@prisma/config@7.10.0` requires `deepmerge-ts` at exactly `7.1.5` (a forced **major** bump) and `prisma@7.10.0` requires `mysql2` at exactly `3.15.3`. Verified working today (`prisma migrate deploy` runs clean in the test suite). Fix: restore the nested/scoped form.
- [x] [Review][Patch] Bot patterns are unanchored substring matches [travelblogs/src/utils/view-counter.ts:5-30] — `/bot/i` matches real Android device tokens (e.g. `Linux; Android 11; CUBOT NOTE 20`), `/preview/i` matches browser preview channels, `/java\//i` and `/okhttp/i` match in-app browsers. Every false positive is a permanent, undetectable undercount of a real reader (AC 7 forbids logging the UA). Gaps in the other direction too: no `scrapy`, `node-fetch`, `ia_archiver`, `libwww-perl`, `prerender`. Fix: anchor to token boundaries (`/\bbot\b|bot\/|[-_]bot/i`) and extend the list. `isBotUserAgent` has no unit test of its own.
- [x] [Review][Patch] `recordTripView`/`recordEntryView` can throw on ordinary delete races, returning 500 [travelblogs/src/utils/view-counter.ts:55-97] — if the target row disappears between the failed `upsert` and the retry `update`, Prisma raises `P2025`, which is unhandled and surfaces as a 500 from the route's catch. Same for `P2003` (FK violation) if the trip/entry is deleted between the route's `findUnique` checks and the upsert, and `P2024`/SQLITE_BUSY under a concurrent writer. This endpoint is explicitly best-effort and should never 500 on a lost race. The P2002 branch — the only non-obvious logic in the feature — has zero test coverage.
- [x] [Review][Patch] `recordTripView` and `recordEntryView` are ~20-line copy-paste twins [travelblogs/src/utils/view-counter.ts:55-97] — differing only in model and compound-key name, including the P2002 retry. Any fix to the retry semantics (see the finding above) will be applied to one and forgotten in the other.
- [x] [Review][Patch] Two API tests are wall-clock flaky at the UTC midnight boundary [travelblogs/tests/api/trips/share-view-counter.test.ts:130-132,182-203] — `startOfUtcDay(new Date())` is recomputed in the assertion *after* the request, so any run crossing 00:00 UTC fails. `startOfUtcDay` already accepts an optional date; injecting it costs one argument.
- [x] [Review][Patch] Component test hygiene [travelblogs/tests/components/view-beacon.test.tsx:71-104] — (a) the `document.cookie` stub is restored after the assertions rather than in a `finally`, so a failed expectation leaves cookie access stubbed for the rest of the file; (b) "swallows network errors" asserts only the call count and would pass identically with the `.catch()` deleted — `await Promise.resolve()` does not flush the rejection chain; (c) no test covers a changed `entryId`, which is why the HIGH finding above went undetected.
- [x] [Review][Patch] API test leaves its database behind [travelblogs/tests/api/trips/share-view-counter.test.ts:114-116] — `afterAll` only disconnects; `prisma/test-share-view-counter.db` is never removed, so `migrate deploy` re-applies over whatever a previous branch left behind.
- [x] [Review][Patch] File List omits artifacts this story changed — `_bmad-output/implementation-artifacts/deferred-work.md`, `epics.md`, `sprint-status.yaml`, `_bmad-output/planning-artifacts/epics.md`, and the newly created `16-2`, `17-1`, `17-2` story files.
- [x] [Review][Defer] Unauthenticated write endpoint has no rate limit — SQLite writer-lock exhaustion [travelblogs/src/app/api/trips/share/[token]/view/route.ts:53-108] — deferred, extends an already-accepted risk. `deferred-work.md` accepts *count inflation*; it does not cover availability. Each POST costs two reads plus a write transaction against the single-file SQLite database that also serves every page render.
- [x] [Review][Defer] The client chooses which counter moves [travelblogs/src/app/api/trips/share/[token]/view/route.ts:83-108] — deferred, subsumed by the accepted abuse surface. `entryId` is only checked for trip membership; nothing ties the beacon to the page actually rendered, so a stale tab or a reader on the map page can post arbitrary in-trip entry ids.
- [x] [Review][Defer] `token.sub === "creator"` role fallback in production code [travelblogs/src/app/api/trips/[id]/route.ts:80-97] — deferred, pre-existing. The AC 9 cascade tests authorize through this path with no `user` row present, so the cascade is proven against an authorization route that cannot occur in production. The cascade itself is genuinely verified; the test fidelity is not.
- [x] [Review][Defer] `views Int @default(0)` is unreachable and masks a future bug [travelblogs/prisma/schema.prisma:104,115] — deferred, needs a migration for cosmetic benefit. Every create path passes `views: 1`; any future writer omitting it (a backfill, a 16.2 aggregate seed) silently loses that view.
- [x] [Review][Defer] View counts survive share-link revocation [travelblogs/prisma/schema.prisma:100-120] — deferred, design question for Story 16.2. Rows are keyed to the trip, not the share link, so revoking a link and issuing a new token carries the old counts into the new link's statistics.

**Dismissed as noise (6):** local-timezone day bucketing (AC 4 mandates UTC); excluding `viewer`-role accounts (AC 5 explicitly lists them); folding entry views into the trip total (AC 2 explicitly forbids); per-visitor refresh dedupe (would require storing visitor identity, which AC 7 forbids); `Int` overflow at 2.1B views/day; malformed body falling back to a trip view (spec-prescribed `.catch(() => ({}))`, and the body is beacon-controlled).

## Dev Notes

### Developer Context

**Why a client beacon and not server-side counting — this is the single most important decision in the story.**

`GET /api/trips/share/[token]` is called far more often than once per page view:

1. `generateMetadata` in [travelblogs/src/app/trips/share/[token]/page.tsx](travelblogs/src/app/trips/share/[token]/page.tsx) calls `loadSharedTrip()`, and the page body calls it again — two calls per SSR render.
2. [travelblogs/src/components/trips/shared-trip-guard.tsx](travelblogs/src/components/trips/shared-trip-guard.tsx) re-fetches the same endpoint **every 10 seconds** (`CHECK_INTERVAL_MS = 10000`) for as long as the tab is open, plus on every `focus` and `visibilitychange`.
3. The shared **entry** page also calls the trip endpoint via `loadSharedTripLocations()` whenever the entry has a location.

Counting inside that GET would turn one reader leaving a tab open into hundreds of "views". A client-side beacon fires exactly once per rendered page, keeps DB writes out of the SSR render path, and as a side effect ignores the majority of crawlers, which do not execute JavaScript.

**Mount the beacon inside `SharedTripGuard`, not beside it.** The guard renders a "validating" placeholder first and only renders `children` after it has confirmed the link is still valid. Placing `<ViewBeacon />` among the guard's children means a revoked link never fires a beacon at all, which reinforces AC 8 instead of relying on the endpoint's 404 alone.

**Route placement matters.** Put the endpoint under `/api/trips/share/[token]/view`. `isProtectedPath()` in [travelblogs/src/proxy.ts](travelblogs/src/proxy.ts) returns `false` for everything starting with `/api/`, so no proxy change and no allowlist entry is needed. Do **not** place it under `/trips/share/[token]/view`: page routes under that prefix must be added by hand to the exact-match allowlist in `publicTripEntryView()` or they get auth-redirected — a gap that already caused one production incident with crawlers.

**Trip and entry counters are deliberately independent.** A deep link straight to an entry increments only that entry. Folding entry views into the trip total was considered and rejected because it makes "trip views" mean two different things. If the trip total should later include entry views, sum them at read time in Story 16.2 rather than double-writing here.

**Revocation needs no special handling.** Revoking deletes the `TripShareLink` row ([travelblogs/src/app/api/trips/[id]/share-link/route.ts:119](travelblogs/src/app/api/trips/[id]/share-link/route.ts#L119)), so the token lookup simply misses and returns `404`.

**Abuse surface — accepted, already recorded.** The endpoint is unauthenticated by necessity and increments a counter, so anyone holding a share token can inflate it with a loop of `curl` calls. Accepted for v1; the figure is informational and visible only to editors. Logged in `_bmad-output/implementation-artifacts/deferred-work.md` under "Deferred from: Epic 16 visitor counter scoping".

### Technical Requirements

- **Two models, not one.** SQLite treats `NULL`s as distinct in unique indexes, so a single table with a nullable `entryId` and `@@unique([tripId, entryId, day])` would never deduplicate the trip rows. Two models with non-nullable keys avoid the trap.
- **Store `day` as UTC midnight.** Never local server time; the host's timezone must not shift bucket boundaries.
- **No new runtime dependencies.** The bot list is a small local regex array. Zod 4.2.1 is already a dependency (`import { z } from "zod"`).
- **Upsert with a `P2002` retry.** The repo has no existing `upsert` call, so use this shape:

```ts
const day = startOfUtcDay();
try {
  await prisma.tripView.upsert({
    where: { tripId_day: { tripId, day } },
    create: { tripId, day, views: 1 },
    update: { views: { increment: 1 } },
  });
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
    await prisma.tripView.update({
      where: { tripId_day: { tripId, day } },
      data: { views: { increment: 1 } },
    });
    return;
  }
  throw error;
}
```

  The `"code" in error` narrowing matches the existing idiom in [travelblogs/src/app/api/trips/[id]/share-link/route.ts:79-86](travelblogs/src/app/api/trips/[id]/share-link/route.ts#L79-L86).
- **Session check idiom.** `import { getToken } from "next-auth/jwt"` and `await getToken({ req: request })`, typing the handler's first parameter as `NextRequest` — the same pattern as every other authenticated route (e.g. `src/app/api/trips/route.ts`).
- **API response contract.** `{ data, error }` wrapper; errors are `{ error: { code, message } }` with `data: null`. Dates in JSON are ISO 8601 strings. JSON fields are camelCase.

### Architecture Compliance

- App Router only; the new route lives under `src/app/api`. REST paths stay plural.
- Prisma model names singular, matching `Trip`, `Entry`, `TripAccess`, `TripShareLink`.
- Cascade deletes follow the existing pattern used by `EntryMedia`, `Tag`, `EntryTag` and `TripShareLink` — declared in the schema, enforced by `ON DELETE CASCADE` in the migration SQL.
- Shared helpers go in `src/utils/`; do not add a `lib/`.
- Components are `PascalCase` in `kebab-case.tsx` files under `src/components/<feature>/`.
- This story introduces **no user-facing strings**, so the EN + DE translation rule does not apply here; the labels land in Story 16.2.

### Regression Guardrails

- **Do not touch the trip delete route.** `DELETE /api/trips/[id]` already runs a hand-rolled transaction that deletes entries, then the share link, then the trip ([travelblogs/src/app/api/trips/[id]/route.ts:307-336](travelblogs/src/app/api/trips/[id]/route.ts#L307-L336)). `TripView` rows cascade from the trip delete and `EntryView` rows cascade from the entry `deleteMany`. Adding manual view-row deletes there would duplicate logic that the database already guarantees.
- **Do not modify `GET /api/trips/share/[token]` or the entry share route.** They are on the hot polling path; a write in either one is the failure mode this design exists to avoid.
- **Do not change `SharedTripGuard`'s polling behavior** as a side effect. Its 10-second poll is load-bearing for share-link revocation (Story 4.5).
- **Do not add the beacon to the shared map page** or to any authenticated trip view.
- Export/restore ([src/utils/trip-export.ts](travelblogs/src/utils/trip-export.ts), [src/utils/trip-restore.ts](travelblogs/src/utils/trip-restore.ts)) deliberately does **not** carry view counts; a restored trip starts at zero. No change needed there.

### Privacy Requirements

This story is deliberately scoped so that **no personal data is processed into storage**:

- Persisted per view: target id, UTC day, integer. Nothing else.
- IP address: never read for counting, never stored.
- `User-Agent`: read in memory for bot filtering, never stored, never logged.
- No cookie, `localStorage` or `sessionStorage` write on the visitor's device — this keeps the feature outside the consent requirement of §25 TDDDG.
- Because the stored rows cannot be related to an individual, they are not personal data under Art. 4 GDPR, so no consent banner and no legal-basis assessment is required for this feature.

The separate gap — the application has no Impressum and no Datenschutzerklärung, and the web server logs IP addresses independently of this feature — is now tracked as Epic 17 (Stories 17.1 and 17.2), which is independent of this epic and does not block it.

### File Structure Requirements

| Purpose | Path | New/Update |
|---|---|---|
| Schema | `travelblogs/prisma/schema.prisma` | UPDATE |
| Migration | `travelblogs/prisma/migrations/<timestamp>_add_view_counts/migration.sql` | NEW (generated) |
| Counting helper | `travelblogs/src/utils/view-counter.ts` | NEW |
| Beacon endpoint | `travelblogs/src/app/api/trips/share/[token]/view/route.ts` | NEW |
| Client beacon | `travelblogs/src/components/trips/view-beacon.tsx` | NEW |
| Shared trip page | `travelblogs/src/app/trips/share/[token]/page.tsx` | UPDATE (mount beacon inside `SharedTripGuard`) |
| Shared entry page | `travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx` | UPDATE (mount beacon inside `SharedTripGuard`) |
| API tests | `travelblogs/tests/api/trips/share-view-counter.test.ts` | NEW |
| Component test | `travelblogs/tests/components/view-beacon.test.tsx` | NEW |

### Testing Requirements

Tests live under `travelblogs/tests/` and are never colocated. Vitest runs with `environment: "node"` and `tests/setup.ts` ([vitest.config.ts](travelblogs/vitest.config.ts)).

Copy the DB-backed route-test harness verbatim from [travelblogs/tests/api/entries/delete-entry.test.ts:1-45](travelblogs/tests/api/entries/delete-entry.test.ts#L1-L45):

```ts
const getToken = vi.hoisted(() => vi.fn());
vi.mock("next-auth/jwt", () => ({ getToken }));

const testDatabaseUrl = "file:./prisma/test-share-view-counter.db";
// beforeAll: set process.env.DATABASE_URL, execSync("npx prisma migrate deploy", { stdio: "ignore", env: { ...process.env, DATABASE_URL: testDatabaseUrl } }),
//            build a PrismaClient over PrismaBetterSqlite3, then dynamically import the route module.
// beforeEach: delete in FK order — entryView, tripView, entryMedia, entry, tripShareLink, trip.
// afterAll:  await prisma.$disconnect().
```

Notes specific to this story's tests:

- Each test file needs its own `test-*.db` filename; reusing another file's database causes cross-file interference.
- `getToken` is mocked per test: `getToken.mockResolvedValue(null)` for anonymous, `getToken.mockResolvedValue({ sub: "user-1" })` for the signed-in skip.
- Send the bot case as `new Request(url, { method: "POST", headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" } })`.
- For the "next UTC day" case, write the second row directly through `prisma.tripView.create` with an explicit `day`, then assert both rows exist with independent counts — do not try to move the clock.
- Assert the exact error body shape `{ data: null, error: { code: "NOT_FOUND", message: expect.any(String) } }`.
- The component test must start with the `// @vitest-environment jsdom` docblock — the global Vitest environment is `node`, so a `.tsx` test without it has no DOM.
- The component test mounts `<ViewBeacon />` with a stubbed `global.fetch` and asserts `fetch` was called exactly once.

### Previous Story Intelligence

- Story 4.5 (invalidate shared entry pages on revoke) introduced `SharedTripGuard`'s polling loop — the reason server-side counting in the share GET is unusable. Do not weaken it.
- Story 13.4 (migrate middleware to proxy) plus the code-review entry in `deferred-work.md` record a real production incident: a public route that was missing from the `publicTripEntryView()` allowlist redirected crawlers to sign-in. Keeping this endpoint under `/api/` sidesteps that class of bug entirely.
- The most recent commit (`9113818 Bugfixes for contributors`) reworked `src/utils/trip-access.ts` and its tests. Story 16.2 reuses that permission gate for displaying counts; this story needs no authorization logic beyond "is there a session at all", so do not import or duplicate `trip-access` here.
- Repo-wide convention seen across recent stories: every schema change ships with a migration in the same commit, and every new route ships with a DB-backed test in `tests/api/`.

### Project Context Reference

- Source of truth: `_bmad-output/project-context.md`
- Stack in force: Node 24, Next.js 16.2.10 (App Router), React 19.2.3, Prisma 7.8.0 over SQLite via `@prisma/adapter-better-sqlite3`, NextAuth 4.24.13 (JWT), Zod 4.2.1, Vitest 4.
- Key rules touched by this story: camelCase JSON, `{ data, error }` wrapper, App Router only, plural REST paths, tests under `travelblogs/tests/`, singular model names, `utils/` not `lib/`.

### References

- Epic: `_bmad-output/planning-artifacts/epics.md` — "Epic 16: Visitor Counter", Story 16.1
- Source: User request, 2026-09-21 — visitor counter, visible only in edit mode, no privacy exposure
- Double-render + polling trap: [travelblogs/src/app/trips/share/[token]/page.tsx](travelblogs/src/app/trips/share/[token]/page.tsx), [travelblogs/src/components/trips/shared-trip-guard.tsx](travelblogs/src/components/trips/shared-trip-guard.tsx)
- Proxy allowlist: [travelblogs/src/proxy.ts](travelblogs/src/proxy.ts)
- Route conventions: [travelblogs/src/app/api/trips/share/[token]/route.ts](travelblogs/src/app/api/trips/share/[token]/route.ts)
- Test harness: [travelblogs/tests/api/entries/delete-entry.test.ts](travelblogs/tests/api/entries/delete-entry.test.ts)
- Accepted trade-offs: `_bmad-output/implementation-artifacts/deferred-work.md` — "Deferred from: Epic 16 visitor counter scoping (2026-09-21)"
- Public surfaces in scope: `/trips/share/{token}`, `/trips/share/{token}/entries/{entryId}`. Out of scope: `/trips/share/{token}/map`

## Dev Agent Record

### Agent Model Used

claude-opus-5[1m] (Opus 5, 1M context)

### Debug Log References

N/A — no blocking defects encountered.

### Implementation Plan

1. **Schema** — add `TripView` and `EntryView` as two separate models (not one nullable-keyed table, which SQLite's NULL-distinct unique indexes would never deduplicate), each with `@@unique([targetId, day])` and `onDelete: Cascade`. Generate the migration and verify the emitted SQL carries `ON DELETE CASCADE`.
2. **Counting helper** — `src/utils/view-counter.ts` with `startOfUtcDay` (UTC-only bucketing), an in-memory `isBotUserAgent` regex list, and `recordTripView` / `recordEntryView` upserts that retry once as an `update` on `P2002`.
3. **Beacon endpoint** — `POST /api/trips/share/[token]/view`, mirroring the sibling share route's conventions. Order of checks is deliberate: validate body → resolve token → validate entry ownership → skip on session → skip on bot → count. Target validation runs *before* the skip branches so an invalid target returns `404` regardless of who asks (AC 8), while valid-but-uncounted requests return `200 { counted: false }` (AC 5, 6).
4. **Client beacon** — `ViewBeacon` fires exactly one `fetch` per mount behind a `useRef` guard, mounted *inside* `SharedTripGuard` so a revoked link never fires at all.
5. **Tests** — DB-backed route tests over a dedicated `test-share-view-counter.db`, plus a jsdom component test.

### Completion Notes List

- **All 9 acceptance criteria are implemented and covered by tests.** 18 new tests added (12 API + 6 component); the full suite is green at 881 passed / 1 skipped across 112 files.
- **Counting is client-side by design (AC 3).** `GET /api/trips/share/[token]` is unusable as a counting point: it runs twice per SSR render and `SharedTripGuard` re-polls it every 10 seconds. Neither that route nor the entry share route nor the guard's polling behavior was modified.
- **Check ordering in the endpoint.** Token and entry-ownership validation deliberately precede the session and bot skips, so AC 8's `404` holds for every caller rather than being masked by an early `200 { counted: false }`.
- **Privacy (AC 7) verified by test.** A dedicated test asserts the persisted row's key set is exactly `["day", "id", "tripId", "views"]`. The `User-Agent` is read in memory for bot filtering only — never stored, and the catch block logs only the error, never the header. The component test asserts no `cookie` / `localStorage` / `sessionStorage` write.
- **Strict Mode double-count guarded.** A test renders `ViewBeacon` inside `<StrictMode>` and asserts exactly one POST, covering React's development double-effect.
- **Cascade deletes (AC 9) verified end-to-end** through the real `DELETE /api/trips/[id]` and `DELETE /api/entries/[id]` handlers, not just at the schema level. The trip delete route was left untouched per the story's regression guardrail — the database enforces the cascade.
- **No new runtime dependencies.** No package was added to `dependencies` or `devDependencies`. Existing packages *were* upgraded — see the Dependency Remediation section below; `package.json` and `package-lock.json` are both modified relative to the baseline commit.
- **`npm audit` is clean: 0 vulnerabilities.** The audit initially reported 20 findings (2 critical, 10 high, 8 moderate), all pre-existing rather than introduced here. On Tommy's direction these were resolved as part of this story rather than deferred, so the definition-of-done audit gate is genuinely met. Details in the dependency section below.

### Dependency Remediation (done alongside the story, on Tommy's direction)

`npm audit` went from **20 vulnerabilities (2 critical, 10 high, 8 moderate) → 0**.

Direct upgrades:

| Package | From | To | Closes |
|---|---|---|---|
| `next` + `eslint-config-next` | 16.2.10 | 16.3.5 | critical proxy bypass + Server Actions DoS; high `postcss` |
| `next-auth` | ^4.24.13 | ^4.24.15 | critical homoglyph `@` bypass, `getToken()` uncaught throw |
| `prisma` / `@prisma/client` / `@prisma/adapter-better-sqlite3` | 7.8.0 | 7.10.0 | `@prisma/dev`, `@hono/node-server`, `valibot`, `fast-uri` |
| `sharp` | ^0.34.5 | ^0.35.4 | libvips CVE-2026-33327/33328/35590/35591, libheif advisories |
| `vitest` | ^4.0.16 | ^4.1.11 | `@vitest/mocker` path traversal |
| `@tiptap/*` (7 packages) | ^3.15.3 | ^3.31.3 | `mergeAttributes()` prototype pollution, Markdown ReDoS |

**npm's suggested fix was wrong and was not followed.** `npm audit fix` proposed `prisma@6.19.3` — a *downgrade* from the installed 7.8.0 — because prisma's `latest` dist-tag currently points at the `8.0.0-rc.15` release candidate. The correct target is 7.10.0, the newest stable 7.x (`prev` tag).

**Overrides reduced from 9 to 2.** The previous `overrides` block was itself a source of findings: `postcss` was pinned to `8.5.10` (vulnerable, `<=8.5.22`) and `@hono/node-server` to `1.19.14` (vulnerable, `<1.19.15`). Both were exact pins added by earlier security stories (0-5, 0-6) that went stale as new advisories landed. After the direct upgrades, seven overrides were verified redundant by removing them and re-auditing. The two that remain are the only ones still load-bearing, and use caret ranges so they can absorb patches instead of going stale:

```json
"overrides": { "deepmerge-ts": "^8.0.2", "mysql2": "^3.24.4" }
```

Both sit in the `prisma` CLI tree (dev tooling, not shipped to production). They should be dropped once prisma ships them itself — worth re-checking on every prisma upgrade.

Verification performed after the upgrades: full `npm ci` from a clean tree (the exact path that broke production once before, per `project-context.md`), `better-sqlite3` load (ABI 137) and a real `sharp` encode/decode/resize/rotate/webp round-trip, plus the full suite, typecheck and production build. `sharp` is exercised by real (unmocked) tests including EXIF/GPS handling — all 20 of those pass on 0.35.4.

### File List

**Story implementation:**

- `travelblogs/prisma/schema.prisma` (modified)
- `travelblogs/prisma/migrations/20260921194645_add_view_counts/migration.sql` (new)
- `travelblogs/src/utils/view-counter.ts` (new)
- `travelblogs/src/app/api/trips/share/[token]/view/route.ts` (new)
- `travelblogs/src/components/trips/view-beacon.tsx` (new)
- `travelblogs/src/app/trips/share/[token]/page.tsx` (modified)
- `travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx` (modified)
- `travelblogs/tests/api/trips/share-view-counter.test.ts` (new)
- `travelblogs/tests/components/view-beacon.test.tsx` (new)

**Dependency remediation:**

- `travelblogs/package.json` (modified)
- `travelblogs/package-lock.json` (modified)

**Planning / tracking artifacts:**

- `_bmad-output/project-context.md` (modified — stack versions realigned to Next 16.3.5 / Prisma 7.10.0 / NextAuth 4.24.15)
- `_bmad-output/implementation-artifacts/deferred-work.md` (modified)
- `_bmad-output/implementation-artifacts/epics.md` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
- `_bmad-output/planning-artifacts/epics.md` (modified)
- `_bmad-output/implementation-artifacts/16-2-display-view-counts-in-edit-mode.md` (new)
- `_bmad-output/implementation-artifacts/17-1-add-impressum-page.md` (new)
- `_bmad-output/implementation-artifacts/17-2-add-privacy-policy-page.md` (new)

### Change Log

- 2026-09-21: Story created (PM).
- 2026-09-21: Context-engineered against the codebase — beacon mount point, polling-guard rationale, upsert/P2002 snippet, test harness, regression guardrails.
- 2026-09-21: Implemented all 5 tasks. Added `TripView`/`EntryView` models + cascade migration, `view-counter` utility, `POST /api/trips/share/[token]/view` beacon endpoint, and the `ViewBeacon` client component mounted inside `SharedTripGuard` on the shared trip and entry pages. Added 18 tests. Suite 881 passed / 1 skipped; typecheck clean; production build succeeds; lint unchanged from baseline (38 problems, 2 pre-existing errors). Status → review.
- 2026-09-21: Resolved all 20 pre-existing `npm audit` vulnerabilities (2 critical, 10 high, 8 moderate → 0) on Tommy's direction. Upgraded next 16.3.5, next-auth 4.24.15, prisma 7.10.0, sharp 0.35.4, vitest 4.1.11, tiptap 3.31.3; replaced 9 stale overrides with 2 caret-ranged ones. Re-verified with clean `npm ci`, native-module checks, full suite, typecheck and production build.

- 2026-09-21: Adversarial code review (3 layers). 3 decisions resolved by Tommy, 13 patches applied, 5 items deferred, 6 dismissed. Fixed a confirmed AC 2 violation (`ViewBeacon` never re-fired on `entryId` change, so every entry after the first went uncounted when readers used prev/next); absent `User-Agent` now treated as a bot; session check now fails closed and logs; bot patterns anchored so device names like `CUBOT` are not filtered; `record*` helpers deduplicated and made tolerant of delete races; npm overrides re-scoped to the `prisma` tree; test DB cleaned up; 4 tests added (22 in the story's files, 885 suite-wide). Corrected the false "byte-identical" claim and realigned `project-context.md` stack versions. Verified: suite 885 passed / 1 skipped, typecheck clean, lint unchanged (38 problems, 2 pre-existing errors), production build succeeds, `npm audit` 0 vulnerabilities.
