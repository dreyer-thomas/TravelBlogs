---
baseline_commit: 97770c1f38f00f49860308c65ffc2f50fb95595b
---

# Story 17.2: Add Privacy Policy Page (Datenschutzerklärung)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a reader of a shared trip,
I want to see what data the site processes about me and who it goes to,
so that I can make an informed decision before browsing.

As the operator,
I want the Art. 13 GDPR disclosure obligations met,
so that publishing trips via share links does not create an open compliance gap.

## Acceptance Criteria

1. **Publicly reachable without authentication**
   - Given I am an anonymous visitor
   - When I open `/datenschutz`
   - Then the page renders and I am not redirected to `/sign-in`
2. **Reachable from every public surface**
   - Given I am an anonymous visitor on `/`, `/sign-in`, or any `/trips/share/{token}` page
   - When the page renders
   - Then a link to the privacy policy is present and reachable in one click
3. **Every actual processing activity is covered**
   - Given the page renders
   - Then it covers, each as its own section:
     - **Account data** — email, name, role, bcrypt password hash, active flag, timestamps
     - **Trip content** — trips, entries, tags, uploaded photos and videos
     - **Location data** — GPS coordinates extracted from photo EXIF metadata, place names, country codes
     - **Weather data** — historical weather retrieved per entry location
     - **Map tiles from OpenStreetMap** — the visitor's IP address and User-Agent are sent to a third party (see AC 4)
     - **Share links** — token-based access without login
     - **Server access logs** — IP addresses, handled by the hosting infrastructure
     - **Page-view counter** — only if Epic 16 has shipped; state explicitly that no personal data is stored
4. **The OpenStreetMap tile transfer is disclosed explicitly**
   - Given any public page that renders a map
   - When the privacy policy describes it
   - Then it states that map tiles are loaded directly by the visitor's browser from `tile.openstreetmap.org`
   - And that this transmits the visitor's IP address and User-Agent to the OpenStreetMap Foundation
   - And it names the affected pages: shared trip, shared entry, shared full-screen map
5. **Server-side-only services are described accurately**
   - Given the policy covers Nominatim geocoding and Open-Meteo weather
   - When it describes them
   - Then it states that these are called **from the server**, so the visitor's IP address is never sent to them
   - And it does not overstate the processing by implying a browser-side transfer
6. **No invented legal text ships**
   - Given the operator has not supplied or approved the wording
   - When the page renders
   - Then it shows an explicit "not yet published" state rather than generated boilerplate presented as the operator's own policy
7. **Bilingual**
   - Given the UI language is English or German
   - When the page renders
   - Then all headings and labels come from the translation catalog in both languages
   - And the route stays `/datenschutz` in both languages
8. **The page itself triggers no third-party requests**
   - Given the page renders
   - Then it loads no map, no external font, no external script, and fires no view-count beacon

## Tasks / Subtasks

- [x] Produce the data-processing inventory (AC: 3, 4, 5)
  - [x] Structure the inventory so each activity has: what data, why, where it goes, and a legal-basis field for the operator to complete
  - [x] Verify each entry against the code rather than copying this story, and correct the story if the code has moved on
- [x] Add the page (AC: 1, 7, 8)
  - [x] `src/app/datenschutz/page.tsx`, server-rendered, static, no client JS
  - [x] Reuse the locale helpers already used by the manual page
- [x] Add content source and empty state (AC: 6)
  - [x] Single content source the operator fills, same approach as Story 17.1
  - [x] Explicit "not yet published" state when unset
- [x] Link it up (AC: 2)
  - [x] Add the link to the `SiteFooter` introduced in Story 17.1
- [x] i18n (AC: 7)
  - [x] Extend the `legal.*` namespace in both the `en` and `de` blocks of `src/utils/i18n.ts`
- [x] Tests (AC: 1-8)
  - [x] All inventory sections from AC 3 are present in the rendered output
  - [x] The OpenStreetMap disclosure is present (AC 4) — this is the substantive one
  - [x] "Not yet published" state renders instead of boilerplate when unset
  - [x] Footer link appears on the shared trip, entry and map pages
  - [x] `/datenschutz` is classified as public by the proxy


### Review Findings

Code review 2026-09-22 — three parallel layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor). All 8 ACs verified as met; findings below are accuracy, gating and durability defects.

- [x] [Review][Patch] Gate the operator-supplied legal values on `published` (decision D1 → A) — `draftBody` states the material below "is not a statement by the operator", but the operator's own legal bases, retention and rights render unconditionally at [travelblogs/src/components/legal/privacy-policy-content.tsx:181/195/205], outside the gate that guards the effective date at :74-79. Resolution: when unpublished, render only the pending placeholders so the banner stays truthful.
- [x] [Review][Patch] Reject placeholder values in every required field (decision D2 → A) — [travelblogs/src/utils/privacy-policy.ts:115-120] runs `isIsoCalendarDate` on the date and a bare null check on retention, rights and all nine legal bases, so `SITE_PRIVACY_LEGAL_BASIS_ACCOUNT=tbd` publishes "Legal basis: tbd" as binding text. Resolution: case-insensitive denylist (`tbd`, `todo`, `tba`, `xxx`, `-`, `n/a`, `?`) plus a minimum length, and strip zero-width characters that `trim()` leaves behind.
- [x] [Review][Patch] Make the published gate operator-aware and decouple the address from email validity (decision D3 → A) — [travelblogs/src/utils/privacy-policy.ts:115-120] takes no operator input, so `SITE_OPERATOR_EMAIL=tbd` yields "In effect since <date>" above "no responsible party can be named here"; and `isSiteOperatorConfigured` ([travelblogs/src/utils/site-operator.ts:97-99]) requires a valid email, suppressing the controller's name and postal address. Resolution: require configured operator details for publication, and render name/address independently of email validity.
- [x] [Review][Patch] "Affected pages" sentence is phrased as exhaustive but omits the authenticated map surfaces [travelblogs/src/utils/i18n.ts:444, :1060]
- [x] [Review][Patch] Policy claims the stored locale makes the site open in the last-chosen language, which the code never does [travelblogs/src/utils/i18n.ts:467, :1083]
- [x] [Review][Patch] Effective date rendered as a raw ISO string in both locales instead of via `formatDate` [travelblogs/src/components/legal/privacy-policy-content.tsx:76-79]
- [x] [Review][Patch] The "fourth tile layer" guard iterates three hardcoded paths and cannot detect a fourth [travelblogs/tests/components/privacy-policy-page.test.tsx:195]
- [x] [Review][Patch] German AC-4 test omits the User-Agent and affected-pages assertions the English one makes [travelblogs/tests/components/privacy-policy-page.test.tsx:184-196]
- [x] [Review][Patch] No EN/DE structural parity test, and `getTranslation` returns the raw key on a miss [travelblogs/src/utils/i18n.ts:1245-1259]
- [x] [Review][Patch] Multi-line retention and rights values collapse into one run-on paragraph [travelblogs/src/components/legal/privacy-policy-content.tsx:194-207]
- [x] [Review][Patch] A rejected or missing value produces no diagnostic anywhere — no log, no startup check [travelblogs/src/utils/privacy-policy.ts:115]
- [x] [Review][Patch] No upper bound on the effective date; `9999-12-31` publishes as "in effect" [travelblogs/src/utils/privacy-policy.ts:59-68]
- [x] [Review][Patch] Google substring ban fails a correct policy that cites any Google service [travelblogs/tests/components/privacy-policy-page.test.tsx:224]
- [x] [Review][Patch] Test named "accepts a valid ISO calendar date" feeds `2026-02-29` and asserts false [travelblogs/tests/utils/privacy-policy.test.ts:163-166]
- [x] [Review][Patch] Published-state tests filed under the `unpublished state (AC 6)` describe block [travelblogs/tests/components/privacy-policy-page.test.tsx:230-292]
- [x] [Review][Patch] Pending-text count asserted as a magic `PRIVACY_ACTIVITY_IDS.length + 2` [travelblogs/tests/components/privacy-policy-page.test.tsx:244]
- [x] [Review][Patch] No `robots` directive, so an explicitly unpublished legal page is indexable [travelblogs/src/app/datenschutz/page.tsx:18-24]
- [x] [Review][Patch] Draft banner body is muted grey on a red tint — the least legible text on the page [travelblogs/src/components/legal/privacy-policy-content.tsx:89-90]
- [x] [Review][Defer] `mustChangePassword` branch would bounce the legal routes if the matcher ever widened [travelblogs/src/proxy.ts:113-124] — deferred, pre-existing
- [x] [Review][Defer] Page locale ignores the stored preference and Accept-Language q-values [travelblogs/src/app/datenschutz/page.tsx:9-11] — deferred, pre-existing
- [x] [Review][Defer] Cookies section names neither the cookie, the storage key, nor any lifetime [travelblogs/src/utils/i18n.ts:465-468] — deferred, pre-existing
- [x] [Review][Defer] AC-8 test asserts absent strings rather than the import graph [travelblogs/tests/components/privacy-policy-page.test.tsx:380-407] — deferred, pre-existing
- [x] [Review][Defer] AC 2 is ticked off with no test that renders an actual share route [travelblogs/tests/components/site-footer.test.tsx:50-95] — deferred, pre-existing

## Dev Notes

### Developer Context — What the code actually does

This inventory was taken from the code on 2026-09-21. Re-verify before publishing.

**Leaves the visitor's browser (the disclosure-relevant one):**

- **OpenStreetMap tiles.** `L.tileLayer("https://{s}.tile.openstreetmap.org/...")` is called client-side in three components:
  - [travelblogs/src/components/trips/trip-map.tsx:112]
  - [travelblogs/src/components/trips/fullscreen-trip-map.tsx:166]
  - [travelblogs/src/components/entries/entry-hero-map.tsx:71]

  All three reach anonymous readers: `TripMap` via `TripOverview` on the shared trip page, `EntryHeroMap` and `TripMap` via `EntryReader` on the shared entry page, and `FullscreenTripMap` on `/trips/share/{token}/map`. Every reader of a shared trip therefore sends their IP address and User-Agent to the OpenStreetMap Foundation. **This is the single most significant item in this policy.**

**Does not leave the visitor's browser:**

- **Nominatim geocoding** — server-side only: [travelblogs/src/app/api/locations/search/route.ts], [travelblogs/src/utils/reverse-geocode.ts]. Verified: neither is imported by a `"use client"` component.
- **Open-Meteo weather** — server-side only: [travelblogs/src/utils/fetch-weather.ts], used from the entries API routes.
- **Fonts** — `Source_Sans_3` via `next/font/google` in [travelblogs/src/app/layout.tsx] is **self-hosted at build time**. No request goes to Google from the visitor's browser. Do not claim otherwise; a policy that invents a Google Fonts transfer is as wrong as one that omits a real transfer.
- **World map** — [travelblogs/src/components/trips/world-map.tsx] renders GeoJSON with no tile layer, so it makes no external request. It is also behind authentication.

### Technical Requirements

- Server component, no `"use client"`.
- No new runtime dependencies.
- Route public by default; `config.matcher` in [travelblogs/src/proxy.ts] does not cover `/datenschutz`. Add a proxy test so a future matcher change cannot lock it away.

### Scope Boundary

This story delivers the **page, the structure and the verified inventory**. It does **not** author the operator's legal wording, and nobody on this project is giving legal advice. The inventory is an engineering artifact — a factual description of what the code does — and it is exactly what a qualified reviewer will ask for first. Have the final text reviewed before it goes live.

### Alternative Considered

The OpenStreetMap transfer could be **avoided** instead of disclosed, by deferring tile loading behind an explicit "load map" click, or by proxying tiles through the application server. Both are larger changes and both degrade the reading experience, so v1 discloses. Recorded in `deferred-work.md` as an option if disclosure turns out not to be acceptable.

### File Structure Requirements

- Page: `travelblogs/src/app/datenschutz/page.tsx`
- Footer link: `travelblogs/src/components/layout/site-footer.tsx` (from Story 17.1)
- Translations: `travelblogs/src/utils/i18n.ts`
- Tests: `travelblogs/tests/components/`, `travelblogs/tests/api/auth/proxy.test.ts`

### Testing Requirements

- Tests live under `travelblogs/tests/` (never colocated).
- The AC 4 test must assert on rendered output, not on a constant, so that removing the disclosure fails the suite.

### Previous Story Intelligence

- Story 17.1 introduces the shared `SiteFooter` and the config-plus-empty-state pattern; reuse both rather than inventing a second approach.
- Epic 16 is deliberately independent: its counter stores no personal data, so this page is not a precondition for shipping it. If Epic 16 ships first, add its section per AC 3.

### Project Context Reference

- Source of truth: `_bmad-output/project-context.md`
- Key rules: App Router only, `utils/` not `lib/`, every user-facing string in EN **and** DE, tests under `travelblogs/tests/`.

### References

- Source: User request, 2026-09-21
- Tile layers: `trip-map.tsx:112`, `fullscreen-trip-map.tsx:166`, `entry-hero-map.tsx:71`
- Server-side services: `reverse-geocode.ts`, `fetch-weather.ts`, `api/locations/search/route.ts`
- Self-hosted font: `src/app/layout.tsx`
- Account data model: `travelblogs/prisma/schema.prisma` (`User`, `Trip`, `Entry`, `EntryMedia`, `Tag`, `TripShareLink`, `TripAccess`)

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (1M context) — `claude-opus-5[1m]`

### Debug Log References

N/A — no blocking defects during implementation.

### Implementation Plan

The page has two halves that must not be confused, and the whole design follows
from keeping them apart:

- The **inventory** — what data this site handles, why, and where it goes — is a
  description of the code. It is true whether or not anyone has written a
  policy, so it renders unconditionally.
- The **legal half** — the basis for each activity, retention, data-subject
  rights — is the operator's assessment of their own processing. Nobody else can
  make it, so it is read from the environment and rendered only where set.

That split is what satisfies AC 3 and AC 6 at the same time: the reader always
gets the factual picture, and no generated wording is ever presented as the
operator's published policy.

1. `src/utils/privacy-policy.ts` — the operator-supplied half, env-backed,
   mirroring `site-operator.ts` from Story 17.1. `PRIVACY_ACTIVITY_IDS` is the
   single list of activities; `legalBasisEnvKey()` derives each activity's env
   variable from its id, so there is no second list to forget.
2. `src/components/legal/privacy-policy-content.tsx` — presentational body,
   every string from the catalog, one `<section>` per activity carrying
   what / why / where / legal basis.
3. `src/app/datenschutz/page.tsx` — server component, no `"use client"`, reads
   per request so a `.env` edit takes effect on restart without a rebuild.
4. `SiteFooter` gains the second link; the root layout already mounts it, so
   every public surface reaches the page in one click.
5. `legal.privacy.*` added to both the `en` and `de` blocks of `i18n.ts`.

### Completion Notes List

**Inventory re-verified against the code (2026-09-22), not copied from the story.**
Everything the story's Dev Notes claimed still holds: the three tile layers are
at `trip-map.tsx:112`, `fullscreen-trip-map.tsx:166` and
`entry-hero-map.tsx:71`; Nominatim and Open-Meteo are reachable only from server
modules; `Source_Sans_3` is self-hosted by `next/font`; `world-map.tsx` has no
tile layer. Leaflet's marker icons resolve through `new URL(..., import.meta.url)`
and are bundled, not pulled from a CDN — so map tiles really are the only
third-party transfer from a reader's browser.

Two corrections to the story's picture:

1. **Epic 16 has shipped** (`16-1` and `16-2` are `done`), so AC 3's conditional
   page-view-counter section is unconditional here. Verified against
   `view-counter.ts` and the `TripView` / `EntryView` models: the rows hold only
   a target id, a UTC day and an integer. The User-Agent is tested in memory to
   filter crawlers and discarded — `api/trips/share/[token]/view/route.ts`
   stores nothing about the reader, so "no personal data is stored" is accurate
   as written.
2. **The story's inventory was missing one activity.** There is a NextAuth
   session cookie (signed-in editors only) and a locale preference in
   `localStorage`. Neither is exotic, but a privacy policy that silently omits
   its cookies is the kind of gap a reviewer finds first, so a ninth section
   (`cookies`) was added covering both — including the fact that reading a
   shared trip sets no cookie at all.

**Why the published gate is all-or-nothing.** `isPrivacyPolicyPublished()`
requires the effective date, retention, rights *and* all nine legal bases. A
policy that covers eight activities and leaves the ninth blank still reads as a
finished document, and that gap is precisely what a reader cannot see. The
effective date is validated as a real ISO calendar date, so
`SITE_PRIVACY_EFFECTIVE_DATE=tbd` — or `2026-02-29`, which is not a real date —
keeps the page honest instead of rendering "In effect since tbd". This is the
same trap `SITE_OPERATOR_EMAIL=tbd` hit in Story 17.1's review.

**Verified against a running server, not only in tests** (dev server, anonymous
`curl`):

- AC 1 — `GET /datenschutz` returns 200 with zero redirects for an anonymous
  visitor.
- AC 2 — `href="/datenschutz"` is present on `/sign-in`, `/impressum`, and on
  all three shared surfaces (`/trips/share/{token}`, `.../map`,
  `.../entries/{entryId}`) — i.e. on exactly the pages that load OSM tiles. `/`
  redirects anonymous visitors to `/sign-in`, which carries the link.
- AC 4 — `tile.openstreetmap.org`, `OpenStreetMap Foundation` and `User-Agent`
  all appear in the rendered HTML.
- AC 7 — `Accept-Language: de-DE` renders `<title>Datenschutzerklärung</title>`
  and `lang="de"` at the same `/datenschutz` URL.
- AC 8 — every `src`/`href` in the rendered page is same-origin; no external
  font, script, image, map or beacon.
- AC 6 — unset env renders the "not yet published" notice; with the env set the
  banner disappears and no "to be completed" placeholder remains.

**Scope held.** No legal wording was authored. The bodies describe what the
software does; every sentence stating a legal position is left to the operator.
The final text still needs a qualified review before it goes live.

**Unrelated observation:** `npm run build` (Next 16) generated
`travelblogs/AGENTS.md` and `travelblogs/CLAUDE.md` as untracked files. They are
not part of this story and were left in place for Tommy to commit or ignore.

**Validation:** 1025 tests pass across 120 files (1 pre-existing skip), zero
regressions; `tsc --noEmit` clean; production build succeeds with `/datenschutz`
listed as a dynamic route; `npm audit` reports 0 vulnerabilities. `eslint` on
the nine files this story touches is clean — the repo's 2 remaining lint errors
are pre-existing in `trips-restore-dashboard.tsx` and `zip-stream.d.ts`, both
untouched here.

### File List

**Added**

- `travelblogs/src/app/datenschutz/page.tsx`
- `travelblogs/src/components/legal/privacy-policy-content.tsx`
- `travelblogs/src/utils/privacy-policy.ts`
- `travelblogs/tests/components/privacy-policy-page.test.tsx`
- `travelblogs/tests/utils/privacy-policy.test.ts`

**Modified**

- `travelblogs/.env.example`
- `travelblogs/src/components/layout/site-footer.tsx`
- `travelblogs/src/utils/i18n.ts`
- `travelblogs/src/utils/site-operator.ts` (code review: `isOperatorIdentityConfigured`)
- `travelblogs/tests/api/auth/proxy.test.ts`
- `travelblogs/tests/components/site-footer.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/17-2-add-privacy-policy-page.md`

### Change Log

- 2026-09-21: Story created (PM).
- 2026-09-22: Implemented `/datenschutz` — a publicly reachable, bilingual
  privacy policy carrying a code-verified processing inventory (9 activities),
  an explicit OpenStreetMap tile disclosure, an env-backed operator content
  source and a "not yet published" empty state. 58 tests added (54 in two new
  files, +4 in the footer and proxy suites). Status → review.
- 2026-09-22: Code review (3 layers). 3 decisions resolved to the stricter
  option and 15 further patches applied: the published gate now also requires a
  configured operator, rejects placeholder values and future effective dates,
  and withholds the operator's wording until the policy is complete; two
  factual errors in the policy copy corrected in EN and DE (the affected-pages
  list omitted the authenticated map surfaces; the stored locale was described
  as doing something the code never does); the effective date is localized;
  misconfiguration is now logged naming the variable at fault; an unpublished
  page is `noindex`. Test suite 1052 passing across 120 files (1 pre-existing
  skip), `tsc` and `eslint` clean, production build succeeds. Status -> done.
