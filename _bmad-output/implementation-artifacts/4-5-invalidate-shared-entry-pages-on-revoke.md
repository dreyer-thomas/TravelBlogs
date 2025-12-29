# Story 4.5: Invalidate Shared Entry Pages on Revoke

Status: done

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

- [x] Audit share token validation across overview and entry pages (AC: 1-4)
  - [x] Verify overview route enforces token validation on every request
  - [x] Verify shared entry route enforces token validation on every request
- [x] Ensure revoked tokens are denied everywhere (AC: 1-3)
  - [x] Confirm server responses return 404/denied for old tokens
  - [x] Ensure client-side navigation cannot bypass token checks
- [x] Tests (AC: 1-4)
  - [x] Add/extend API tests to cover revoked token access for overview and entry endpoints
  - [x] Add/extend UI or integration tests to confirm old shared entry pages are denied

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

- Tests: not run (review fixes)

### Implementation Plan

- Extend share public API tests to cover revoked and rotated tokens for overview and entry endpoints.
- Add UI coverage confirming shared pages re-check tokens on mount via SharedTripGuard.

### Completion Notes List

- Blocked shared content rendering until the initial share token validation completes and increased recheck cadence.
- Preferred configured site base URL for server-side share fetches, with host header fallback.
- Added shared entry page test to assert notFound on revoked tokens.
- Ensured Prisma client reuse respects DATABASE_URL changes in tests.
- Documented non-story workspace artifacts in File List.

### File List

- _bmad-output/implementation-artifacts/4-5-invalidate-shared-entry-pages-on-revoke.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- travelblogs/src/app/trips/share/[token]/page.tsx
- travelblogs/src/app/trips/share/[token]/entries/[entryId]/page.tsx
- travelblogs/src/components/trips/shared-trip-guard.tsx
- travelblogs/src/utils/db.ts
- travelblogs/src/utils/request-base-url.ts
- travelblogs/tests/api/trips/share-trip-overview.test.ts
- travelblogs/tests/api/trips/share-trip-entry.test.ts
- travelblogs/tests/components/shared-trip-guard.test.tsx
- travelblogs/tests/components/shared-entry-page.test.tsx
- .codex/history.jsonl
- .codex/log/codex-tui.log
- .codex/sessions/2025/12/29/rollout-2025-12-29T17-59-39-019b6b0d-1888-78e3-a02e-3916c45d13b5.jsonl
- .codex/sessions/2025/12/29/rollout-2025-12-29T18-20-12-019b6b1f-ea24-7233-83aa-245e6b90a555.jsonl
- .codex/sessions/2025/12/29/rollout-2025-12-29T18-33-27-019b6b2c-0ca4-7f72-b3a4-f99586df6ed6.jsonl
- travelblogs/public/uploads/trips/cover-1767029266471-805a4120-0e3e-4b3e-afd6-f9e7289c5517.jpg
- travelblogs/public/uploads/trips/cover-1767029266482-e0ee23bd-e1c7-44f7-ae8e-d32b446a1879.jpg
- travelblogs/public/uploads/trips/cover-1767029266489-3e102175-7c5a-4791-9dbf-070fc82db3fd.jpg
- travelblogs/public/uploads/trips/cover-1767029266498-f262c5b7-f7c5-4756-85ca-3961b8287de5.jpg
- travelblogs/public/uploads/trips/cover-1767029266506-ece4bf81-4cf0-4c50-88b7-348ffaa0c582.jpg
- travelblogs/public/uploads/trips/cover-1767029266516-0a8c8425-1106-4560-92ef-e88fff94c732.jpg
- travelblogs/public/uploads/trips/cover-1767029445802-fd2378e2-448e-490c-ba1e-b16669f46430.jpg
- travelblogs/public/uploads/trips/cover-1767029445815-c24c2a12-4516-4945-a52c-5eb873e8106b.jpg
- travelblogs/public/uploads/trips/cover-1767029445825-8bf97797-3218-4a70-aab7-9c10fd5ca1c3.jpg
- travelblogs/public/uploads/trips/cover-1767029445840-7a44dbe0-b93e-4b35-a501-040e319189de.jpg
- travelblogs/public/uploads/trips/cover-1767029445853-b715cc59-bd46-416e-92dd-f8ea3ff459d7.jpg
- travelblogs/public/uploads/trips/cover-1767029445870-a5296a83-44b6-4acc-906e-8e1a5191d041.jpg
- travelblogs/public/uploads/trips/cover-1767029445878-a180ddb8-1b96-48c9-bff9-3da970d2afd7.jpg
- travelblogs/public/uploads/trips/cover-1767029445884-65781b93-482d-4312-a537-c55d6749f221.jpg
- travelblogs/public/uploads/trips/cover-1767029445893-7e6fa470-f983-4c15-85aa-8e87ebd9f3ee.jpg
- travelblogs/public/uploads/trips/cover-1767029445899-2a412d67-53ef-467c-a018-266205a368d8.jpg
- travelblogs/public/uploads/trips/cover-1767029445908-c908d0e2-d7ee-4282-8708-5caace744ae1.jpg

## Change Log

- 2025-12-29: Added revoked/rotated token coverage for share APIs and SharedTripGuard validation checks.
- 2025-12-29: Tightened shared link validation, hardened base URL resolution, added shared entry denial test, and documented workspace artifacts.
