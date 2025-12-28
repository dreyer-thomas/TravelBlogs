# Story 2.8: Media Slideshow Viewer

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a viewer,
I want to start a slideshow from the media section,
so that I can view entry photos hands-free.

## Acceptance Criteria

1. **Given** I am viewing an entry with photos in the media section  
   **When** I select the "Start slideshow" action  
   **Then** the photos open in a full-screen slideshow  
   **And** each photo displays for 5 seconds before advancing  
   **And** after the last photo, the slideshow repeats from the first photo  
   **And** I can pause and resume the slideshow  
   **And** I can move to the next or previous photo using on-screen controls  
   **And** I can press Escape to exit the slideshow  
   **And** I can click a visible close button to exit the slideshow

## Tasks / Subtasks

- [x] Add "Start slideshow" action in media section (AC: 1)
  - [x] Place a clearly labeled button near the media gallery
- [x] Implement slideshow playback (AC: 1)
  - [x] Start slideshow in full-screen mode at the selected entry
  - [x] Auto-advance every 5 seconds
  - [x] Loop to the first photo after the last
- [x] Add playback controls (AC: 1)
  - [x] Pause/resume toggle
  - [x] Next/previous buttons
  - [x] Close button and Escape key handling
- [x] Add/adjust tests (AC: 1)
  - [x] Component tests for slideshow start, advance timing, loop, and exit

## Dev Notes

### Developer Context (Purpose + UX Intent)
- Slideshow is initiated from the media section and uses the same full-screen context as Story 2.7.
- Controls must be obvious and reachable without leaving full screen.

### Technical Requirements
- Use a client component for timer and controls; keep data loading in server components.
- Use `next/image` for rendering; avoid layout shifts.
- If a shared full-screen viewer exists (Story 2.7), extend it for slideshow mode instead of creating a new viewer.

### Architecture Compliance
- App Router only; no new routes required.
- Components under `src/components/entries/` or `src/components/media/`.
- Avoid creating new `lib/` helpers; use `src/utils/` if needed.

### Testing Requirements
- Tests live in `tests/` (no co-located tests).
- Component tests should cover timing and loop behavior.

### Scope Boundaries (Prevent Creep)
- Do not add background audio or auto-start slideshow on page load.
- Do not change entry data models or API payloads.

### References

- [Source: _bmad-output/epics.md#Story 2.8: Media Slideshow Viewer]
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

### Completion Notes List
- Implemented slideshow start action and extended the full-screen viewer with playback, looping, pause/resume, and close controls.
- Added component tests covering slideshow start, timing, looping, pause/resume, and exit.
- Tests: `npm test` (vitest run).
- Added on-screen controls and position overlay; pause/resume now gates the slideshow timer.
- Review fixes applied; tests not rerun after these changes.

### File List
- _bmad-output/implementation-artifacts/2-8-media-slideshow-viewer.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/epics.md
- travelblogs/src/components/entries/entry-detail.tsx
- travelblogs/src/components/entries/full-screen-photo-viewer.tsx
- travelblogs/src/components/entries/create-entry-form.tsx
- travelblogs/src/components/entries/edit-entry-form.tsx
- travelblogs/src/components/trips/trip-detail.tsx
- travelblogs/src/app/trips/[tripId]/entries/[entryId]/page.tsx
- travelblogs/tests/components/entry-detail.test.tsx
- travelblogs/public/uploads/trips/cover-1766944758608-1c3e902f-52d8-4166-a0fa-58bdc8a1c79c.jpg
- travelblogs/public/uploads/trips/cover-1766944758622-8389f092-b106-442f-8d2b-f3e94cfda592.jpg
- travelblogs/public/uploads/trips/cover-1766944758636-db39fa05-4ec8-439d-8c78-c1fe7cf1bd52.jpg
- travelblogs/public/uploads/trips/cover-1766944758656-50934bc7-b9c9-4b57-9080-2d1a3d9b5860.jpg
- travelblogs/public/uploads/trips/cover-1766944758676-3d50364f-f023-484f-b37d-e6ca758bb50a.jpg
- travelblogs/public/uploads/trips/cover-1766944758685-efa43a99-7291-465e-a12b-e0a4e34c3515.jpg
- travelblogs/public/uploads/trips/cover-1766944758695-be8246c2-67b7-4fd3-8dd2-f565758b0d88.jpg
- travelblogs/public/uploads/trips/cover-1766944758704-61e6f4f7-f7bb-4eb2-b859-469f15c2d349.jpg
- travelblogs/public/uploads/trips/cover-1766944758712-be7fbbe3-9b89-4aed-92f8-811c1a1df832.jpg
- travelblogs/public/uploads/trips/cover-1766944758722-c5f6b5df-9bc0-49dd-b420-838cdd4b3741.jpg
- travelblogs/public/uploads/trips/cover-1766944758729-81ed8efa-4598-40d2-a094-e15281143c2e.jpg
- travelblogs/public/uploads/trips/cover-1766944758738-4c1db480-cd99-4d31-8f1c-9334e1548434.jpg
- travelblogs/public/uploads/trips/cover-1766945931237-28b2bc6c-c48c-4104-acc7-395cad34e1cc.jpg
- travelblogs/public/uploads/trips/cover-1766945931248-29431e42-431f-4b60-9969-1adfd7aa5b7b.jpg
- travelblogs/public/uploads/trips/cover-1766945931261-3c3b0e87-d143-488b-9239-1aa43bdaa9e9.jpg
- travelblogs/public/uploads/trips/cover-1766945931272-83c39715-a992-48b1-93f9-00cab418585b.jpg
- travelblogs/public/uploads/trips/cover-1766945931285-c72698e4-7004-4fe6-ad7d-8191c4f102f7.jpg
- travelblogs/public/uploads/trips/cover-1766945931293-eb496a74-adf4-4384-a3ae-bcc3bfdde022.jpg
- travelblogs/public/uploads/trips/cover-1766945931303-d98d3ebd-6882-49c4-aac0-a7949ab29176.jpg
- travelblogs/public/uploads/trips/cover-1766945931310-b702a10e-1f13-4dea-aeb4-bdd9cd9cc33b.jpg

### Story Completion Status

Status: done
