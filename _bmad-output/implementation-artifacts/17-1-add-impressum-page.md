---
baseline_commit: d13f5663ddae42fe42eaadef63e3addeca2a5051
---

# Story 17.1: Add Impressum Page

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the operator of the site,
I want a publicly reachable Impressum page,
so that the provider-identification obligation is met and readers can see who is responsible for the content.

## Acceptance Criteria

1. **Publicly reachable without authentication**
   - Given I am an anonymous visitor
   - When I open `/impressum`
   - Then the page renders
   - And I am not redirected to `/sign-in`
2. **Reachable from every public surface**
   - Given I am an anonymous visitor on any public page (`/`, `/sign-in`, `/trips/share/{token}`, `/trips/share/{token}/entries/{entryId}`, `/trips/share/{token}/map`)
   - When the page renders
   - Then a link to the Impressum is present and reachable in one click
3. **Content comes from one configured source**
   - Given the operator details are maintained in a single place
   - When the page renders
   - Then it shows those values and nothing hard-coded in the component tree
4. **No invented operator data ships**
   - Given the operator details have not been filled in
   - When the page renders
   - Then it shows an explicit "not configured" state
   - And it never displays a plausible-looking placeholder name, address, phone number or email
5. **Bilingual**
   - Given the UI language is English or German
   - When the page renders
   - Then all headings and labels come from the translation catalog in both languages
   - And the route stays `/impressum` in both languages
6. **Indexable and not counted**
   - Given the page is opened
   - When it renders
   - Then it fetches no data, embeds no view-count beacon and issues no external requests
   - And nothing blocks it from being indexed

   _Amended 2026-09-21 during code review._ The original wording said "a static, dynamic-free
   page". Reading the locale from `accept-language` requires `headers()`, which opts the route
   into per-request rendering — as the root layout already does for every route in this app, so
   no page here is statically prerendered. Per-request rendering is also the better outcome for
   AC 3: operator details are read from the environment on each request, so editing `.env` and
   restarting is enough, where a prerendered page would bake the values in at build time and
   serve stale data until the next rebuild. The AC now states the property that was actually
   intended and is actually verified.

## Tasks / Subtasks

- [x] Add the operator-details source (AC: 3, 4)
  - [x] Single content source (env-backed config or one content module) holding: provider name, address, contact email, optionally phone, and the person responsible for content
  - [x] Treat every field as optional; render an explicit "not configured" notice when required fields are missing
- [x] Add the page (AC: 1, 5, 6)
  - [x] `src/app/impressum/page.tsx`, server-rendered, no client JS needed
  - [x] Locale from `accept-language` via the existing `getLocaleFromAcceptLanguage` / `getTranslation` helpers
- [x] Add a shared public footer (AC: 2)
  - [x] `src/components/layout/site-footer.tsx` with the legal links
  - [x] Mount it so it appears on the public surfaces listed in AC 2, including the shared trip, entry and map pages
  - [x] Keep it visually quiet so it does not compete with the blog content
- [x] i18n (AC: 5)
  - [x] Add keys under a new `legal.*` namespace to both the `en` and `de` blocks of `src/utils/i18n.ts`
- [x] Tests (AC: 1-6)
  - [x] Page renders configured values
  - [x] Page renders the "not configured" state and no placeholder data when unset
  - [x] Footer links appear on the shared trip, entry and map pages
  - [x] `/impressum` is classified as public by the proxy

### Review Findings

Adversarial code review, 2026-09-21. Three layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor);
37 raw findings normalized to 22 after dedup, 4 dismissed as noise. Gates re-verified independently by
the reviewer: `tsc --noEmit` clean, 947 tests passing across 118 files, `eslint` clean.

- [x] [Review][Defer] Impressum body ignores the runtime UI language — `page.tsx` derives the locale from `accept-language` alone, while `site-footer.tsx` follows the client `LocaleProvider` that `account/language-selector.tsx` mutates. The choice is persisted to `localStorage` only (`utils/locale-storage.ts`), so the server cannot see it. A German-browser user who switches the UI to English gets a footer reading "Legal Notice" above a page rendered entirely in German, and the page never reacts to a later switch. AC 5 says "the UI language", not "the browser's Accept-Language". Root cause is a project-wide pattern (the shared trip/map pages do the same), so the fix is either a locale cookie app-wide or an accepted deviation. — deferred: app-wide pattern, needs its own story (a locale cookie across every server-rendered surface, not a change to 17.1).
- [x] [Review][Patch] AC 6 wording "static, dynamic-free" is not met literally — `await headers()` opts the route into per-request rendering. Dev self-flagged this; the intent (no beacon, no data fetching, no third-party requests) does hold, and per-request env reads are the better outcome for AC 3. Resolved: amend the AC wording to what was intended and verified.
- [x] [Review][Defer] `SITE_OPERATOR_*` has no deployment wiring and no runtime signal — the variables appear only in `.env.example`, `site-operator.ts` and tests; `grep -r SITE_OPERATOR` finds nothing in `deploy/` or any systemd unit. Nothing warns at boot and no healthcheck fails, so the likely production outcome is the site silently serving the "not configured" page — the exact outcome the story exists to prevent. — deferred: env is set manually at deploy; the systemd unit's environment is maintained by hand outside the repo, so no code or script change belongs in this story.
- [x] [Review][Patch] Operator schema models a natural person only — no legal form, authorized representative, register court + number or VAT ID (§5 DDG), and `contentResponsible` is a bare name where §18(2) MStV asks for name *and* address. Resolved: add optional `legalForm`, `representative`, `register`, `vatId` and `contentResponsibleAddress` fields, rendered only when set; required fields unchanged.
- [x] [Review][Patch] Root-layout wrapper adds a viewport-plus-footer scrollbar to every route [travelblogs/src/app/layout.tsx:61-64]
- [x] [Review][Patch] Non-empty env values are treated as valid — `SITE_OPERATOR_EMAIL=tbd` passes `isSiteOperatorConfigured` and renders a live broken `mailto:tbd`; the value is also interpolated unescaped [travelblogs/src/utils/site-operator.ts:64-65, travelblogs/src/components/legal/impressum-content.tsx:60]
- [x] [Review][Patch] Layout-guard test is a false-failure trap and misses the real bypass — asserts the filename list equals `["layout.tsx"]`, so any legitimate nested layout fails it, while `global-error.tsx` (which genuinely replaces the root layout) and non-`.tsx` extensions pass; also resolves via `process.cwd()` with no `root` set in `vitest.config.ts` [travelblogs/tests/components/site-footer.test.tsx:76-95]
- [x] [Review][Patch] Task "footer links appear on the shared trip, entry and map pages" is checked off with no test rendering any share route — the filesystem walk is a proxy for the claim, not evidence of it [travelblogs/tests/components/site-footer.test.tsx:63-95]
- [x] [Review][Patch] `.env.example` lists `SITE_OPERATOR_COUNTRY` above the `# Optional` marker while `REQUIRED_FIELDS` omits it — an operator following the example and a reader of the code draw different conclusions [travelblogs/.env.example:16, travelblogs/src/utils/site-operator.ts:22-28]
- [x] [Review][Patch] Page docstring claims "no client JavaScript" — the root layout mounts `SiteFooter`, a `"use client"` component, so the route does ship and hydrate client JS [travelblogs/src/app/impressum/page.tsx:10]
- [x] [Review][Patch] No `metadata` export — tab title, OG title and description all fall through to the generic "TravelBlogs" on a page whose purpose is to identify the operator [travelblogs/src/app/impressum/page.tsx:14]
- [x] [Review][Patch] Proxy matcher test hand-rolls a wrong model of Next's matcher syntax — splits on the literal `"/:path*"`, so it mis-models object-form matchers, non-star params and negative lookaheads; the genuine protection is the second new test that drives the real `proxy()` [travelblogs/tests/api/auth/proxy.test.ts:125-141]
- [x] [Review][Patch] Long operator values can overflow the card on narrow viewports — no `break-words` on the value wrappers [travelblogs/src/components/legal/impressum-content.tsx:44-63]
- [x] [Review][Patch] `React.ReactNode` used via the UMD global without importing React, while every other type in the file is imported explicitly [travelblogs/src/components/legal/impressum-content.tsx:12]
- [x] [Review][Defer] Second footer appears on `/manual` [travelblogs/src/components/manual/manual-content.tsx:176] — deferred, pre-existing. Note: the reported duplicate `contentinfo` landmark does **not** occur — `manual/page.tsx:20` wraps the content in `<main>`, so that inner `<footer>` is not a landmark. The two are also visually distinct (one inside the white card, one full-width outside).
- [x] [Review][Defer] Footer hard-codes a single link though it exists to be shared with story 17.2 [travelblogs/src/components/layout/site-footer.tsx:22-27] — deferred, 17.2 extends it; linking a not-yet-existing route now would ship a 404.
- [x] [Review][Defer] "Not configured" notice is written for the reader, not the operator — never says which variables to set [travelblogs/src/utils/i18n.ts:380] — deferred, pre-existing product nit.
- [x] [Review][Defer] Hard-coded hex colors and no dark-mode variants [travelblogs/src/components/layout/site-footer.tsx:17-29] — deferred, pre-existing. `globals.css:16-21` defines dark tokens but every existing page already hardcodes the light `#FBF7F1` shell; these two files follow the house convention rather than introducing a regression.
- [x] [Review][Defer] Low-value assertions — `expect(() => readSiteOperator()).not.toThrow()` asserts nothing about the `process.env` default path it is named for; the placeholder regexes will misfire on legitimate future copy containing "@", a year or German "zum Beispiel" [travelblogs/tests/utils/site-operator.test.ts:60-62] — deferred, pre-existing test-quality nit.
- [x] [Review][Defer] No back link from the Impressum — a visitor arriving from a shared trip has only the browser back button, and the share token is not retypeable [travelblogs/src/components/legal/impressum-content.tsx:34] — deferred, product decision.
- [x] [Review][Defer] `site-operator.ts` lacks `import "server-only"` — nothing stops a future client component importing it and silently rendering the not-configured state [travelblogs/src/utils/site-operator.ts:1] — deferred; the project rule that every import be declared in `package.json` makes this more than a one-line change.
- [x] [Review][Defer] `getLocaleFromAcceptLanguage` ignores q-values — `startsWith('de')` means `en;q=0.3,de;q=0.9` resolves to English [travelblogs/src/utils/i18n.ts:1176-1180] — deferred, pre-existing helper used app-wide.

**Dismissed as noise (4):** missing `Vary: Accept-Language` (no CDN in this deployment); `mustChangePassword` users reaching `/impressum` via the footer (no protected content becomes reachable); `robots: noindex` when unconfigured (contradicts AC 6's "Indexable"); AC 2's `/` surface lacking the footer (`/` only redirects to `/sign-in`, which does carry it).

## Dev Notes

### Developer Context

- **The route is public by default — verify, do not assume.** `config.matcher` in [travelblogs/src/proxy.ts] only matches `/trips/:path*`, `/entries/:path*`, `/account/:path*` and `/api/:path*`. `/impressum` never reaches the proxy, so no allowlist entry is needed. This is the opposite of the trap documented for `/trips/share/{token}/*` page routes, which **must** be added to `publicTripEntryView()` or they get auth-redirected. Add a proxy test anyway so a future matcher change cannot silently lock the page away.
- **There is no global footer today.** Confirmed: the only `footer` in the codebase is inside [travelblogs/src/components/manual/manual-content.tsx]. This story introduces the first shared one. The root layout is [travelblogs/src/app/layout.tsx].
- **AC 4 is not pedantry.** A shipped Impressum containing an invented name and address is worse than no Impressum — it is a false statement about who operates the site. Ship the empty state instead and let the operator fill it in.
- **AC 6 keeps the page boring on purpose.** No maps, no fonts from third parties, no beacon. A legal page that itself triggers third-party requests is an own goal.

### Technical Requirements

- Server component; no `"use client"` needed.
- No new runtime dependencies.
- Follow project naming: `PascalCase` components in `kebab-case.tsx` files, feature components under `src/components/<feature>/`.
- Configuration via `.env` / `.env.example` only — the project does not use `.env.local`.

### Scope Boundary

This story delivers the **page and its plumbing**. It deliberately does **not** author the legal text or decide what the obligation requires.

Whether §5 DDG applies at all is a question for the operator: the duty attaches to *geschäftsmäßige* telemedia, and a purely private family travel blog reachable only via share links is arguably not that. The page is built regardless because it is cheap, removes the question, and costs nothing if the duty does not apply. **Nobody on this project is giving legal advice — the final wording is the operator's decision, and a review by a qualified person is recommended before it goes live.**

### File Structure Requirements

- Page: `travelblogs/src/app/impressum/page.tsx`
- Footer: `travelblogs/src/components/layout/site-footer.tsx`
- Config: `travelblogs/.env.example` + a small `src/utils/site-operator.ts` reader
- Translations: `travelblogs/src/utils/i18n.ts`
- Tests: `travelblogs/tests/components/`, `travelblogs/tests/api/auth/proxy.test.ts`

### Testing Requirements

- Tests live under `travelblogs/tests/` (never colocated).
- Extend the existing `tests/api/auth/proxy.test.ts` for the public classification of `/impressum`.
- Component tests follow the existing hand-built-props pattern in `travelblogs/tests/components/`.

### Project Context Reference

- Source of truth: `_bmad-output/project-context.md`
- Key rules: App Router only, `utils/` not `lib/`, `.env` not `.env.local`, every user-facing string in EN **and** DE, tests under `travelblogs/tests/`.

### References

- Source: User request, 2026-09-21, following the compliance gap recorded in `deferred-work.md`
- Proxy matcher: `travelblogs/src/proxy.ts`
- Existing locale helpers: `travelblogs/src/utils/i18n.ts`
- Related: Story 17.2 (Datenschutzerklärung) shares the footer introduced here

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (1M context) — `claude-opus-5[1m]`

### Debug Log References

N/A

### Implementation Plan

1. **Operator source** — `src/utils/site-operator.ts` reads eight `SITE_OPERATOR_*` variables via an
   injectable env argument (defaults to `process.env`), trims values and normalizes every unset or
   blank one to `null`. `isSiteOperatorConfigured` requires name, street, postal code, city and email;
   country, phone and the content-responsible person stay optional.
2. **Page** — `src/app/impressum/page.tsx` is a thin async server component: it resolves the locale from
   `accept-language` and hands `readSiteOperator()` to a presentational
   `src/components/legal/impressum-content.tsx`. Keeping the operator values in props means no provider
   detail is hard-coded anywhere in the component tree (AC 3).
3. **Footer** — `src/components/layout/site-footer.tsx` is a small client component using the existing
   `useTranslation` hook, so the link label follows runtime language switches like the rest of the UI.
   Mounted once in the root layout inside a `min-h-screen flex-col` wrapper, which pins it to the bottom
   on short pages and leaves the existing `min-h-screen` page shells untouched otherwise.
4. **i18n** — new `legal.*` namespace inserted before `manual:` in both the `en` and `de` blocks.
5. **Tests** — red-green per task; see Completion Notes.

### Completion Notes List

All six acceptance criteria are implemented and covered by tests. Full gate run at completion:
**947 tests passing** across 118 files (1 pre-existing skip), `tsc --noEmit` clean, `next build`
successful, `npm audit` reporting **0 vulnerabilities**, and `eslint` clean on every file this story
touched.

- **AC 1 — public route.** Confirmed the Dev Notes claim rather than assuming it: `config.matcher` in
  `src/proxy.ts` covers only `/trips`, `/entries`, `/account` and `/api`, so `/impressum` never reaches
  the proxy. Two guards added to `tests/api/auth/proxy.test.ts`: one asserts no matcher pattern matches
  `/impressum` (with a positive control on `/trips` so the pattern helper cannot pass vacuously), and one
  asserts the proxy would still classify the route as public if a future matcher change let it through.
- **AC 2 — every public surface.** The footer is mounted in the single root layout, which every route
  nests inside, so `/`, `/sign-in` and all three shared surfaces carry it. `/` is a redirect to
  `/sign-in`, so it is covered by the sign-in surface. Backed by a test that renders the real
  `RootLayout` and asserts the rendered markup contains `href="/impressum"`, plus a structural guard
  asserting `src/app/layout.tsx` is the only layout in the tree — the one way a route could otherwise
  escape the footer.
- **AC 3 — one configured source.** All operator values flow env → `readSiteOperator()` → props. The
  content component contains no provider data of its own.
- **AC 4 — no invented data.** The not-configured branch is asserted to contain no `mailto:`/`tel:`
  link, no `@`, no run of four or more digits, and none of `example`/`muster`/`placeholder`/`lorem` —
  so a placeholder name, address, phone number or email cannot ship unnoticed.
- **AC 5 — bilingual.** Ten `legal.*` keys added to both catalogs and asserted to resolve in `en` and
  `de`; the route stays `/impressum` in both, asserted directly in the footer test.
- **AC 6 — boring on purpose.** No beacon, no `next/image`, no iframe, no script and no external link,
  each asserted. The `Source_Sans_3` font comes from the root layout and is self-hosted by Next.js at
  build time, so it triggers no third-party request at runtime.

**Two points worth the reviewer's attention:**

1. **The page renders dynamically (`ƒ`), not statically.** AC 6 says "static, dynamic-free". Reading the
   locale from `accept-language` requires `headers()`, which opts the route into per-request rendering —
   and the root layout already does this for every route in the app, so no page here is statically
   prerendered. This is also the better outcome for AC 3: operator details are read from the environment
   at request time, so editing `.env` and restarting the service is enough. Had the page been statically
   prerendered, the values would have been baked in at `npm run build` and a `.env` edit would silently
   show stale data until the next rebuild. I read "dynamic-free" as "no data fetching, no beacon, no
   external requests", all of which hold. Flagging it because it is a literal reading of the AC wording.
2. **The footer ships only the Impressum link.** The task says "legal links" (plural), but the privacy
   policy route arrives with story 17.2. Linking it now would ship a 404, so 17.2 extends the footer.

**Not in scope, by the story's own boundary:** no legal text was authored and no judgement was made
about whether §5 DDG applies. `.env.example` ships every operator variable blank with a comment warning
against placeholder values, so the page renders the not-configured state until the operator fills it in.
Nothing in this story constitutes legal advice; the final wording should be reviewed by a qualified
person before it goes live.

### File List

**Added**

- `travelblogs/src/utils/site-operator.ts`
- `travelblogs/src/app/impressum/page.tsx`
- `travelblogs/src/components/legal/impressum-content.tsx`
- `travelblogs/src/components/layout/site-footer.tsx`
- `travelblogs/tests/utils/site-operator.test.ts`
- `travelblogs/tests/components/impressum-page.test.tsx`
- `travelblogs/tests/components/site-footer.test.tsx`

**Modified**

- `travelblogs/src/app/layout.tsx` — mount `SiteFooter`
- `travelblogs/src/utils/i18n.ts` — `legal.*` namespace in `en` and `de`
- `travelblogs/.env.example` — `SITE_OPERATOR_*` variables
- `travelblogs/src/app/globals.css` — `--site-footer-h` and the `min-h-screen` offset (code review)
- `travelblogs/tests/api/auth/proxy.test.ts` — `/impressum` public-classification guards
- `travelblogs/tests/utils/i18n.test.ts` — `legal.*` catalog coverage

### Change Log

- 2026-09-21: Story created (PM).
- 2026-09-21: Implemented Impressum page, env-backed operator source, shared site footer and `legal.*`
  translations; added 23 tests across 5 files. Full suite 947 passing, typecheck clean, build successful,
  audit 0 vulnerabilities. Status → review (Dev).
- 2026-09-21: Adversarial code review (3 layers, 37 raw findings → 22 after dedup). 4 decision items
  resolved by the user: AC 6 reworded and the operator schema widened (both patched), locale
  split-brain and `SITE_OPERATOR_*` deploy wiring deferred. All 12 patches applied. Gate after
  review: **967 tests passing** across 118 files (1 pre-existing skip), `tsc --noEmit` clean,
  `eslint` clean, `next build` successful. Status → done (Review).
