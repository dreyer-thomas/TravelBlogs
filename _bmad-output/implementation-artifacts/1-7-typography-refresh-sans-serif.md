# Story 1.7: Typography Refresh (Sans-Serif)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator or viewer,
I want the app typography to use a clean sans-serif style,
so that reading and navigation feel modern and crisp across the whole app.

## Acceptance Criteria

1. **Given** I open any page in the app
   **When** the UI renders
   **Then** headings and body text use the new sans-serif typography system
2. **Given** the UI uses a sans-serif system
   **When** I view long-form entry text
   **Then** text remains readable and consistent with established spacing and sizing
3. **Given** I inspect the UI styles
   **When** I check typography tokens or global styles
   **Then** legacy serif font references are removed or replaced with the new sans-serif font family

## Tasks / Subtasks

- [x] Define the new sans-serif font stack and loading strategy (AC: 1-3)
  - [x] Use `next/font` (Google) for a Segoe UI-like sans-serif (e.g., `Source Sans 3`)
  - [x] Add system fallbacks: `"Segoe UI", "Calibri", "Arial", sans-serif`
  - [x] Remove references to `Fraunces` and `Source Serif 4`
- [x] Update global typography tokens (AC: 1-3)
  - [x] Update `src/app/layout.tsx` to apply the new font class or CSS variable
  - [x] Update `tailwind.config`/`globals.css` to map `font-sans` to the new font
  - [x] Confirm headings and body text both use the sans-serif stack
- [x] Verify visual consistency across key views (AC: 1-2)
  - [x] Trips list, trip detail, entry reader, shared trip pages
  - [x] Ensure line-height and font sizes still meet readability targets
- [x] Update documentation references (AC: 3)
  - [x] Replace serif typography references in `_bmad-output/ux-design-specification.md`

## Dev Notes

- Keep App Router structure; apply typography in `src/app/layout.tsx` and `src/app/globals.css` only. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Use `next/font` for font loading; avoid external CSS imports. [Source: _bmad-output/architecture.md#Frontend Architecture]
- Maintain accessibility: body text remains 17-18px with readable line height. [Source: _bmad-output/ux-design-specification.md#Typography System]
- Avoid regressions in shared trip views and entry reader layout; recent fixes targeted media gallery and clickability. [Source: _bmad-output/implementation-artifacts/4-2-regenerate-shareable-link.md]

### Developer Context: Typography Change Scope

- This is a global typography shift across all screens, not limited to entry pages.
- The intent is a clean, modern sans-serif similar to Segoe UI, with web-safe fallbacks.
- Do not change layout spacing or component structure unless required for readability.

### Epic Context & Dependencies

- Epic 1 focus: trip creation and management; this story introduces a cross-cutting UI polish change.
- No functional dependencies, but ensure existing trip and entry flows remain intact.

### Technical Requirements

- Use a single sans-serif family for headings and body text.
- Apply the font via `next/font` and a global CSS variable or Tailwind `fontFamily` token.
- Remove legacy serif font references from code and UX docs.

### Architecture Compliance

- App Router only; global styles in `src/app/globals.css`. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Use Tailwind CSS for typography tokens. [Source: _bmad-output/architecture.md#Frontend Architecture]

### Library/Framework Requirements

- Next.js App Router + Tailwind CSS. [Source: _bmad-output/architecture.md#Frontend Architecture]
- `next/font` for font loading (no external CSS). [Source: _bmad-output/architecture.md#Frontend Architecture]

### File Structure Requirements

- Global layout: `src/app/layout.tsx`
- Global styles: `src/app/globals.css`
- Tailwind config: `tailwind.config.ts` or `tailwind.config.js`
- UX spec update: `_bmad-output/ux-design-specification.md`

### Testing Requirements

- Tests live in `tests/` only. [Source: _bmad-output/project-context.md#Testing Rules]
- If visual tests rely on font tokens/classes, update snapshots or expectations.

### Project Context Reference

- Follow `_bmad-output/project-context.md` for naming, response formats, and test locations.

### References

- Typography system (serif currently specified). [Source: _bmad-output/ux-design-specification.md#Typography System]
- Frontend architecture and Tailwind usage. [Source: _bmad-output/architecture.md#Frontend Architecture]
- App Router and global style locations. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

- User requested a sans-serif typography change similar to Segoe UI across the whole app.
- Implementation plan: swap `next/font` usage to Source Sans 3, map CSS variables to the new font with system fallbacks, and add a typography test to guard against serif regressions.

### Completion Notes List

- ✅ Updated font loading to Source Sans 3 with system fallbacks; removed serif font references in global styles.
- ✅ Mapped `font-sans` to Source Sans 3 and applied the stack to body and headings.
- ✅ Tests: `npm test`
- ✅ Tests: `npm test -- --run tests/utils/typography.test.ts`
- ✅ Verified key views rely on global typography tokens with no per-view font overrides; sizing/line-height untouched.
- ✅ Updated UX spec typography system to reflect Source Sans 3 and fallbacks.
- ✅ Added typography tests to confirm readable entry text sizing and key views remain free of legacy serif references.
- ✅ Tailwind config not present in repo; `font-sans` mapping stays in `src/app/globals.css` via `@theme inline`.
- ⚠️ Repo contains unrelated uncommitted changes outside this story; File List below reflects typography-specific changes only.

### File List

- travelblogs/src/app/layout.tsx
- travelblogs/src/app/globals.css
- travelblogs/tests/utils/typography.test.ts
- _bmad-output/ux-design-specification.md
- _bmad-output/implementation-artifacts/1-7-typography-refresh-sans-serif.md

## Change Log

- 2025-12-29: Switched global typography to Source Sans 3 with fallbacks, updated UX spec, and added coverage to prevent serif regressions.
- 2025-12-29: Added typography tests for entry readability and key view serif regression guard; documented Tailwind config absence.
