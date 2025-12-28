# Story 1.1: Initialize Project from Starter Template

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want to initialize the project using the approved Next.js starter,
so that the codebase matches the architecture decisions.

## Acceptance Criteria

1. **Given** a new workspace
   **When** I run `npx create-next-app@latest travelblogs` and select TypeScript, App Router, Tailwind CSS, ESLint, and `src/` directory
   **Then** a new Next.js project is created with those options configured
2. **Given** the new project is created
   **When** I start the dev server
   **Then** the application runs successfully and renders the default Next.js page

## Tasks / Subtasks

- [x] Initialize Next.js app from starter (AC: 1)
  - [x] Run `npx create-next-app@latest travelblogs` from repo root
  - [x] Select: TypeScript, App Router, Tailwind CSS, ESLint, and `src/` directory
  - [x] Ensure generated app lives at `travelblogs/` and does not overwrite `_bmad/` or `_bmad-output/`
- [x] Verify dev server runs (AC: 2)
  - [x] Start the dev server in the new app directory
  - [x] Confirm the default Next.js page renders in the browser

## Dev Notes

### Developer Context

- Primary objective is project initialization; avoid adding extra dependencies or features.
- Use App Router only; project should include `src/app/` and Tailwind setup from the starter.
- Keep `.env` and `.env.example` in the app root; do not introduce `.env.local`.
- Tests live under central `tests/` when added in later stories; no tests required for initial scaffold unless required by story.

### Technical Requirements

- Run the exact starter command from architecture: `npx create-next-app@latest travelblogs`.
- Select: TypeScript, App Router, Tailwind CSS, ESLint, and `src/` directory.
- Ensure the generated app does not overwrite `_bmad/` or `_bmad-output/`.

### Architecture Compliance

- App Router only; API routes will live under `src/app/api` in later stories.
- REST endpoints must be plural and use `{ data, error }` response wrapper when added later.
- Naming and structure rules (camelCase vars, PascalCase components, kebab-case.tsx) apply when code is introduced.

### Library/Framework Requirements

- Next.js + TypeScript via create-next-app; do not introduce alternate starters.
- Auth.js (NextAuth) 4.24.13 and Prisma 7.2.0 are required later; do not add them in this story.
- Tailwind CSS must be included from starter selection.

### File Structure Requirements

- Keep app under `travelblogs/` with `src/` directory.
- Do not modify `_bmad/` or `_bmad-output/` contents as part of initialization.

### Testing Requirements

- No new tests required for scaffold-only story; later stories will add tests in `tests/`.

### Project Structure Notes

- Expected base structure (post-init) aligns with architecture: `src/app`, `src/components`, `src/store`, `src/utils`, `tests/`, `prisma/`.
- Keep REST routes under `src/app/api/` only when later stories add APIs.

### References

- Story source: `_bmad-output/epics.md` (Epic 1, Story 1.1)
- Starter template decision: `_bmad-output/architecture.md` (Starter Template Evaluation; Implementation Handoff)
- Global standards: `_bmad-output/project-context.md`

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

N/A

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- Web research skipped due to restricted network access.
- Initialized Next.js app via create-next-app with TypeScript, App Router, Tailwind, ESLint, and src/ directory.
- Installed dependencies and verified dev server responded with HTTP 200 on localhost.
- Added @babel/core as a dev dependency to satisfy eslint-config-next runtime requirement.
- Added `.env` and `.env.example` and adjusted `.gitignore` to allow committing `.env.example`.
- Expanded File List to include explicit scaffolded files for auditability.
- Replaced default Next.js fonts/metadata with Fraunces + Source Serif 4 and TravelBlogs metadata.

### File List

- `_bmad-output/implementation-artifacts/1-1-initialize-project-from-starter-template.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `travelblogs/.gitignore`
- `travelblogs/.env`
- `travelblogs/.env.example`
- `travelblogs/README.md`
- `travelblogs/eslint.config.mjs`
- `travelblogs/next-env.d.ts`
- `travelblogs/next.config.ts`
- `travelblogs/package.json`
- `travelblogs/package-lock.json`
- `travelblogs/postcss.config.mjs`
- `travelblogs/tsconfig.json`
- `travelblogs/public/file.svg`
- `travelblogs/public/globe.svg`
- `travelblogs/public/next.svg`
- `travelblogs/public/vercel.svg`
- `travelblogs/public/window.svg`
- `travelblogs/src/app/favicon.ico`
- `travelblogs/src/app/globals.css`
- `travelblogs/src/app/layout.tsx`
- `travelblogs/src/app/page.tsx`
