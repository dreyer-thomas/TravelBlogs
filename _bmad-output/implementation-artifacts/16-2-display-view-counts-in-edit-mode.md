---
baseline_commit: 673c8b6387c88b580d53a1ac09bafa8c75cdce0e
---
# Story 16.2: Display View Counts in Edit Mode

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a trip owner or contributor,
I want to see the view counts for my trip and its entries while I am working on the trip,
so that I know whether my blog is being read — without exposing those numbers to readers.

## Acceptance Criteria

1. **Trip view count on the trip detail page**
   - Given I am the owner, a contributor, or an administrator
   - When I open `/trips/{tripId}`
   - Then I see the total number of views for that trip
   - And I see the number of views in the last 30 days
2. **Per-entry view counts**
   - Given I am the owner, a contributor, or an administrator
   - When I view the entry list on the trip detail page
   - Then each entry shows its own total view count
3. **Hidden from read-only viewers**
   - Given I have read-only access to a trip (`canContribute` is false)
   - When I open the trip
   - Then no view counts are shown anywhere
4. **Never shown on public pages**
   - Given I am an anonymous visitor on any `/trips/share/{token}` page
   - When the page renders
   - Then no view count appears in the markup, including in data attributes or embedded JSON
5. **Zero state**
   - Given a trip or entry has never been viewed
   - When the count is displayed
   - Then it shows `0` rather than an empty space or a loading state
6. **Bilingual labels**
   - Given the UI language is English or German
   - When view counts are displayed
   - Then all labels come from the translation catalog in both languages
7. **Counts are not exposed through an unprotected endpoint**
   - Given an anonymous request to whichever API returns view counts
   - When the request is made
   - Then it is rejected with the project's standard error shape, and no counts are returned

## Tasks / Subtasks

- [x] Read-side aggregation (AC: 1, 2, 5)
  - [x] Add helpers to sum `TripView.views` (total and last 30 days) and `EntryView.views` (total per entry)
  - [x] Return `0` for targets with no rows rather than `null`
  - [x] Aggregate entry counts for a whole trip in one query — no N+1 per entry card
- [x] Expose counts to the authenticated surfaces (AC: 1, 2, 7)
  - [x] Extend the trip detail data path so counts reach the page only when the caller may see them
  - [x] Gate on the same contributor permission the edit affordances already use
  - [x] Reject unauthorized callers with `{ error: { code, message } }`
- [x] UI (AC: 1, 2, 3, 5, 6)
  - [x] Show trip total + last 30 days on the trip detail page, gated on `canEditTrip`
  - [x] Show per-entry totals on the entry cards, gated the same way
  - [x] Keep the presentation discreet — this is an editor's metric, not a headline
- [x] i18n (AC: 6)
  - [x] Add new keys under `trips.*` / `entries.*` to both the `en` and `de` blocks of `src/utils/i18n.ts`
- [x] Tests (AC: 1-7)
  - [x] Component tests: counts visible with contribute permission, absent without
  - [x] Test that no count appears in the shared-view render path
  - [x] Test the zero state
  - [x] Test that the count-returning endpoint rejects anonymous callers

## Dev Notes

### Developer Context

- **Reuse the existing permission gate, do not invent a second one.** [travelblogs/src/app/trips/[tripId]/page.tsx] already computes `canContribute` and passes `canEditTrip` / `canAddEntry` into `TripDetail`. Add the counts behind that same flag. The trip-access audit that preceded this epic was caused precisely by two components computing the same permission differently — do not repeat it.
- **AC 4 is the privacy-relevant one.** The public share pages render through `TripOverview`, the *same component* used by the authenticated overview path. If counts are threaded into `TripOverview` props carelessly, they will leak into the shared HTML. Either keep counts out of `TripOverview` entirely, or make the prop optional and never populate it on the share path — and prove it with a test.
- **Watch the N+1.** The entry list can be long. Aggregate per-entry counts with a single `groupBy` over `EntryView` filtered by the trip's entry ids, not one query per card.
- **Numbers are page views, not people.** Label them accordingly ("views" / "Aufrufe"), never "visitors" / "Besucher". The counter cannot distinguish people, and a label that overstates it will mislead the reader of the number.

### Technical Requirements

- Counts are integers; never render `null` or `undefined`.
- "Last 30 days" means the last 30 UTC day buckets including today, consistent with how Story 16.1 writes them.
- API response shape stays `{ data, error }`.
- No new runtime dependencies.

### Architecture Compliance

- Feature components live in `travelblogs/src/components/trips/`.
- Components are `PascalCase` in `kebab-case.tsx` files.
- All user-facing strings must exist in both `en` and `de`.

### File Structure Requirements

- Aggregation helpers: `travelblogs/src/utils/view-counter.ts` (extend the file from Story 16.1)
- Trip detail wiring: `travelblogs/src/app/trips/[tripId]/page.tsx`, `travelblogs/src/components/trips/trip-detail.tsx`
- Translations: `travelblogs/src/utils/i18n.ts`
- Tests: `travelblogs/tests/components/`, `travelblogs/tests/api/trips/`

### Testing Requirements

- Component tests follow the existing pattern in `travelblogs/tests/components/` with hand-built props.
- Include an explicit negative test for the shared-view path (AC 4) — this is the test that protects the privacy promise, so it must assert on rendered output, not just on props.

### Previous Story Intelligence

- Story 16.1 creates the `TripView` / `EntryView` models, the counting helper and the beacon. This story is read-only on top of it and must not introduce a second write path.
- Story 5.18 ("provide edit button only for editors") established the contributor gate used here.

### Project Context Reference

- Source of truth: `_bmad-output/project-context.md`
- Key rules: `{ data, error }` wrapper, camelCase JSON, feature components under `src/components/<feature>/`, tests under `travelblogs/tests/`, EN + DE for every user-facing string.

### References

- Source: User request, 2026-09-21 — "Es würde reichen, wenn man den Zähler nur im Edit-Modus sieht."
- Permission gate: `travelblogs/src/app/trips/[tripId]/page.tsx`
- Shared component at risk of leaking counts: `travelblogs/src/components/trips/trip-overview.tsx`

### Review Findings

_Code review 2026-09-21 — 3 layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor). AC 1-7 all verified implemented; no acceptance-criteria violations found._

- [x] [Review][Patch] Broaden the AC 4 guard to render the real share route(s) — the current test renders `TripOverview` directly with hand-built props and cannot fail; it must cover `/trips/share/[token]` and `/trips/share/[token]/entries/[entryId]` (`EntryReader`) and assert on the served markup, which is where AC 4's "embedded JSON" lives [travelblogs/tests/components/trip-detail-view-counts.test.tsx:290-335]
- [x] [Review][Accepted] Counts arrive via a separate client fetch rather than the server data path — reviewed and accepted 2026-09-21. `page.tsx` is named in File Structure Requirements but was not touched; the dedicated `GET /api/trips/[id]/view-counts` endpoint stays because it is cleanly separated and independently tested. Known cost: a second round trip and a reflow of the metadata row and entry cards on each editor visit.
- [x] [Review][Patch] Payload guard validates only the top level — a malformed `entries` element crashes the trip page [travelblogs/src/components/trips/trip-detail.tsx:331]
- [x] [Review][Patch] 30-day window test is wall-clock dependent — UTC midnight between insert and query makes it flaky [travelblogs/tests/api/trips/trip-view-counts.test.ts:120-133]
- [x] [Review][Patch] All 10 inserted mock lines sit at column 0 inside 6-space-indented chains [travelblogs/tests/components/trip-share-panel.test.tsx:100]
- [x] [Review][Patch] Leak assertions are near-vacuous — `not.toContain("12")` passes for any 401 body; assert on shape instead [travelblogs/tests/api/trips/trip-view-counts.test.ts:230,320]
- [x] [Review][Patch] German assertion in the shared-path test is vacuous — `queryByText(/Aufrufe/i)` under `initialLocale="en"` [travelblogs/tests/components/trip-detail-view-counts.test.tsx:330]
- [x] [Review][Patch] Dead `role` field in the route's `getUser` — derived on every request, never read [travelblogs/src/app/api/trips/[id]/view-counts/route.ts:29-34]
- [x] [Review][Patch] `TripViewCounts` declared three times with no compile-time link; client copy can drift [travelblogs/src/components/trips/trip-detail.tsx:91-100]
- [x] [Review][Patch] Completion note "`t()` has no interpolation in this project" is inaccurate — the catalog already uses `{{placeholder}}` templating [travelblogs/src/utils/i18n.ts:11-13,334]
- [x] [Review][Defer] Unbounded `IN (entryIds)` against the SQLite bind-variable ceiling [travelblogs/src/utils/view-counter.ts:215] — deferred, needs >32766 entries in one trip
- [x] [Review][Defer] Owner-shortcut permission gate is now in a third place and diverges from `canContributeToTrip` for an owner whose role is not `creator` [travelblogs/src/app/api/trips/[id]/view-counts/route.ts:72-75] — deferred, pre-existing; byte-identical to the gate in `page.tsx:54-56`
- [x] [Review][Defer] Trip aggregates are not read from a single snapshot — `last30Days` can briefly exceed `total` [travelblogs/src/utils/view-counter.ts:193-207] — deferred, pre-existing pattern
- [x] [Review][Defer] Counts render without locale number grouping — "1234 Aufrufe" instead of "1.234 Aufrufe" [travelblogs/src/components/trips/trip-detail.tsx:670,1219,1228] — deferred, pre-existing; `Intl.NumberFormat` is absent from all of `src/`
- [x] [Review][Defer] Ordered `mockResolvedValueOnce` chains encode React effect execution order [travelblogs/tests/components/trip-share-panel.test.tsx] — deferred, pre-existing pattern in that file
- [x] [Review][Defer] Test re-implements `startOfUtcDay`/`DAY_IN_MS` instead of importing the exported helper [travelblogs/tests/api/trips/trip-view-counts.test.ts:525-533] — deferred, pre-existing

## Dev Agent Record

### Agent Model Used

claude-opus-5[1m] (Opus 5, 1M context)

### Debug Log References

N/A

### Implementation Plan

1. **Read-side aggregation** — extend `src/utils/view-counter.ts` with `getTripViewCounts(tripId)`:
   - `tripView.aggregate` for the all-time sum, plus a second aggregate filtered to
     `day >= startOfUtcDay() - 29 days` for the 30-bucket window (30 UTC buckets including today).
   - `entryView.groupBy({ by: ["entryId"], where: { entry: { tripId } } })` — one query for all
     entry cards, no N+1.
   - `_sum.views` is `null` when no rows match, so every result is coerced to `0`.
2. **API** — new `GET /api/trips/[id]/view-counts` mirroring the auth ladder of
   `/api/trips/[id]/overview`, but gated on the contributor permission instead of read access:
   401 anonymous → 403 inactive → 404 unknown trip → 403 read-only viewer. Payload
   `{ data: { trip: { total, last30Days }, entries: [{ entryId, total }] }, error: null }`.
3. **UI** — `trip-detail.tsx` fetches the endpoint only when `canEditTrip` is true, and renders the
   trip totals discreetly in the metadata row and each entry's total on its card. Counts stay out of
   `TripOverview` entirely, so the shared path has nothing to leak.
4. **i18n** — `trips.viewsTotal`, `trips.viewsLast30Days`, `entries.view`, `entries.views` in both
   `en` and `de`. `t()` takes no parameters, so the number is rendered next to the
   label and the singular/plural key is chosen by the count.
5. **Tests** — `tests/api/trips/trip-view-counts.test.ts` (aggregation + endpoint authorization
   against a real SQLite test DB) and `tests/components/trip-detail-view-counts.test.tsx`
   (visible with contribute permission, absent without, zero state, and a shared-view render
   assertion for AC 4).

### Completion Notes List

- **Aggregation (AC 1, 2, 5)** — `getTripViewCounts` in `src/utils/view-counter.ts` returns
  `{ trip: { total, last30Days }, entries: [{ entryId, total }] }`. The 30-day figure sums the
  buckets from `startOfUtcDay() - 29 days` onward, so it covers 30 UTC day buckets including
  today, matching how Story 16.1 writes them. Prisma's `_sum` is `null` when nothing matches, so
  every value is coerced to `0` in the helper — the UI never sees a null.
- **No N+1 (AC 2)** — one `entry.findMany` for the trip's entry ids plus one
  `entryView.groupBy` over those ids, regardless of how many entries the trip has. Entries with no
  view row are filled in with `0`, which is also what gives AC 5 its per-entry zero state. A test
  spies on `groupBy` and asserts it is called exactly once for a five-entry trip.
- **Endpoint (AC 7)** — `GET /api/trips/[id]/view-counts` follows the auth ladder of the existing
  overview route but gates on the contributor permission: 401 `UNAUTHORIZED` for anonymous callers,
  403 for inactive accounts, 404 for unknown trips, 403 `FORBIDDEN` for read-only viewers. Both
  rejection tests additionally assert the seeded count does not appear anywhere in the response body.
- **Permission gate (AC 1, 2, 3)** — no new permission logic. The page already computes
  `canContribute` and passes it as `canEditTrip`; the component fetches and renders counts only when
  that flag is true, and the endpoint independently re-checks `canContributeToTrip`. A read-only
  viewer therefore issues no request at all, and would be refused if one were forged.
- **AC 4** — `TripOverview`, the component shared with the public `/trips/share/{token}` pages, was
  left untouched: it has no count prop and no count fetch, so there is nothing to leak. A test
  renders the shared path and asserts on the rendered markup — no count elements, no "views"/
  "Aufrufe" text, and no `view-counts`/`last30Days` string in the HTML, which also covers data
  attributes and embedded JSON.
- **Labels (AC 6)** — `trips.viewsTotal`, `trips.viewsLast30Days`, `entries.view`, `entries.views`
  added to both `en` and `de`. `t()` takes no parameters (the catalog does support `{{placeholder}}`
  templating interpolated by the caller, as in `share.tripDescription`, but that convention is
  not used here), so the count is rendered
  beside the label and the singular key is used when the total is exactly 1 ("1 view" / "1 Aufruf")
  rather than "1 views". Wording stays on page views ("views" / "Aufrufe"), never
  "visitors" / "Besucher"; a test asserts "Besucher" is absent from the German render.
- **Presentation** — the trip figures join the existing metadata row next to the owner, and each
  entry total sits after the card's date behind a `·` separator, so the numbers read as editor
  metadata rather than a headline.
- **Failure handling** — a failed or malformed count response leaves `viewCounts` at `null` and the
  page renders exactly as before; a covering test asserts the trip page stays usable on a 500.
- **Pre-existing test file updated** — `tests/components/trip-share-panel.test.tsx` stubs `fetch`
  with call-ordered `mockResolvedValueOnce` chains, so the added request shifted every chain. Each of
  the 10 chains now includes a `createViewCountsMock()` entry directly after the overview mock, which
  is the same pattern that file already uses for the overview fetch. No assertions were weakened.

### Validation

- `npm test` → 114 files, 905 passed, 1 skipped, 0 failed
- `npm run typecheck` → clean
- `npm run lint` → no new findings; the 2 remaining errors are pre-existing, in
  `src/components/admin/trips-restore-dashboard.tsx` and `src/types/zip-stream.d.ts`, both untouched
  by this story
- `npm run build` → success; `/api/trips/[id]/view-counts` registered as a dynamic route
- `npm run audit` → 0 vulnerabilities

### File List

**Added**

- `travelblogs/src/app/api/trips/[id]/view-counts/route.ts`
- `travelblogs/tests/api/trips/trip-view-counts.test.ts`
- `travelblogs/tests/components/trip-detail-view-counts.test.tsx`
- `travelblogs/tests/components/shared-view-counts-leak.test.tsx` (added during code review)

**Modified**

- `travelblogs/src/utils/view-counter.ts`
- `travelblogs/src/components/trips/trip-detail.tsx`
- `travelblogs/src/utils/i18n.ts`
- `travelblogs/tests/components/trip-share-panel.test.tsx`
- `_bmad-output/implementation-artifacts/16-2-display-view-counts-in-edit-mode.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-09-21: Story created (PM).
- 2026-09-21: Implemented view-count aggregation helper, the gated
  `GET /api/trips/[id]/view-counts` endpoint, and the contributor-only trip and per-entry count
  display, with EN/DE labels and tests covering all 7 acceptance criteria. Status → review.
- 2026-09-21: Code review (3 layers). No acceptance-criteria violations. 9 patches applied:
  element-level validation of the counts payload, an AC 4 guard that renders the real
  `/trips/share/[token]` and `/trips/share/[token]/entries/[entryId]` pages (mutation-verified to
  fail on a real leak), a frozen clock in the aggregation test, shape-based rejection assertions,
  both locales exercised in the shared-path guard, the dead `role` field dropped from the route,
  `TripViewCounts` imported instead of re-declared, re-indented mock chains, and two corrected
  completion notes. The client-fetch architecture was reviewed and accepted as-is. 6 low-severity
  items deferred to `deferred-work.md`. Status → done.
