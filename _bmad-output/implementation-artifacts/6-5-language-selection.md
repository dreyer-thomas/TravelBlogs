# Story 6.5: Language Selection (EN/DE)

Status: ready-for-dev

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

- [ ] Define i18n strategy and locale storage (AC: 1-4)
  - [ ] Store user preference in profile or local storage (pick one and document)
  - [ ] Establish translation keys for shared UI strings
- [ ] Add language selector UI (AC: 1)
  - [ ] Provide a language toggle or selector in a global location
- [ ] Localize UI content (AC: 2)
  - [ ] Ensure all user-facing strings route through the translation layer
- [ ] Localize date/time formatting (AC: 3)
  - [ ] Use locale-aware date/time formatting for EN/DE
- [ ] Persist and restore language preference (AC: 4)
  - [ ] Load stored language on app start and apply before rendering
- [ ] Add/adjust tests (AC: 1-4)
  - [ ] Component tests for language toggle and persisted preference
  - [ ] Utility tests for date/time formatting by locale

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

### File List

- _bmad-output/epics.md
- _bmad-output/architecture.md
- _bmad-output/project-context.md
- _bmad-output/ux-design-specification.md
- travelblogs/src/components/trips/trip-detail.tsx
- travelblogs/src/components/entries/entry-detail.tsx
