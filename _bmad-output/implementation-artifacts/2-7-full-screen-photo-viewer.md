# Story 2.7: Full-Screen Photo Viewer

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want to open any entry photo in full screen,
so that I can see the image in detail without leaving the entry.

## Acceptance Criteria

1. **Given** I am viewing an entry with inline photos in the text  
   **When** I click an inline photo  
   **Then** the photo opens in a full-screen viewer  
   **And** I can exit the viewer to return to the entry view  
   **And** the viewer shows an overlay with a close/back control and image position (e.g., "2 of 8")  
   **And** I can use the left and right arrow keys to move between photos  
   **And** I can press Escape to close the viewer
2. **Given** I am viewing an entry with photos in the media section  
   **When** I click a photo in the media section  
   **Then** the photo opens in a full-screen viewer  
   **And** I can exit the viewer to return to the entry view  
   **And** on touch devices I can swipe left or right to move between photos  
   **And** I can pinch to zoom the photo

## Tasks / Subtasks

- [x] Add full-screen photo viewer UI (AC: 1, 2)
  - [x] Implement a modal/overlay viewer with a close/back control and position indicator
  - [x] Render the selected photo at full-screen with `next/image`
- [x] Wire up entry photos to open the viewer (AC: 1, 2)
  - [x] Inline photos in the entry body open the viewer at the correct index
  - [x] Media section photos open the viewer at the correct index
- [x] Add input controls (AC: 1, 2)
  - [x] Keyboard: left/right arrows for navigation, Escape to close
  - [x] Touch: swipe to advance, pinch to zoom
- [x] Accessibility pass (AC: 1, 2)
  - [x] Provide visible focus and keyboard navigation within the viewer
  - [x] Ensure close control is reachable and labeled
- [x] Add/adjust tests (AC: 1, 2)
  - [x] Component tests for opening, closing, and navigation behavior

## Dev Notes

### Developer Context (Purpose + UX Intent)
- The viewer should feel immersive and fast, keeping users in the entry view while enlarging photos.
- Maintain a clear escape path: visible close control plus Escape key.

### Technical Requirements
- Use a client component only for viewer state and interactions; keep entry data loading in server components.
- Use `next/image` with lazy loading; avoid layout shifts.
- Reuse existing media and entry body rendering components where possible.

### Architecture Compliance
- App Router only; no new routes required for the viewer.
- Keep components under `src/components/entries/` or `src/components/media/`.
- Avoid creating new `lib/` helpers; use `src/utils/` if needed.

### Testing Requirements
- Tests live in `tests/` (no co-located tests).
- Component tests should assert keyboard and close behavior.

### Scope Boundaries (Prevent Creep)
- Do not add slideshow or autoplay behavior here (Story 2.8).
- Do not change entry data models or API payloads.

### References

- [Source: _bmad-output/epics.md#Story 2.7: Full-Screen Photo Viewer]
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

- Not run (not requested)

### Completion Notes List

- Moved entry data loading into the server entry page and passed data into the viewer component.
- Added focus trapping for keyboard navigation inside the full-screen viewer.
- Ensured full-screen viewer images lazy-load by removing priority usage.
- Updated entry detail component tests to use server-provided entry data.
- Restored entry media input labels to keep create/edit entry tests passing.
- Centered the full-screen image container and made the close button persistent in the top-right.

### File List

- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/app/trips/[tripId]/entries/[entryId]/page.tsx
- src/components/entries/create-entry-form.tsx
- src/components/entries/edit-entry-form.tsx
- src/components/entries/entry-detail.tsx
- src/components/entries/full-screen-photo-viewer.tsx
- tests/components/entry-detail.test.tsx

### Change Log

- 2025-12-28: Moved entry loading to server page, added focus trap, and updated tests to use server-provided entry data.
- 2025-12-28: Added full-screen photo viewer, navigation controls, and component tests; restored entry media input labels.
- 2025-12-28: Centered viewer layout and ensured close button is always visible.

### Story Completion Status

Status: done
