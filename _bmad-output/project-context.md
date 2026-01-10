---
project_name: 'TravelBlogs'
user_name: 'Tommy'
date: '2025-12-21T17:43:06Z'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
existing_patterns_found: 5
status: 'complete'
rule_count: 36
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- Next.js (create-next-app latest) + App Router
- React (via Next.js)
- TypeScript (via Next.js)
- Tailwind CSS (via Next.js setup)
- Prisma 7.2.0 (ORM + migrations)
- SQLite (primary DB)
- Auth.js (NextAuth) 4.24.13 (JWT sessions)
- Redux Toolkit 2.11.2 (state)
- Zod 4.2.1 (validation)

## Critical Implementation Rules

### Language-Specific Rules

- Use `camelCase` for variables/functions; avoid `snake_case`.
- Keep DB table names singular and Prisma model names singular.
- Use async/await for async flows; no raw Promise chains.
- API errors must use `{ error: { code, message } }`.
- Dates in JSON must be ISO 8601 strings.

### Framework-Specific Rules

- App Router only; all API routes live under `src/app/api`.
- REST endpoints are plural (`/trips`, `/entries`), params use `:id`.
- Responses must be wrapped `{ data, error }`.
- Components are `PascalCase`, files are `kebab-case.tsx`.
- Feature components live in `src/components/<feature>/`.
- Redux state slices live in `src/store/<feature>/` with actions `feature/action`.
- Use Next.js Image for media; lazy-load by default.

### Testing Rules

- Tests live in central `tests/` (no co-located tests).
- Organize tests by `tests/api`, `tests/components`, `tests/e2e`, `tests/fixtures`.
- Use the API error format in test expectations.

### Code Quality & Style Rules

- Follow naming conventions: `camelCase` vars, `PascalCase` components, `kebab-case.tsx` files.
- API response shape must be `{ data, error }` with `{ error: { code, message } }`.
- JSON fields are `camelCase`.
- Use `utils/` for shared helpers; avoid adding `lib/`.
- All user-facing UI strings must be translatable and provided in both English and German.

### Development Workflow Rules

- Use `.env` and `.env.example`; no `.env.local`.
- Keep REST routes in `src/app/api` only.
- Docker and TLS proxy are post-MVP; do not add in MVP work.

### Critical Don't-Miss Rules

- Do not use `snake_case` in JSON or API params.
- Do not create singular REST endpoints (no `/trip`).
- Do not bypass `{ data, error }` response wrapper.
- Do not colocate tests with source files.
- Do not introduce Docker/TLS proxy in MVP tasks.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**

- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

Last Updated: 2025-12-21T17:43:06Z
