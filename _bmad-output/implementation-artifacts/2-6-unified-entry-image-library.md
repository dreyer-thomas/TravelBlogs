# Story 2.6: Unified Entry Image Library

Status: ready-for-dev

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

- [ ] Consolidate entry image upload into a single library UI (AC: 1)
  - [ ] Replace separate "Story image", "Inline photos", and "Media files" upload inputs with one upload input
  - [ ] Display all uploaded images in a unified gallery/grid with hover actions
- [ ] Add story image selection from library (AC: 2)
  - [ ] Store the selected story image URL and show the current selection state in the library
  - [ ] Ensure the selected image is saved with the entry as the story image
- [ ] Add inline insert action at cursor (AC: 3)
  - [ ] Track current cursor position in the entry text field
  - [ ] Insert the selected image URL into the text at the cursor using the existing inline image format
  - [ ] Preserve existing custom alt text when reinserting or updating inline images
- [ ] Add remove action and cleanup behavior (AC: 4)
  - [ ] Remove the image from the entry media list and library view
  - [ ] If the image is the current story image, clear the selection
  - [ ] If the image appears inline in the text, remove the inline reference
- [ ] Update validations and UX copy (AC: 1-4)
  - [ ] Ensure at least one image exists between the library and inline text if required
  - [ ] Replace helper text to reflect the unified image library flow
- [ ] Add/adjust tests (AC: 1-4)
  - [ ] Component tests for library actions (set story image, insert inline, remove)
  - [ ] Utility tests for inline insertion and removal behavior

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

### File List
