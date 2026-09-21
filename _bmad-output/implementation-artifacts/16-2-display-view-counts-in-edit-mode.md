# Story 16.2: Display View Counts in Edit Mode

Status: ready-for-dev

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

- [ ] Read-side aggregation (AC: 1, 2, 5)
  - [ ] Add helpers to sum `TripView.views` (total and last 30 days) and `EntryView.views` (total per entry)
  - [ ] Return `0` for targets with no rows rather than `null`
  - [ ] Aggregate entry counts for a whole trip in one query — no N+1 per entry card
- [ ] Expose counts to the authenticated surfaces (AC: 1, 2, 7)
  - [ ] Extend the trip detail data path so counts reach the page only when the caller may see them
  - [ ] Gate on the same contributor permission the edit affordances already use
  - [ ] Reject unauthorized callers with `{ error: { code, message } }`
- [ ] UI (AC: 1, 2, 3, 5, 6)
  - [ ] Show trip total + last 30 days on the trip detail page, gated on `canEditTrip`
  - [ ] Show per-entry totals on the entry cards, gated the same way
  - [ ] Keep the presentation discreet — this is an editor's metric, not a headline
- [ ] i18n (AC: 6)
  - [ ] Add new keys under `trips.*` / `entries.*` to both the `en` and `de` blocks of `src/utils/i18n.ts`
- [ ] Tests (AC: 1-7)
  - [ ] Component tests: counts visible with contribute permission, absent without
  - [ ] Test that no count appears in the shared-view render path
  - [ ] Test the zero state
  - [ ] Test that the count-returning endpoint rejects anonymous callers

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

## Dev Agent Record

### Agent Model Used

_To be filled by the dev agent._

### Debug Log References

N/A

### Implementation Plan

_To be filled by the dev agent._

### Completion Notes List

_To be filled by the dev agent._

### File List

_To be filled by the dev agent._

### Change Log

- 2026-09-21: Story created (PM).
