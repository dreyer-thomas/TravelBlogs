# Story 17.1: Add Impressum Page

Status: ready-for-dev

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
   - Then it is a static, dynamic-free page with no view-count beacon and no external requests

## Tasks / Subtasks

- [ ] Add the operator-details source (AC: 3, 4)
  - [ ] Single content source (env-backed config or one content module) holding: provider name, address, contact email, optionally phone, and the person responsible for content
  - [ ] Treat every field as optional; render an explicit "not configured" notice when required fields are missing
- [ ] Add the page (AC: 1, 5, 6)
  - [ ] `src/app/impressum/page.tsx`, server-rendered, no client JS needed
  - [ ] Locale from `accept-language` via the existing `getLocaleFromAcceptLanguage` / `getTranslation` helpers
- [ ] Add a shared public footer (AC: 2)
  - [ ] `src/components/layout/site-footer.tsx` with the legal links
  - [ ] Mount it so it appears on the public surfaces listed in AC 2, including the shared trip, entry and map pages
  - [ ] Keep it visually quiet so it does not compete with the blog content
- [ ] i18n (AC: 5)
  - [ ] Add keys under a new `legal.*` namespace to both the `en` and `de` blocks of `src/utils/i18n.ts`
- [ ] Tests (AC: 1-6)
  - [ ] Page renders configured values
  - [ ] Page renders the "not configured" state and no placeholder data when unset
  - [ ] Footer links appear on the shared trip, entry and map pages
  - [ ] `/impressum` is classified as public by the proxy

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
