# Story 0.2: Enable HTTPS

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a site owner,
I want the TravelBlogs web app to run over HTTPS,
so that all traffic is encrypted and browsers trust the connection.

## Acceptance Criteria

1. **Given** valid TLS certificate and key files are configured via `.env`
   **When** the production server starts via the HTTPS entrypoint
   **Then** the app serves HTTPS with a valid certificate and no browser security warning
2. **Given** TLS files are missing or invalid
   **When** the HTTPS server starts
   **Then** startup fails with a clear error explaining how to configure HTTPS
3. **Given** the HTTPS server is running
   **When** a user accesses any app route
   **Then** the response is delivered over HTTPS only (no plaintext HTTP endpoints exposed)
4. **Given** TLS certificates can be issued by a free provider
   **When** I follow the documented steps
   **Then** I can obtain and install certs without paid services
5. **Given** the app already runs in development with standard Next.js scripts
   **When** HTTPS support is added
   **Then** dev commands continue to work unchanged and production uses the HTTPS entrypoint only

## Tasks / Subtasks

- [x] Add HTTPS server support for production (AC: 1, 2, 3)
  - [x] Create a minimal custom server entrypoint at `travelblogs/server.ts` that wraps Next.js with Node `https`
  - [x] Read TLS file paths from `.env` (mirror keys in `.env.example`; do not use `.env.local`)
  - [x] Define env keys: `TLS_CERT_PATH`, `TLS_KEY_PATH`, and optional `TLS_CA_PATH` for full chain
  - [x] Update `travelblogs/package.json` scripts with a production HTTPS entrypoint (example: `"start:https": "NODE_ENV=production ts-node server.ts"` or compiled JS equivalent)
  - [x] Fail fast with a clear error if cert/key files are missing or invalid
  - [x] Ensure only HTTPS listener is enabled in production (no parallel HTTP listener)
  - [x] Keep existing dev scripts (`dev`, `build`, `start`) intact; add HTTPS entrypoint without breaking dev flow
- [x] Document free certificate issuance (AC: 4)
  - [x] Add a short README section with a recommended free provider (e.g., Lets Encrypt)
  - [x] Document renewal expectation and file placement paths for NAS hosting
- [x] Add basic verification coverage (AC: 1, 2)
  - [x] Add a lightweight test or script under `tests/` to confirm HTTPS config validation and failure messaging
  - [x] Ensure any test expectations follow `{ data, error }` API response format when applicable

## Dev Notes

- Requirement source: NFR5 requires HTTPS for all traffic.
- Hosting is a bare Node process on NAS; **do not introduce a TLS reverse proxy or Docker** for MVP.
- Use a custom Node HTTPS server to wrap the Next.js request handler for production.
- `.env` and `.env.example` are required; do not use `.env.local`.
- Keep routes and files aligned with App Router structure under `src/app`.
- Maintain existing API response wrapper `{ data, error }` and error shape `{ error: { code, message } }` for any API responses touched.
- Regression guardrail: do not break existing dev workflow; keep `npm run dev` behavior unchanged.
- Avoid reinventing server bootstrap patterns; keep the HTTPS wrapper minimal and focused on TLS config and Next.js handler.

### Project Structure Notes

- Add a root-level `server.ts` entrypoint for HTTPS
- Keep Next.js app code in `src/` and do not move existing routes
- Tests stay centralized under `tests/`

### Previous Story Intelligence

- Story 0.1 established `.env` usage and enforced `.env.example` mirroring; keep the same env file pattern for TLS paths.
- Auth and middleware already rely on App Router routes; do not move or rewrite those paths when introducing a server entrypoint.

### Scope Boundaries

- In scope: HTTPS server configuration, cert/key loading via env, documentation for free cert provider.
- Out of scope: TLS reverse proxy (Caddy/Nginx), Docker, automated cert renewal services.

### References

- HTTPS requirement: `_bmad-output/prd.md` (Non-Functional Requirements: Security)
- Hosting and TLS constraints: `_bmad-output/architecture.md` (Infrastructure & Deployment)
- MVP no-TLS-proxy rule: `_bmad-output/project-context.md`
- Existing env pattern and auth setup: `_bmad-output/implementation-artifacts/0-1-creator-sign-in-single-account.md`

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex CLI)

### Debug Log References

N/A

### Implementation Plan

- Add a minimal HTTPS server entrypoint that validates TLS env paths, then document certificate setup and verify with unit tests.

### Completion Notes List

- Story created from epics, PRD, architecture, UX, and project-context inputs.
- Web research skipped due to restricted network access.
- Added HTTPS server entrypoint with TLS config validation and HTTPS-only listener.
- Mirrored TLS env keys in `.env` and `.env.example`, plus start:https script.
- Documented Lets Encrypt issuance and NAS file placement in README.
- Added unit coverage for TLS config validation failures and success.
- Tests: `npm test`.

### File List

- `_bmad-output/implementation-artifacts/0-2-enable-https.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `travelblogs/.env`
- `travelblogs/.env.example`
- `travelblogs/README.md`
- `travelblogs/package.json`
- `travelblogs/server.js`
- `travelblogs/server.ts`
- `travelblogs/tests/utils/https-config.test.ts`
