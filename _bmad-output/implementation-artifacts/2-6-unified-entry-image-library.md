# Story 2.6: Unified Entry Image Library

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want all entry images managed in one place,
so that I can select the story image, insert inline photos, or remove images without re-uploading.

## Acceptance Criteria

1. **Given** I am creating or editing an entry  
   **When** I upload images  
   **Then** they appear in a single entry image library as the first step in the media flow
2. **Given** I hover over an image in the library  
   **When** I choose "Set as story image"  
   **Then** that image becomes the story image selection
3. **Given** I hover over an image in the library  
   **When** I choose "Insert inline"  
   **Then** an image link in the format `![Entry photo](<url>)` is inserted at the current cursor position in the entry text  
   **And** if the image already has a custom alt in the entry text, it is preserved
4. **Given** I hover over an image in the library  
   **When** I choose "Remove"  
   **Then** the image is removed from the entry media and no longer selectable for story or inline use  
   **And** any inline references matching `![...](<url>)` are removed from the entry text

## Tasks / Subtasks

- [x] Consolidate entry image upload into a single library UI (AC: 1)
  - [x] Replace separate "Story image", "Inline photos", and "Media files" upload inputs with one upload input
  - [x] Display all uploaded images in a unified gallery/grid with hover actions
- [x] Add story image selection from library (AC: 2)
  - [x] Store the selected story image URL and show the current selection state in the library
  - [x] Ensure the selected image is saved with the entry as the story image
- [x] Add inline insert action at cursor (AC: 3)
  - [x] Track current cursor position in the entry text field
  - [x] Insert the selected image URL into the text at the cursor using the existing inline image format
  - [x] Preserve existing custom alt text when reinserting or updating inline images
- [x] Add remove action and cleanup behavior (AC: 4)
  - [x] Remove the image from the entry media list and library view
  - [x] If the image is the current story image, clear the selection
  - [x] If the image appears inline in the text, remove the inline reference
- [x] Update validations and UX copy (AC: 1-4)
  - [x] Ensure at least one image exists between the library and inline text if required
  - [x] Replace helper text to reflect the unified image library flow
- [x] Add/adjust tests (AC: 1-4)
  - [x] Component tests for library actions (set story image, insert inline, remove)
  - [x] Utility tests for inline insertion and removal behavior

## Dev Notes

- Use the existing entry media upload and inline image utilities; unify the UI without changing the media upload API contract. [Source: _bmad-output/architecture.md#API & Communication Patterns]
- Inline insert should use `![Entry photo](<url>)` by default; if an image already has a custom alt in the text, preserve it. [Source: travelblogs/src/utils/entry-content.ts]
- Maintain `{ data, error }` response wrapper for API interactions. [Source: _bmad-output/architecture.md#API & Communication Patterns]
- Entry forms live in `src/components/entries/` and should remain the single source of truth for entry media selection. [Source: _bmad-output/architecture.md#Project Structure & Boundaries]
- Tests live under `tests/` only (no co-located tests). [Source: _bmad-output/project-context.md#Testing Rules]

### Project Structure Notes

- Update `src/components/entries/create-entry-form.tsx` and `src/components/entries/edit-entry-form.tsx` for the unified library UI.
- Inline image extraction and insertion helpers live in `src/utils/entry-content.ts`.
- Media upload helpers live in `src/utils/entry-media.ts`.

### References

- _bmad-output/epics.md#Story 2.6
- _bmad-output/architecture.md#Project Structure & Boundaries
- _bmad-output/architecture.md#API & Communication Patterns
- _bmad-output/project-context.md#Critical Implementation Rules

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

### Completion Notes List

- Unified entry media upload into a single library input and gallery; added title-required blur validation; updated component tests. Tests: `npm test`.
- Added story-image selection controls directly in the library with selected state and tests. Tests: `npm test`.
- Inserted inline images from the library using cursor tracking and alt preservation utilities, plus tests. Tests: `npm test`.
- Added remove actions to clean up library, story image selection, and inline references with supporting tests. Tests: `npm test`.
- Updated validation and helper copy to reference the unified library flow. Tests: `npm test`.
- Added component and utility test coverage for unified library actions. Tests: `npm test`.
- Review fixes: merge inline image URLs into the submitted media list, insert inline links without forced line breaks, and extend removal tests to cover clearing story image selection. Tests: not run (review fixes).

### File List

- .codex/auth.json
- .codex/history.jsonl
- .codex/log/codex-tui.log
- .codex/sessions/2025/12/28/rollout-2025-12-28T17-41-00-019b65d5-aa75-7b82-bed3-28afcaac27eb.jsonl
- .codex/sessions/2025/12/28/rollout-2025-12-28T17-55-20-019b65e2-ca4f-79f1-b353-11e19226a124.jsonl
- .codex/sessions/2025/12/28/rollout-2025-12-28T18-03-09-019b65e9-f32e-75f3-8e31-d5b626d86f84.jsonl
- .codex/sessions/2025/12/28/rollout-2025-12-28T18-36-29-019b6608-7693-7ce0-90f9-0d936808d18a.jsonl
- _bmad-output/implementation-artifacts/2-6-unified-entry-image-library.md
- _bmad-output/implementation-artifacts/2-7-full-screen-photo-viewer.md
- _bmad-output/implementation-artifacts/2-8-media-slideshow-viewer.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/epics.md
- travelblogs/src/components/entries/create-entry-form.tsx
- travelblogs/src/components/entries/edit-entry-form.tsx
- travelblogs/src/utils/entry-content.ts
- travelblogs/tests/components/create-entry-form.test.tsx
- travelblogs/tests/components/edit-entry-form.test.tsx
- travelblogs/tests/components/entry-content-utils.test.ts

### Change Log

- 2025-12-28: Implemented unified entry image library actions, validations, and supporting tests.
- 2025-12-28: Applied review fixes for inline insertion, media payload sync, and removal coverage.
