# Story 3.4: Fullscreen Viewer Minimal Chrome & Segmented Slideshow Progress

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want a distraction-free fullscreen image viewer and a clear slideshow progress indicator,
so that I can focus on the photos without UI clutter.

## Acceptance Criteria

1. Given I open the fullscreen image viewer from any entry photo, when the viewer is displayed, then no on-screen buttons are visible and no image position text (e.g., "2 of 8") is shown.
2. Given the fullscreen viewer is open, when I want to exit, then I can close it without using on-screen buttons (Escape key and tap/click anywhere to exit).
3. Given I start a slideshow, when the slideshow is running, then a horizontal progress bar is shown with one segment per image in the slideshow.
4. Given the slideshow is running, when the active image changes, then the progress bar advances to the next segment in order and loops back after the last image.

## Tasks / Subtasks

- [x] Remove fullscreen viewer chrome (AC: 1, 2)
  - [x] Remove all on-screen buttons (close, next/previous, pause/resume) and the position text overlay
  - [x] Add non-button exit handling (Escape key and tap/click to exit)
- [x] Implement segmented slideshow progress bar (AC: 3, 4)
  - [x] Render a horizontal bar with one segment per image
  - [x] Animate the active segment to fill over the slide interval
  - [x] Keep the progress bar visible during slideshow playback
- [x] Update tests (AC: 1, 2, 3, 4)
  - [x] Component tests for no buttons/position text and click-to-exit
  - [x] Component tests for segmented progress count and active segment advance

## Dev Notes

### Developer Context (Purpose + UX Intent)
- This story reduces viewer chrome to keep photos immersive while still showing slideshow progress.
- The only visible UI in slideshow mode should be the segmented progress bar.

### Epic Context and Dependencies
- Epic 3 goal: fast, media-first entry reading with clear navigation.
- This story refines the fullscreen viewer created in Story 2.7 and the slideshow in Story 2.8.

### Technical Requirements
- Reuse `src/components/entries/full-screen-photo-viewer.tsx`; do not create a new viewer.
- Keep existing open/close plumbing in entry views; only adjust viewer chrome and progress UI.
- Maintain keyboard handling for Escape; ensure tap/click anywhere to exit on touch devices.

### Architecture Compliance
- App Router only; no new routes required.
- Components under `src/components/entries/` or `src/components/media/`.
- Avoid creating new `lib/`; use `src/utils/` if needed.

### Testing Requirements
- Tests live in `tests/` (no co-located tests).
- Cover chrome removal and slideshow progress bar behavior in component tests.

### Scope Boundaries (Prevent Creep)
- Do not change entry data models or API payloads.
- Do not add new slideshow controls beyond the progress bar.

### References

- [Source: _bmad-output/epics.md#Story 3.4: Fullscreen Viewer Minimal Chrome & Segmented Slideshow Progress]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]

### Project Context Reference

- App Router only; API routes in `src/app/api`.
- Use `next/image` with lazy loading for media.
- Components `PascalCase`, files `kebab-case.tsx`.
- Tests in central `tests/` only.

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

### Implementation Plan

- Remove fullscreen viewer buttons/position text and add tap/click to exit
- Add segmented slideshow progress bar with one segment per image
- Update viewer tests for chrome removal and progress bar behavior

### Completion Notes List

- Removed fullscreen viewer chrome and kept click/Escape exit handling.
- Added segmented slideshow progress bar with per-segment state.
- Updated component tests for chrome removal and slideshow progress.
- Prevented swipe navigation from triggering click-to-exit and restored slideshow pause/resume via keyboard.
- Expanded slideshow tests for looping and pause/resume coverage.

### File List

- _bmad-output/implementation-artifacts/3-4-fullscreen-viewer-minimal-chrome-and-segmented-progress.md
- .codex/history.jsonl
- .codex/log/codex-tui.log
- .codex/sessions/2025/12/28/rollout-2025-12-28T22-46-34-019b66ed-6c8b-7160-8d6b-ec733c791d75.jsonl
- .codex/sessions/2025/12/28/rollout-2025-12-28T23-16-28-019b6708-cdf1-7b71-866a-9ddb12859a32.jsonl
- .codex/sessions/2025/12/28/rollout-2025-12-28T23-32-24-019b6717-643b-7d83-8336-606fef79f75c.jsonl
- .codex/sessions/2025/12/28/rollout-2025-12-28T23-38-08-019b671c-a30b-7183-b009-92f3cab26f6b.jsonl
- .codex/sessions/2025/12/28/rollout-2025-12-28T23-51-37-019b6728-fa91-7403-92c7-79372d27656c.jsonl
- .codex/sessions/2025/12/29/
- _bmad-output/epics.md
- _bmad-output/implementation-artifacts/3-2-entry-navigation.md
- _bmad-output/implementation-artifacts/3-3-trip-overview-with-latest-entries.md
- _bmad-output/implementation-artifacts/3-4-fullscreen-viewer-minimal-chrome-and-segmented-progress.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/validation-report-20251228T223642Z.md
- travelblogs/src/app/api/entries/[id]/route.ts
- travelblogs/src/app/api/trips/[id]/overview/
- travelblogs/src/app/trips/[tripId]/overview/
- travelblogs/src/components/entries/entry-reader.tsx
- travelblogs/src/components/entries/full-screen-photo-viewer.tsx
- travelblogs/src/components/trips/trip-overview.tsx
- travelblogs/src/utils/entry-reader.ts
- travelblogs/tests/api/entries/get-entry.test.ts
- travelblogs/tests/api/trips/trip-overview.test.ts
- travelblogs/tests/components/entries/
- travelblogs/tests/components/entry-detail.test.tsx
- travelblogs/tests/components/full-screen-photo-viewer.test.tsx
- travelblogs/tests/components/trip-overview.test.tsx
- travelblogs/tests/utils/entry-reader-mapper.test.ts

### Change Log

- 2025-12-28: Removed fullscreen viewer chrome, added segmented slideshow progress, updated tests.
- 2025-12-29: Prevented swipe-close regression, restored slideshow pause/resume via keyboard, expanded tests.
### Story Completion Status

Status: done
