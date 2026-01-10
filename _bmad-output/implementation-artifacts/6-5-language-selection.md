# Story 6.5: Language Selection (EN/DE)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to switch the application language between English and German,
so that the entire UI and date/time formatting match my preference.

## Acceptance Criteria

1. **Given** I am signed in
   **When** I open the language selector
   **Then** I can choose English or German
2. **Given** I switch the language
   **When** the UI re-renders
   **Then** all visible text updates to the selected language
3. **Given** I switch the language
   **When** dates and times are rendered
   **Then** they follow the locale format for the selected language
4. **Given** I refresh the page or reopen the app
   **When** my language preference was previously set
   **Then** the app loads in that language

## Tasks / Subtasks

- [x] Define i18n strategy and locale storage (AC: 1-4)
  - [x] Store user preference in profile or local storage (pick one and document)
  - [x] Establish translation keys for shared UI strings
- [x] Add language selector UI (AC: 1)
  - [x] Provide a language toggle or selector in a global location
- [x] Localize UI content (AC: 2)
  - [x] Ensure all user-facing strings route through the translation layer
- [x] Localize date/time formatting (AC: 3)
  - [x] Use locale-aware date/time formatting for EN/DE
- [x] Persist and restore language preference (AC: 4)
  - [x] Load stored language on app start and apply before rendering
- [x] Add/adjust tests (AC: 1-4)
  - [x] Component tests for language toggle and persisted preference
  - [x] Utility tests for date/time formatting by locale

## Dev Notes

- The UI currently renders static English strings; introduce a translation layer that can be reused across pages and components. [Source: travelblogs/src/app]
- Date formatting is done with `toLocaleDateString` in several components; standardize locale usage based on the selected language. [Source: travelblogs/src/components/trips/trip-detail.tsx] [Source: travelblogs/src/components/entries/entry-detail.tsx]
- Keep locale formatting consistent with EN (`en-US`) and DE (`de-DE`).

### Technical Requirements

- Supported locales: English and German only.
- Language selection must update all visible UI strings without full page reload if feasible.
- Date/time formatting must follow the selected locale (e.g., `en-US` vs `de-DE`).
- Persist preference across sessions.

### UX Requirements

- Selector should be clear and unobtrusive; match existing button/typography styling. [Source: _bmad-output/ux-design-specification.md]
- Use short labels (e.g., EN / DE or English / Deutsch) and clear state indication.

### Architecture Compliance

- App Router only; no external i18n framework unless approved.
- Use TypeScript and central utilities for translation and formatting.
- Avoid adding new top-level directories; use `utils/` for shared helpers.

### Library/Framework Requirements

- Next.js App Router + TypeScript.
- Auth.js (NextAuth) 4.24.13 JWT sessions with `token.sub`, `token.role`.
- Prisma 7.2.0 + SQLite (no schema changes required unless storing preference in DB).

### File Structure Requirements

- Translation utilities: `travelblogs/src/utils/`.
- Selector UI placement: existing global layout or trip header as decided.
- Tests: `travelblogs/tests/components/` and `travelblogs/tests/utils/`.

### Testing Requirements

- Component tests:
  - Language selector toggles UI text between EN and DE.
  - Language preference persists after reload.
- Utility tests:
  - Date formatting outputs expected locale formats for EN/DE.

### Previous Story Intelligence

- Role-based access and trip views already exist; do not break share-link views when switching language. [Source: _bmad-output/implementation-artifacts/4-5-invalidate-shared-entry-pages-on-revoke.md]

### Git Intelligence Summary

- Recent commits added viewer invites and contributor access; avoid regressions in Auth.js session handling and `{ data, error }` response shape. [Source: git log -5]

### Latest Tech Information

- Web research not performed due to network restrictions; use pinned versions and patterns in `_bmad-output/project-context.md`.

### Project Context Reference

- App Router only; REST endpoints plural; API responses wrapped `{ data, error }` with `{ error: { code, message } }`.
- Tests live in `tests/` (no co-located tests) and JSON fields are `camelCase`.
- Do not introduce Docker/TLS proxy in MVP tasks.

### Story Completion Status

- Status: ready-for-dev
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Components live under `travelblogs/src/components/<feature>/`.
- Tests live under `travelblogs/tests/` (no co-located tests).

### References

- Epic and acceptance criteria: `_bmad-output/epics.md`
- Architecture and patterns: `_bmad-output/architecture.md`
- Project rules: `_bmad-output/project-context.md`
- UX design system: `_bmad-output/ux-design-specification.md`

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Drafted language selection requirements with EN/DE localization and locale date/time formatting.
- Added persistence and test coverage expectations.
- ✅ Implemented i18n infrastructure with translation utilities ([travelblogs/src/utils/i18n.ts](../../travelblogs/src/utils/i18n.ts:1))
- ✅ Created LocaleProvider with React Context for client-side locale management ([travelblogs/src/utils/locale-context.tsx](../../travelblogs/src/utils/locale-context.tsx:1))
- ✅ Implemented localStorage-based locale persistence ([travelblogs/src/utils/locale-storage.ts](../../travelblogs/src/utils/locale-storage.ts:1))
- ✅ Created useTranslation hook for convenient access to translations and date formatting ([travelblogs/src/utils/use-translation.ts](../../travelblogs/src/utils/use-translation.ts:1))
- ✅ Added LanguageSelector component in user menu ([travelblogs/src/components/account/language-selector.tsx](../../travelblogs/src/components/account/language-selector.tsx:1))
- ✅ Integrated LocaleProvider in root layout for app-wide i18n support ([travelblogs/src/app/layout.tsx](../../travelblogs/src/app/layout.tsx:25-27))
- ✅ Localized user menu strings (Account, User Manual, Change password, Check out) ([travelblogs/src/components/account/user-menu.tsx](../../travelblogs/src/components/account/user-menu.tsx:90-115))
- ✅ Localized TripCard component strings: View, Edit, Active, Loading ([travelblogs/src/components/trips/trip-card.tsx](../../travelblogs/src/components/trips/trip-card.tsx:1))
- ✅ Localized TripDetail component strings: Trip overview, Owner, View, Edit trip, Trip actions ([travelblogs/src/components/trips/trip-detail.tsx](../../travelblogs/src/components/trips/trip-detail.tsx:1))
- ✅ Implemented locale-aware date formatting in TripCard and TripDetail using formatDateLocalized
- ✅ Added comprehensive tests for i18n utils, locale storage, and language selector
- ✅ Updated existing tests to work with LocaleProvider (trip-card, trip-detail, trip-share-panel, user-menu, trips-page)
- ✅ All 367 tests passing
- Decision: Used localStorage for persistence (not DB) to keep implementation simple and client-side
- Pattern established for future component localization using t() function from useTranslation hook
- Date formatting utilities ready for use: formatDate() and formatDateTime() with locale awareness
- Fixed detectBrowserLocale to handle missing navigator.language in test environments
- ✅ Extended i18n translations with comprehensive trip-related strings based on user feedback ([travelblogs/src/utils/i18n.ts](../../travelblogs/src/utils/i18n.ts:25-65))
- ✅ Localized EditTripForm component fields: Trip title, Start date, End date, Cover image, Save changes, Cancel ([travelblogs/src/components/trips/edit-trip-form.tsx](../../travelblogs/src/components/trips/edit-trip-form.tsx:203-312))
- ✅ Created EditTripHeader client component for edit trip page header localization ([travelblogs/src/components/trips/edit-trip-header.tsx](../../travelblogs/src/components/trips/edit-trip-header.tsx:1))
- ✅ Updated edit trip page to use localized header component ([travelblogs/src/app/trips/[tripId]/edit/page.tsx](../../travelblogs/src/app/trips/[tripId]/edit/page.tsx:49))
- ✅ Created TripsPageContent client component for trips page localization ([travelblogs/src/components/trips/trips-page-content.tsx](../../travelblogs/src/components/trips/trips-page-content.tsx:1))
- ✅ Localized trips page strings: Manage trips, Your trips, Start a new trip, Manage users, Create trip ([travelblogs/src/components/trips/trips-page-content.tsx](../../travelblogs/src/components/trips/trips-page-content.tsx:42-70))
- ✅ Created TripsNoAccess client component for access restriction messages ([travelblogs/src/components/trips/trips-no-access.tsx](../../travelblogs/src/components/trips/trips-no-access.tsx:1))
- ✅ Updated trips page to use localized client components ([travelblogs/src/app/trips/page.tsx](../../travelblogs/src/app/trips/page.tsx:53-94))
- ✅ Localized TripDetail additional strings: Back to trips, Add story, Transfer ownership, Revoke share link ([travelblogs/src/components/trips/trip-detail.tsx](../../travelblogs/src/components/trips/trip-detail.tsx:1))
- ✅ Updated trips-page test with proper translation mocks ([travelblogs/tests/components/trips-page.test.tsx](../../travelblogs/tests/components/trips-page.test.tsx:30-59))
- ✅ All 367 tests passing after comprehensive localization
- Architecture note: Server components localized by extracting UI into client components, maintaining Next.js App Router architecture
- ✅ Extended i18n translations with admin users management strings ([travelblogs/src/utils/i18n.ts](../../travelblogs/src/utils/i18n.ts:89-117))
- ✅ Created UsersPageHeader client component for admin users page header localization ([travelblogs/src/components/admin/users-page-header.tsx](../../travelblogs/src/components/admin/users-page-header.tsx:1))
- ✅ Localized UsersDashboard component strings: Users, Add user, Close form, Create a user ([travelblogs/src/components/admin/users-dashboard.tsx](../../travelblogs/src/components/admin/users-dashboard.tsx:24-52))
- ✅ Updated admin users page to use localized header component ([travelblogs/src/app/admin/users/page.tsx](../../travelblogs/src/app/admin/users/page.tsx:72))
- ✅ Updated users-dashboard test with LocaleProvider wrapper ([travelblogs/tests/components/admin/users-dashboard.test.tsx](../../travelblogs/tests/components/admin/users-dashboard.test.tsx:17-19))
- ✅ All 367 tests passing with admin users page localization
- ✅ Extended admin translations with comprehensive form and user list strings: Email address, Full name, Role, Temporary password, Creating user, Edit user, Save role, Deactivate, Activate, Delete user, Confirm delete, No users yet ([travelblogs/src/utils/i18n.ts](../../travelblogs/src/utils/i18n.ts:89-128))
- ✅ Localized UserForm component with all form labels, placeholders, and button states ([travelblogs/src/components/admin/user-form.tsx](../../travelblogs/src/components/admin/user-form.tsx:58-233))
- ✅ Localized UserList component with role labels, status badges, action buttons, and all user management controls ([travelblogs/src/components/admin/user-list.tsx](../../travelblogs/src/components/admin/user-list.tsx:47-370))
- ✅ Updated user-form and user-list tests with LocaleProvider wrappers ([travelblogs/tests/components/admin/user-form.test.tsx](../../travelblogs/tests/components/admin/user-form.test.tsx:16-39), [travelblogs/tests/components/admin/user-list.test.tsx](../../travelblogs/tests/components/admin/user-list.test.tsx:26))
- ✅ All 367 tests passing with complete admin users management localization
- 🔥 Code Review: Fixed hardcoded English fallback message in shared trip page by removing fallback - component uses localized default ([travelblogs/src/app/trips/share/[token]/page.tsx](../../travelblogs/src/app/trips/share/[token]/page.tsx:58))
- 🔥 Code Review: Updated File List to include all 19 missing files that were changed but not documented
- 🔥 Code Review: Corrected story status from 'done' to 'review' to match sprint-status.yaml
- 🔥 Code Review: Fixed HTML lang attribute not being dynamic - created LocaleHtmlUpdater component to update document.documentElement.lang when locale changes ([travelblogs/src/components/layout/locale-html-updater.tsx](../../travelblogs/src/components/layout/locale-html-updater.tsx:1))
- 🔥 Code Review: Integrated LocaleHtmlUpdater into root layout for accessibility and SEO compliance ([travelblogs/src/app/layout.tsx](../../travelblogs/src/app/layout.tsx:27))
- ✅ All 367 tests passing after code review fixes
- 🔥 User Report: Fixed untranslated strings in shared entry pages - localized EntryReader component with 17 new translation keys ([travelblogs/src/components/entries/entry-reader.tsx](../../travelblogs/src/components/entries/entry-reader.tsx:1))
- 🔥 User Report: Created SharedEntryError component for localized error messages on shared entry pages ([travelblogs/src/components/entries/shared-entry-error.tsx](../../travelblogs/src/components/entries/shared-entry-error.tsx:1))
- 🔥 User Report: Updated shared entry page to use localized error component ([travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx](../../travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx:1))
- 🔥 User Report: Added EN/DE translations for: backToTrip, dailyEntry, openHeroPhoto, entryHeroMedia, noMediaAvailable, openPhoto, entryPhoto, tripPhoto, noEntryText, previous, next, previousEntry, nextEntry, startOfTrip, endOfTrip, unableLoadEntry ([travelblogs/src/utils/i18n.ts](../../travelblogs/src/utils/i18n.ts:88-113))
- ✅ All 367 tests passing after localizing shared entry pages

### File List

- _bmad-output/epics.md
- _bmad-output/architecture.md
- _bmad-output/project-context.md
- _bmad-output/ux-design-specification.md
- travelblogs/src/utils/i18n.ts
- travelblogs/src/utils/locale-context.tsx
- travelblogs/src/utils/locale-storage.ts
- travelblogs/src/utils/use-translation.ts
- travelblogs/src/components/account/language-selector.tsx
- travelblogs/src/components/account/user-menu.tsx
- travelblogs/src/components/account/change-password-form.tsx
- travelblogs/src/components/account/change-password-header.tsx
- travelblogs/src/components/trips/edit-trip-form.tsx
- travelblogs/src/components/trips/edit-trip-header.tsx
- travelblogs/src/components/trips/new-trip-header.tsx
- travelblogs/src/components/trips/trips-page-content.tsx
- travelblogs/src/components/trips/trips-no-access.tsx
- travelblogs/src/components/trips/trip-card.tsx
- travelblogs/src/components/trips/trip-detail.tsx
- travelblogs/src/components/trips/trip-overview.tsx
- travelblogs/src/components/trips/create-trip-form.tsx
- travelblogs/src/components/trips/shared-trip-guard.tsx
- travelblogs/src/components/trips/shared-trip-error.tsx
- travelblogs/src/components/admin/users-dashboard.tsx
- travelblogs/src/components/admin/users-page-header.tsx
- travelblogs/src/components/admin/user-form.tsx
- travelblogs/src/components/admin/user-list.tsx
- travelblogs/src/components/manual/manual-content.tsx
- travelblogs/src/components/layout/locale-html-updater.tsx
- travelblogs/src/components/entries/entry-reader.tsx
- travelblogs/src/components/entries/shared-entry-error.tsx
- travelblogs/src/app/layout.tsx
- travelblogs/src/app/trips/page.tsx
- travelblogs/src/app/trips/new/page.tsx
- travelblogs/src/app/trips/[tripId]/edit/page.tsx
- travelblogs/src/app/trips/share/[token]/page.tsx
- travelblogs/src/app/trips/share/[token]/not-found.tsx
- travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx
- travelblogs/src/app/trips/share/[token]/entries/[entryId]/not-found.tsx
- travelblogs/src/app/account/password/page.tsx
- travelblogs/src/app/manual/page.tsx
- travelblogs/src/app/admin/users/page.tsx
- travelblogs/vitest.config.ts
- travelblogs/tests/utils/i18n.test.ts
- travelblogs/tests/utils/locale-storage.test.ts
- travelblogs/tests/components/language-selector.test.tsx
- travelblogs/tests/components/user-menu.test.tsx
- travelblogs/tests/components/change-password-form.test.tsx
- travelblogs/tests/components/trips-page.test.tsx
- travelblogs/tests/components/trip-card.test.tsx
- travelblogs/tests/components/trip-detail.test.tsx
- travelblogs/tests/components/trip-overview.test.tsx
- travelblogs/tests/components/trip-share-panel.test.tsx
- travelblogs/tests/components/shared-trip-guard.test.tsx
- travelblogs/tests/components/shared-trip-not-found.test.tsx
- travelblogs/tests/components/shared-trip-page.test.tsx
- travelblogs/tests/components/shared-entry-page.test.tsx
- travelblogs/tests/components/entry-reader.test.tsx
- travelblogs/tests/components/entries/entry-reader-navigation.test.tsx
- travelblogs/tests/components/cover-image-form.test.tsx
- travelblogs/tests/components/admin/users-dashboard.test.tsx
- travelblogs/tests/components/admin/user-form.test.tsx
- travelblogs/tests/components/admin/user-list.test.tsx
