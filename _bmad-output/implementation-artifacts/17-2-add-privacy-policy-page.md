# Story 17.2: Add Privacy Policy Page (Datenschutzerklärung)

Status: ready-for-dev

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

- [ ] Produce the data-processing inventory (AC: 3, 4, 5)
  - [ ] Structure the inventory so each activity has: what data, why, where it goes, and a legal-basis field for the operator to complete
  - [ ] Verify each entry against the code rather than copying this story, and correct the story if the code has moved on
- [ ] Add the page (AC: 1, 7, 8)
  - [ ] `src/app/datenschutz/page.tsx`, server-rendered, static, no client JS
  - [ ] Reuse the locale helpers already used by the manual page
- [ ] Add content source and empty state (AC: 6)
  - [ ] Single content source the operator fills, same approach as Story 17.1
  - [ ] Explicit "not yet published" state when unset
- [ ] Link it up (AC: 2)
  - [ ] Add the link to the `SiteFooter` introduced in Story 17.1
- [ ] i18n (AC: 7)
  - [ ] Extend the `legal.*` namespace in both the `en` and `de` blocks of `src/utils/i18n.ts`
- [ ] Tests (AC: 1-8)
  - [ ] All inventory sections from AC 3 are present in the rendered output
  - [ ] The OpenStreetMap disclosure is present (AC 4) — this is the substantive one
  - [ ] "Not yet published" state renders instead of boilerplate when unset
  - [ ] Footer link appears on the shared trip, entry and map pages
  - [ ] `/datenschutz` is classified as public by the proxy

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
