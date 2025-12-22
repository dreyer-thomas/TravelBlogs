---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/prd.md
  - _bmad-output/ux-design-specification.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2025-12-21T17:38:47Z'
project_name: 'TravelBlogs'
user_name: 'Tommy'
date: '2025-12-21T17:16:45Z'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The MVP focuses on trip and entry creation, media-first entry display, and shareable viewing via unguessable links. Post-MVP adds user management with roles (admin/creator/viewer), trip-level contributor permissions, and richer sharing controls. Expansion includes map + timeline visualization and optional location extraction from media.

**Non-Functional Requirements:**
Performance targets (page load 5-10s, entry switch <1s, trip switch 2-5s) and media upload support (10-15 files per entry). Security via HTTPS and secure password hashing (Phase 2). Shareable links must be unguessable. Responsiveness across mobile/desktop, current browsers, and WCAG AA accessibility.

**Scale & Complexity:**
Low complexity, small-group usage (up to ~15 viewers per trip, low concurrency), but media storage/delivery and privacy constraints require careful design.

- Primary domain: web app (SPA)
- Complexity level: low
- Estimated architectural components: 5-7 (web client, API, auth, media storage/CDN, database, sharing/permissions, optional map services)

### Technical Constraints & Dependencies

- Web-first SPA; no SEO, no realtime, no offline.
- Must support modern browsers across desktop and mobile.
- UX emphasizes media-first layouts and fast navigation.
- Future map/timeline features imply optional mapping/geocoding dependencies.

### Cross-Cutting Concerns Identified

- Access control and sharing permissions (public link vs authenticated roles).
- Media storage, upload throughput, and performant delivery.
- Client performance for media-heavy pages and quick entry switching.
- Responsive design and WCAG AA accessibility compliance.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application (Next.js + TypeScript) based on project requirements and preferences.

### Starter Options Considered

1) **create-next-app (official Next.js CLI)**
- Lean baseline; lets us opt into TypeScript, App Router, Tailwind, ESLint, and `src/` layout.
- Keeps architecture simple for a low-complexity MVP and self-hosting on a NAS.
- Database and auth can be added explicitly (Prisma + SQLite/Postgres; Auth.js or custom).

2) **Create T3 App (create t3-app)**
- Strong full-stack defaults (Next.js, TypeScript, ORM, auth, optional tRPC).
- Great DX, but adds extra layers and conventions that may be overkill for MVP.

### Selected Starter: create-next-app

**Rationale for Selection:**
The MVP is low-complexity and self-hosted. The official Next.js starter provides the cleanest foundation while letting us add only the pieces we need (Prisma + SQLite/Postgres, Auth) without adopting heavier conventions.

**Initialization Command:**

```bash
npx create-next-app@latest travelblogs
```

Choose during prompts: TypeScript, App Router, Tailwind CSS, ESLint, and `src/` directory.

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript + React with Next.js.

**Styling Solution:**
Tailwind CSS (via CLI prompt).

**Build Tooling:**
Next.js dev server with fast refresh; Turbopack enabled by default.

**Testing Framework:**
Not included by default (will add if needed).

**Code Organization:**
App Router structure (`app/`), optional `src/` directory.

**Development Experience:**
Built-in dev server, linting (ESLint), and standard Next.js conventions.

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Database: SQLite
- ORM: Prisma (7.2.0) + Prisma Migrate
- Authentication: Auth.js (NextAuth) 4.24.13 with JWT sessions
- API style: REST via Next.js route handlers
- Hosting: bare Node process on NAS

**Important Decisions (Shape Architecture):**
- Validation: Zod 4.2.1
- Authorization: role checks + per-trip ACL
- Error format: `{ error: { code, message } }`
- State management: Redux (Redux Toolkit 2.11.2)
- Data fetching: server components + `fetch`
- Media optimization: Next.js Image + lazy loading
- Env configuration: `.env` files
- Logging: basic file logs

**Deferred Decisions (Post-MVP):**
- Docker deployment
- Reverse proxy/TLS (Caddy/Nginx)
- Rate limiting
- PostgreSQL migration (if scale requires)
- Map/timeline provider selection and licensing (required before Phase 3)

### Data Architecture

- **Database:** SQLite (MVP)
- **ORM:** Prisma 7.2.0
- **Migrations:** Prisma Migrate
- **Validation:** Zod 4.2.1
- **Rationale:** SQLite keeps MVP simple for NAS hosting; Prisma provides schema + migrations; Zod standardizes request and data validation.

### Authentication & Security

- **Auth:** Auth.js (NextAuth) 4.24.13
- **Sessions:** JWT
- **Authorization:** role-based checks + per-trip ACL
- **MVP Auth Scope:** Lightweight creator sign-in (single account) to protect trip/entry management; shareable links remain public.
- **Rationale:** Free, self-hosted auth with minimal custom work; JWT reduces DB session overhead for MVP.

### API & Communication Patterns

- **API style:** REST via Next.js route handlers
- **Error format:** `{ error: { code, message } }`
- **Rate limiting:** None (MVP)
- **Rationale:** Simple, direct fit for low-complexity MVP and App Router.

### Frontend Architecture

- **State management:** Redux via Redux Toolkit 2.11.2
- **Data fetching:** Server components + `fetch`
- **Media optimization:** Next.js Image + lazy loading
- **Component library:** Tailwind UI (themeable baseline aligned with Tailwind CSS)
- **Typography:** Fraunces (headings) + Source Serif 4 (body) delivered via `next/font`
- **Rationale:** Centralized state for UI/entry flows; server-driven data for performance; optimized media is core to UX.

### Infrastructure & Deployment

- **Hosting:** Bare Node process on NAS
- **Reverse proxy/TLS:** None (MVP)
- **Env config:** `.env` files
- **Monitoring/logging:** Basic file logs
- **Rationale:** Lowest friction for MVP; can add Docker + TLS later.

### Decision Impact Analysis

**Implementation Sequence:**
1. Initialize Next.js app (starter)
2. Add Prisma + SQLite schema + migrations
3. Implement lightweight Auth.js + JWT sessions for creator sign-in
4. Build REST route handlers + error format
5. Add Redux store and UI data flows
6. Implement media upload + Next.js Image rendering
7. Configure `.env` and basic logging

**Cross-Component Dependencies:**
- Auth + ACL affects API handlers and UI gating.
- Prisma schema drives API, validation, and UI data models.
- Media optimization affects storage strategy and frontend rendering.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
5 areas where AI agents could make different choices (naming, structure, formats, state conventions, error/loading patterns)

### Naming Patterns

**Database Naming Conventions:**
- Tables: singular (`user`, `trip`, `entry`)
- Columns: `camelCase` (`userId`, `tripId`)

**API Naming Conventions:**
- REST endpoints: plural (`/trips`, `/entries`)
- Route params: `:id`
- Query params: `camelCase`

**Code Naming Conventions:**
- Components: `PascalCase` (`TripCard`)
- Files: `kebab-case.tsx` (`trip-card.tsx`)
- Functions/variables: `camelCase`

### Structure Patterns

**Project Organization:**
- Tests live in a central `tests/` folder
- Components organized by feature (`components/trips/...`)
- Shared utilities in `utils/`

**File Structure Patterns:**
- API routes only in `app/api/...` (no separate `src/server` layer)

### Format Patterns

**API Response Formats:**
- Wrap responses in `{ data, error }`
- Errors: `{ error: { code, message } }`

**Data Exchange Formats:**
- Dates: ISO 8601 strings
- JSON fields: `camelCase`

### Communication Patterns

**State Management Patterns (Redux):**
- Action naming: `feature/action`
- State shape: `state.{feature}`
- Async: Redux Toolkit patterns (no RTK Query)

### Process Patterns

**Error Handling Patterns:**
- Global error boundary + per-request error UI

**Loading State Patterns:**
- Use `status: 'idle' | 'loading' | 'succeeded' | 'failed'`

**Validation Patterns:**
- Server-side only

### Enforcement Guidelines

**All AI Agents MUST:**
- Follow singular table naming + camelCase columns
- Return `{ data, error }` with `{ error: { code, message } }`
- Use feature-based component folders and central `tests/`

**Pattern Enforcement:**
- New code should be reviewed for naming/format consistency before merge
- Violations should be noted in PR review and fixed before merge

### Pattern Examples

**Good Examples:**
- Table: `trip`, column: `tripId`
- Endpoint: `GET /trips/:id`
- Response: `{ data: { ... }, error: null }`

**Anti-Patterns:**
- Table `Trips` or column `trip_id`
- Endpoint `/trip/{id}`
- Response without wrapper or inconsistent error shape

## Project Structure & Boundaries

### Complete Project Directory Structure
```
travelblogs/
├── README.md
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── .env
├── .env.example
├── .gitignore
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
│   └── assets/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── trips/
│   │   │   └── page.tsx
│   │   ├── entries/
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts
│   │       ├── trips/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       └── route.ts
│   │       ├── entries/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       └── route.ts
│   │       └── media/
│   │           └── upload/
│   │               └── route.ts
│   ├── components/
│   │   ├── trips/
│   │   │   ├── trip-card.tsx
│   │   │   └── trip-hero.tsx
│   │   ├── entries/
│   │   │   ├── entry-reader.tsx
│   │   │   └── entry-timeline.tsx
│   │   ├── media/
│   │   │   ├── media-gallery.tsx
│   │   │   └── media-uploader.tsx
│   │   ├── auth/
│   │   │   └── auth-guard.tsx
│   │   └── ui/
│   │       ├── button.tsx
│   │       └── modal.tsx
│   ├── store/
│   │   ├── index.ts
│   │   ├── trips/
│   │   │   └── trips-slice.ts
│   │   ├── entries/
│   │   │   └── entries-slice.ts
│   │   └── media/
│   │       └── media-slice.ts
│   ├── types/
│   │   ├── api.ts
│   │   └── domain.ts
│   ├── utils/
│   │   ├── api.ts
│   │   ├── date.ts
│   │   └── format.ts
│   └── middleware.ts
└── tests/
    ├── api/
    ├── components/
    ├── e2e/
    └── fixtures/
```

### Architectural Boundaries

**API Boundaries:**
- All external APIs live under `src/app/api/*`
- Auth endpoints in `src/app/api/auth/[...nextauth]/route.ts`

**Component Boundaries:**
- UI components grouped by feature under `src/components/<feature>/`
- Shared UI atoms in `src/components/ui/`

**Service Boundaries:**
- Data access through Prisma in `prisma/` and helpers in `src/utils/`

**Data Boundaries:**
- Database schema and migrations in `prisma/`
- Domain types in `src/types/domain.ts`

### Requirements to Structure Mapping

**Feature Mapping:**
- Trips: `src/app/trips/`, `src/components/trips/`, `src/app/api/trips/`, `tests/api/`, `tests/components/`
- Entries: `src/app/entries/`, `src/components/entries/`, `src/app/api/entries/`, `tests/api/`, `tests/components/`
- Media: `src/components/media/`, `src/app/api/media/`, `tests/api/`
- Sharing: `src/app/api/trips/` + `src/components/trips/` for share views

**Cross-Cutting Concerns:**
- Auth: `src/app/api/auth/`, `src/components/auth/`, `src/middleware.ts`, `tests/api/`
- Validation: `src/utils/` + `src/types/`
- Redux state: `src/store/`

### Integration Points

**Internal Communication:**
- UI ↔ API via `src/utils/api.ts`
- Redux store slices consumed by feature components

**External Integrations:**
- Auth.js (NextAuth) via `src/app/api/auth/`

**Data Flow:**
- UI → API route → Prisma → SQLite
- Media upload → API route → storage (NAS filesystem)

### File Organization Patterns

**Configuration Files:**
- Root: `next.config.js`, `tailwind.config.js`, `tsconfig.json`, `.env`, `.env.example`

**Source Organization:**
- App Router in `src/app/`
- Features in `src/components/<feature>/`
- Redux in `src/store/`
- Utils in `src/utils/`

**Test Organization:**
- Central `tests/` with `api/`, `components/`, `e2e/`, `fixtures/`

**Asset Organization:**
- Static assets in `public/assets/`

### Development Workflow Integration

**Development Server Structure:**
- Next.js App Router (`src/app`)
- API routes under `src/app/api`

**Build Process Structure:**
- Next.js build output to `.next/`
- Prisma migrations tracked in `prisma/migrations/`

**Deployment Structure:**
- Node process runs Next.js build output
- `.env` used for runtime config

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All major choices are compatible: Next.js App Router + Prisma + SQLite + Auth.js + REST + Redux.

**Pattern Consistency:**
Naming, format, and structure patterns align with the chosen stack and routes.

**Structure Alignment:**
Project tree supports auth, API, Prisma, and media flows with defined boundaries.

### Requirements Coverage Validation ✅

**Epic/Feature Coverage:**
Feature areas (Trips, Entries, Media, Sharing) have clear API + UI + data locations.

**Functional Requirements Coverage:**
Trip/entry CRUD, media uploads, sharing links, and role checks are supported.

**Non-Functional Requirements Coverage:**
Performance targets, security basics (HTTPS planned, JWT sessions), and small-group scalability are supported.

### Implementation Readiness Validation ✅

**Decision Completeness:**
All critical choices are documented with versions.

**Structure Completeness:**
Project structure is explicit and maps to features.

**Pattern Completeness:**
Naming, formats, and process patterns are consistent and enforceable.

### Gap Analysis Results

**Critical Gaps:** None.
**Important Gaps:** None.
**Nice-to-Have Gaps:** Consider Docker + TLS proxy post-MVP.

### Validation Issues Addressed

None identified.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION  
**Confidence Level:** high

**Key Strengths:**
- Simple, coherent stack tailored to MVP and NAS hosting
- Clear consistency rules for AI agent alignment
- Concrete directory structure and feature mapping

**Areas for Future Enhancement:**
- Docker + TLS proxy
- PostgreSQL migration path
- Rate limiting

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions

**First Implementation Priority:**
Run `npx create-next-app@latest travelblogs`

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅  
**Total Steps Completed:** 8  
**Date Completed:** 2025-12-21T17:38:47Z  
**Document Location:** _bmad-output/architecture.md

### Final Architecture Deliverables

**📋 Complete Architecture Document**

- All architectural decisions documented with specific versions
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**🏗️ Implementation Ready Foundation**

- 17 architectural decisions made
- 5 implementation pattern categories defined
- 7 architectural components specified
- 33 requirements fully supported

**📚 AI Agent Implementation Guide**

- Technology stack with verified versions
- Consistency rules that prevent implementation conflicts
- Project structure with clear boundaries
- Integration patterns and communication standards

### Implementation Handoff

**For AI Agents:**
This architecture document is your complete guide for implementing TravelBlogs. Follow all decisions, patterns, and structures exactly as documented.

**First Implementation Priority:**
Run `npx create-next-app@latest travelblogs`

**Development Sequence:**

1. Initialize project using documented starter template
2. Set up development environment per architecture
3. Implement core architectural foundations
4. Build features following established patterns
5. Maintain consistency with documented rules

### Quality Assurance Checklist

**✅ Architecture Coherence**

- [x] All decisions work together without conflicts
- [x] Technology choices are compatible
- [x] Patterns support the architectural decisions
- [x] Structure aligns with all choices

**✅ Requirements Coverage**

- [x] All functional requirements are supported
- [x] All non-functional requirements are addressed
- [x] Cross-cutting concerns are handled
- [x] Integration points are defined

**✅ Implementation Readiness**

- [x] Decisions are specific and actionable
- [x] Patterns prevent agent conflicts
- [x] Structure is complete and unambiguous
- [x] Examples are provided for clarity

### Project Success Factors

**🎯 Clear Decision Framework**
Every technology choice was made collaboratively with clear rationale, ensuring all stakeholders understand the architectural direction.

**🔧 Consistency Guarantee**
Implementation patterns and rules ensure that multiple AI agents will produce compatible, consistent code that works together seamlessly.

**📋 Complete Coverage**
All project requirements are architecturally supported, with clear mapping from business needs to technical implementation.

**🏗️ Solid Foundation**
The chosen starter template and architectural patterns provide a production-ready foundation following current best practices.

---

**Architecture Status:** READY FOR IMPLEMENTATION ✅

**Next Phase:** Begin implementation using the architectural decisions and patterns documented herein.

**Document Maintenance:** Update this architecture when major technical decisions are made during implementation.
