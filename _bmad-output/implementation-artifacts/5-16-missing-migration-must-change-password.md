# Story 5.16: Missing Migration for mustChangePassword

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want role updates to work without database errors,
so that user management remains reliable after schema changes.

## Acceptance Criteria

1. **Given** the database is missing the `mustChangePassword` column
   **When** I update a user role
   **Then** the API succeeds without throwing a Prisma missing-column error
2. **Given** the schema includes `mustChangePassword`
   **When** migrations are applied
   **Then** the database includes the column and role updates work as expected

## Tasks / Subtasks

- [ ] Add and apply Prisma migration (AC: 1, 2)
  - [ ] Verify `User.mustChangePassword` exists in `schema.prisma`
  - [ ] Generate a migration adding `mustChangePassword` to `User`
  - [ ] Apply the migration to the local database
- [ ] Validate user role update flow (AC: 1, 2)
  - [ ] Confirm `PATCH /api/users/[id]` works without P2022 error
- [ ] Add/adjust tests (AC: 1, 2)
  - [ ] Ensure migrations run in test setup and role update tests pass

## Dev Notes

- Error indicates `main.User.mustChangePassword` column missing; migration is required to align DB with schema. [Source: user report]
- Role update API uses `prisma.user.findUnique` and will fail if schema and DB are out of sync. [Source: travelblogs/src/app/api/users/[id]/route.ts]

### Technical Requirements

- Use Prisma Migrate to add `mustChangePassword` to the `User` table.
- Ensure migration is applied in development and test environments.
- Keep existing API responses `{ data, error }` with `{ error: { code, message } }`.

### UX Requirements

- No UI changes required; fix is backend-only.

### Architecture Compliance

- Prisma 7.2.0 + SQLite.
- App Router only.

### Library/Framework Requirements

- Prisma 7.2.0 + SQLite.

### File Structure Requirements

- Prisma schema: `travelblogs/prisma/schema.prisma`.
- Migration: `travelblogs/prisma/migrations/<timestamp>_add_must_change_password/`.
- Tests: `travelblogs/tests/api/users/`.

### Testing Requirements

- Role update API tests should pass after migration is applied.
- Add or update tests to ensure migrations are executed in test setup.

### Previous Story Intelligence

- Story 5.11 introduced `mustChangePassword`; ensure DB schema matches it. [Source: _bmad-output/implementation-artifacts/5-11-change-password.md]

### Git Intelligence Summary

- Recent commits added auth flow changes; keep migrations in sync with schema updates. [Source: git log -5]

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

- Tests live under `travelblogs/tests/` (no co-located tests).

### References

- Epic and acceptance criteria: `_bmad-output/epics.md`
- Architecture and patterns: `_bmad-output/architecture.md`
- Project rules: `_bmad-output/project-context.md`
- User role API: `travelblogs/src/app/api/users/[id]/route.ts`
- Prisma schema: `travelblogs/prisma/schema.prisma`

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Drafted migration-focused fix story for missing mustChangePassword column.
- Added test validation expectations for role updates post-migration.

### File List

- _bmad-output/epics.md
- _bmad-output/architecture.md
- _bmad-output/project-context.md
- travelblogs/prisma/schema.prisma
- travelblogs/src/app/api/users/[id]/route.ts
