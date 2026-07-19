# Sprint Change Proposal - Contextual Share-Link Preview Images

**Date:** 2026-07-19
**Project:** TravelBlogs
**Submitted by:** John (Product Manager)
**Change Scope:** Minor - Direct Implementation

---

## 1. Issue Summary

### Problem Statement

Public share links (single day-entry links and the trip-overview link) currently show a generic, site-wide preview image and title when pasted into WhatsApp/iMessage/Slack, instead of the actual shared entry's/trip's own photo and title.

### Context

This session first added a sitewide default favicon and Open Graph/Twitter share image (a compass-mark icon on the app's brand palette) to fix the app having no recognizable icon at all. Once that shipped, the user noticed the follow-on gap: every share link — regardless of which entry or trip it points to — now shows that same generic image and the generic "TravelBlogs" title, because the public share routes (`src/app/trips/share/[token]/page.tsx` and `src/app/trips/share/[token]/entries/[entryId]/page.tsx`) have no route-specific metadata and simply inherit the root layout's generic Open Graph tags.

### Evidence

- User feedback: "if I copy the share URL and paste it into messages und whatsapp then I see now the gray background and the new icon"
- Specific request: "Can we show here also an image of the story and a short text, like the title of the shared day entry?"
- Epic 4 ("Sharing & Collaboration," stories 4.1–4.5) is `done` and retro'd (2025-12-29) — this is new-need-discovered-post-completion, not an in-flight defect.

---

## 2. Impact Analysis

### Epic Impact

- **Epic 4 (Sharing & Collaboration):** Original scope (stories 4.1–4.5: generate/regenerate/revoke share links, discreet share UI, entry-link invalidation on revoke) remains complete and correct as delivered. Not broken, just missing a capability that didn't exist as a concept until the sitewide OG work made the gap visible.
- **Conclusion:** No epic-level rewrite required. Treat as an epic addendum: one new story (4.6) appended to Epic 4.
- Remaining epics (5–15, all `done` per `sprint-status.yaml`) reviewed — none affected, no resequencing needed.

### Story Impact

**Current Stories:** 4.1–4.5 (done) — unaffected, stay as-is.

**New Story:** 4.6 — Contextual Share-Link Preview Images (backlog → ready-for-dev after `create-story`). See Section 4 for full text.

### Artifact Conflicts

- **PRD:** No conflict. FR19/FR20 (shareable link generation/viewing) are unaffected; this is additive UX polish on top of an already-shipped capability. The PRD's "SEO is not required" note is unrelated — this addresses messaging-app link unfurls, not search engines.
- **Architecture / UX specs:** Neither exists as a formal document in this project; nothing to update.
- **Other artifacts:** New automated tests are needed (captured as part of Story 4.6's own Testing Requirements, not a separate artifact). No CI/CD pipeline or deployment scripts exist in this project to touch.

### Technical Impact

- Two new route-scoped files (`generateMetadata` + `opengraph-image.tsx`) per share segment (entry, trip).
- One new shared helper, `resolveUploadFilePath`, added to `src/utils/media.ts` — this also **removes existing duplication**: the URL→filesystem-path logic it replaces is currently copy-pasted inline in `src/app/api/trips/[id]/export/route.ts` and `src/app/api/trips/restore/route.ts`.
- `inferMediaType` (currently private to `src/utils/entry-reader.ts`) becomes exported for reuse.
- No new dependencies — images are read from local disk and embedded as base64 data URIs in `next/og`'s `ImageResponse`, reusing the pattern and `CompassMark` component/brand palette already established by this session's sitewide favicon/OG work.

---

## 3. Recommended Approach

**Selected:** Option 1 — Direct Adjustment (add Story 4.6 to the existing Epic 4).

**Rationale:**
- **Effort:** Low — reuses an established pattern (per-route `opengraph-image.tsx`/`generateMetadata`) and existing components/utilities from this session's prior work; no new dependencies or infrastructure.
- **Risk:** Low — read-only additions to public routes that already expose this same title/photo data on the page itself; no auth or data-exposure change.
- **Rejected alternatives:** Rollback (Option 2) doesn't apply — nothing is broken. MVP scope review (Option 3) doesn't apply — the MVP and sharing feature are both already shipped and working; this is pure polish, not a scope crisis.

---

## 4. Detailed Change Proposals

### Epics — Add Story 4.6 to `_bmad-output/planning-artifacts/epics.md` (after Story 4.5, before the Epic 5 heading)

```markdown
### Story 4.6: Contextual Share-Link Preview Images

**As a** creator sharing a trip or entry link
**I want** the link preview (in WhatsApp/iMessage/Slack, etc.) to show the actual shared content's photo and title
**So that** recipients see a meaningful preview instead of a generic site icon

**Acceptance Criteria:**

#### AC 1: Entry Share Preview Shows Entry Content
**Given** a day entry has a cover image or media photo
**When** someone pastes that entry's share link into a messaging app
**Then** the link preview shows that entry's photo, with the entry's title and the trip's title as a byline

#### AC 2: Trip Share Preview Shows Trip Content
**Given** a trip has a cover image
**When** someone pastes the trip's share link
**Then** the link preview shows the trip's cover photo and the trip's title

#### AC 3: Graceful Fallback When No Image Exists
**Given** an entry or trip has no usable image (no cover image, and no image-type media)
**When** someone pastes its share link
**Then** the link preview falls back to the generic TravelBlogs compass design, with no error

#### AC 4: Page Title Reflects Content
**Given** either share page is loaded directly in a browser
**When** the page head is inspected
**Then** the tab title and meta description reflect the entry's/trip's own title, not the generic site-wide copy

**Technical Requirements:**
- Add `generateMetadata` + `opengraph-image.tsx` to `src/app/trips/share/[token]/entries/[entryId]/` and `src/app/trips/share/[token]/`
- Reuse hero-image precedence (`coverImageUrl` else first image-type media item) via an exported `inferMediaType` from `src/utils/entry-reader.ts`
- Add a `resolveUploadFilePath` helper to `src/utils/media.ts`, consolidating URL→filesystem-path logic currently duplicated inline in the trip export/restore routes
- Read the resolved file from disk and embed as a base64 data URI in `ImageResponse` (`next/og`) — no new dependencies, no network fetch
- Reuse the existing `CompassMark` component + brand palette for the fallback (built during this session's sitewide favicon/OG work)

**Testing Requirements:**
- Unit tests for both `opengraph-image` routes: valid image → PNG; no image → fallback; unreadable file → fallback (no 500)
- Unit tests for the new `resolveUploadFilePath` and exported `inferMediaType`

**Source:** User feedback following sitewide favicon/OG rollout (2026-07-19)
**Priority:** Medium
**Story Points:** 3
```

### sprint-status.yaml — Add tracking entry, reopen epic

```yaml
epic-4: in-progress   # was: done
4-6-contextual-share-link-preview-images: backlog
```

Per this file's own status definitions ("`done`: All stories in epic completed"), `epic-4` can no longer correctly read `done` once an incomplete story (4.6) exists under it — it moves back to `in-progress` until 4.6 reaches `done`, then can return to `done` manually.

---

## 5. Implementation Handoff

**Scope classification:** Minor — direct implementation by the Developer agent, no backlog reorganization or replan needed.

**Handoff sequence:**
1. **PM (John, this workflow):** Add Story 4.6 to `epics.md`; update `sprint-status.yaml` per Section 4. *(Applied on final approval below.)*
2. **`create-story`:** Generate the full story file (`4-6-contextual-share-link-preview-images.md`) with implementation context, pulling in the technical detail already captured above; set `sprint-status` to `ready-for-dev`.
3. **`dev-story`:** Implement per the story's Definition of Done — now including the production-build/typecheck gate added earlier this session, so this story can't reach "review" with a broken build.

**Success criteria:** All 4 acceptance criteria met; `npm run build` and `npm run typecheck` pass; new unit tests pass; existing test suite has no regressions.

**Note on Epic 4 status:** `epic-4` moves from `done` back to `in-progress` in `sprint-status.yaml` (see Section 4) to stay accurate with the file's own status definitions now that an incomplete story exists under it — consistent with how `epic-13` reads `in-progress` (not `done`) while its own fast-follow story (13.2) was outstanding.
