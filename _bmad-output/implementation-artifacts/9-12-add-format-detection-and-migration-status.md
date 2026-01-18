# Story 9.12: Add Format Detection and Migration Status

Status: done
Epic: 9 - Rich Text Editor for Blog Entries

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want to track which entries have been migrated to Tiptap JSON,
so that I can monitor migration progress and ensure data integrity.

## Acceptance Criteria

1. **Given** I implement format detection
   **When** I check an entry's text field
   **Then** the system can reliably identify whether it contains plain text or Tiptap JSON
2. **Given** the system detects plain text
   **When** the entry is viewed
   **Then** temporary conversion to Tiptap JSON occurs for display only
3. **Given** the system detects Tiptap JSON
   **When** the entry is viewed or edited
   **Then** the JSON is used directly without re-conversion
4. **Given** migration is ongoing
   **When** I query the database
   **Then** I can identify which entries are still plain text vs. migrated to JSON (optional logging/admin view)

## Tasks / Subtasks

- [x] Add migration status utilities (AC: 1, 4)
  - [x] Reuse `detectEntryFormat` in `travelblogs/src/utils/entry-format.ts` to expose a helper that returns per-entry format status
  - [x] Add a small formatter to summarize counts (plain vs tiptap) for reporting
- [x] Expose migration status for diagnostics (AC: 4)
  - [x] Add an admin-only diagnostics path (preferred: API route) to return counts and entry ids by format
  - [x] Keep response shape `{ data, error }` and enforce auth/role gating
- [x] Ensure view/edit flows keep existing conversion behavior (AC: 2, 3)
  - [x] Confirm `entry-reader.tsx` only converts plain text for display and never persists
  - [x] Confirm `edit-entry-form.tsx` converts plain text on edit and persists JSON on save
- [x] Tests (AC: 1-4)
  - [x] Add/extend tests in `travelblogs/tests/utils/entry-format.test.ts` for detection and summary
  - [x] Add/extend API tests in `travelblogs/tests/api/entries/` for migration status diagnostics
  - [x] Add/extend component tests to assert no re-conversion for tiptap entries

## Dev Notes

### Developer Context

- Format detection already exists in `travelblogs/src/utils/entry-format.ts`; reuse it and do not invent a new parser.
- Plain text conversion for display is handled by `plainTextToTiptapJson` and should remain view-only when reading entries.
- Editing plain text entries should keep the lazy migration behavior from Story 9.10 (convert on edit, persist on save).

### Technical Requirements

- Use `detectEntryFormat` as the single source of truth for format detection.
- Migration status tracking must be derived from the existing `text` field; do not add new schema fields.
- Any diagnostics API must remain read-only and guarded by existing auth/role checks.
- Responses must stay wrapped in `{ data, error }` with `{ error: { code, message } }`.

### Architecture Compliance

- App Router only; REST routes live under `travelblogs/src/app/api`.
- Keep utilities in `travelblogs/src/utils/` (do not add `lib/`).
- Use `camelCase` for JSON fields and avoid `snake_case` anywhere.

### Library / Framework Requirements

- Use existing dependencies only (Tiptap/React/Next.js versions already pinned).
- Do not introduce new persistence layers, migrations, or third-party analytics.

### File Structure Requirements

- Likely touch points:
  - `travelblogs/src/utils/entry-format.ts`
  - `travelblogs/src/components/entries/entry-reader.tsx`
  - `travelblogs/src/components/entries/edit-entry-form.tsx`
  - `travelblogs/src/app/api/entries/` (diagnostics route)
  - Tests in `travelblogs/tests/utils/` and `travelblogs/tests/api/`

### Testing Requirements

- Tests live in central `tests/` (no co-located tests).
- Add unit coverage for format detection and summary output.
- Add API tests for diagnostics response shape and auth gating.

### Previous Story Intelligence

- Story 9.10: Lazy migration converts plain text to JSON on edit only.
- Story 9.11: Uses `detectEntryFormat` to branch logic; keep this consistent.
- Story 9.8: Entry reader renders Tiptap JSON and uses conversion for view-only.

### Git Intelligence Summary

- Recent commits touched `entry-reader.tsx`, `edit-entry-form.tsx`, and `entry-format.ts` for rich text flows.
- Utilities for Tiptap formatting live in `travelblogs/src/utils/entry-format.ts` and `travelblogs/src/utils/tiptap-image-helpers.ts`.

### Latest Tech Information

- No external research required; versions are pinned in architecture and project context.

### Project Context Reference

- All user-facing UI strings must be translatable and provided in both English and German.
- Use Next.js Image for media with lazy loading by default.
- Keep JSON and API params in `camelCase` and avoid `snake_case`.

### References

- [Source: _bmad-output/implementation-artifacts/epics.md#Story 9.12]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: _bmad-output/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: travelblogs/src/utils/entry-format.ts]
- [Source: travelblogs/src/components/entries/entry-reader.tsx]
- [Source: travelblogs/src/components/entries/edit-entry-form.tsx]

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

- Validation report: _bmad-output/implementation-artifacts/validation-report-20260118T112540Z.md

### Completion Notes List
- Added entry format status helpers plus summary aggregation for migration reporting.
- Added admin diagnostics API for entry format counts and entry ids with auth gating.
- Extended entry-format, diagnostics API, and edit flow tests; full `npm test` run passes.
- Bugfix: Fixed entry reader displaying raw JSON instead of rendered rich text after format detection implementation.
- Bugfix: Added format detection to entry-detail component to properly branch between plain text and Tiptap rendering.
- Bugfix: Added immediatelyRender flag to entry-reader-rich-text to prevent hydration issues.

### File List
- _bmad-output/implementation-artifacts/9-12-add-format-detection-and-migration-status.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- travelblogs/src/utils/entry-format.ts
- travelblogs/src/app/api/entries/diagnostics/route.ts
- travelblogs/src/components/entries/entry-detail.tsx
- travelblogs/src/components/entries/entry-reader-rich-text.tsx
- travelblogs/tests/utils/entry-format.test.ts
- travelblogs/tests/api/entries/entry-migration-status.test.ts
- travelblogs/tests/components/edit-entry-form.test.tsx
- travelblogs/tests/components/entry-detail.test.tsx

### Change Log
- 2026-01-18: Added entry format status utilities and admin diagnostics API with supporting tests.
- 2026-01-18: Bugfix - Fixed entry reader to properly detect format and render Tiptap JSON instead of displaying raw JSON text. Updated entry-detail and entry-reader-rich-text components with format detection logic.

## Story Completion Status

Status set to: done
Completion note: Added migration status utilities, diagnostics API, and tests; full test suite passes. Code review completed with security fixes applied (pagination, error handling, documentation).
