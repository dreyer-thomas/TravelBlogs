# Story 4.5: Invalidate Shared Entry Pages on Revoke

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want revoked share links to invalidate all shared pages immediately,
So that old links never grant access after revocation or replacement.

## Acceptance Criteria

1. **Given** I revoke a trip share link
   **When** I open the old share link to the trip overview
   **Then** I see not found or access denied
2. **Given** I revoke a trip share link
   **When** I open a shared entry page using the old token
   **Then** I see not found or access denied
3. **Given** I revoke and then generate a new share link
   **When** I open the old share link or any old shared entry page
   **Then** access is denied and no data is returned
4. **Given** I open a valid share link
   **When** I navigate between overview and entry pages
   **Then** access remains valid for that token only

## Tasks / Subtasks

- [ ] Audit share token validation across overview and entry pages (AC: 1-4)
  - [ ] Verify overview route enforces token validation on every request
  - [ ] Verify shared entry route enforces token validation on every request
- [ ] Ensure revoked tokens are denied everywhere (AC: 1-3)
  - [ ] Confirm server responses return 404/denied for old tokens
  - [ ] Ensure client-side navigation cannot bypass token checks
- [ ] Tests (AC: 1-4)
  - [ ] Add/extend API tests to cover revoked token access for overview and entry endpoints
  - [ ] Add/extend UI or integration tests to confirm old shared entry pages are denied

## Dev Notes

- Relevant architecture patterns and constraints
  - Public share routes are unauthenticated and must not leak trip existence on invalid tokens.
  - API responses must be `{ data, error }` with `{ error: { code, message } }`.
  - Use App Router; public share routes live under `src/app/trips/share/[token]`.
- Source tree components to touch
  - API: `travelblogs/src/app/api/trips/share/[token]/route.ts`
  - API: `travelblogs/src/app/api/trips/share/[token]/entries/[entryId]/route.ts`
  - UI: `travelblogs/src/app/trips/share/[token]/page.tsx`
  - UI: `travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx`
  - Tests: `travelblogs/tests/api/trips/share-trip-overview.test.ts`
  - Tests: `travelblogs/tests/api/trips/share-trip-entry.test.ts`
- Testing standards summary
  - Tests live in `travelblogs/tests` (no colocated tests).
  - Invalid token should return 404/denied without leaking trip existence.

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
  - Public share APIs remain in `src/app/api/trips/share/...`.
  - Tests remain under `tests/api/` and `tests/components/`.
- Detected conflicts or variances (with rationale)
  - None expected; change is enforcement and test coverage.

### References

- Token invalidation bug from Epic 4 retrospective. [Source: _bmad-output/implementation-artifacts/epic-4-retro-20251229T163439Z.md]
- Story definition for Epic 4.5. [Source: _bmad-output/epics.md]
- API response and routing rules. [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

- N/A

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- _bmad-output/implementation-artifacts/4-5-invalidate-shared-entry-pages-on-revoke.md
- travelblogs/src/app/api/trips/share/[token]/route.ts
- travelblogs/src/app/api/trips/share/[token]/entries/[entryId]/route.ts
- travelblogs/src/app/trips/share/[token]/page.tsx
- travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx
- travelblogs/tests/api/trips/share-trip-overview.test.ts
- travelblogs/tests/api/trips/share-trip-entry.test.ts
