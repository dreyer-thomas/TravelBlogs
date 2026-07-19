---
title: 'Compass favicon and localized link-share icon'
type: 'feature'
created: '2026-07-19'
status: 'done'
route: 'one-shot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** TravelBlogs shipped the default Next.js favicon, so browser tabs, bookmarks, home-screen installs, and shared-link previews all showed a generic placeholder instead of anything recognizable as TravelBlogs.

**Approach:** Built a compass-mark icon (concept "B" of four options presented to the user) from the app's existing teal/terracotta/cream palette, and integrated it via Next.js's native file conventions — a static SVG favicon, a dynamic Apple touch icon, and a dynamic, locale-aware Open Graph/Twitter share image — with zero new dependencies.

</frozen-after-approval>

## Suggested Review Order

**Shared icon source**

- Single source of truth for the compass shape/colors, consumed by both dynamic icon files below.
  [`compass-mark.tsx:1`](../../travelblogs/src/components/brand/compass-mark.tsx#L1)

- Static twin of the same mark for the browser-tab favicon; Next.js can't generate this one dynamically, so it's hand-kept in sync (see comment at top of file).
  [`icon.svg:1`](../../travelblogs/src/app/icon.svg#L1)

**Dynamic icon generation (next/og, no new dependencies)**

- Apple touch icon rendered at 180×180 via `ImageResponse`.
  [`apple-icon.tsx:1`](../../travelblogs/src/app/apple-icon.tsx#L1)

- Open Graph/Twitter share image, now locale-aware: reads `Accept-Language` per request and renders German or English title/tagline text into the 1200×630 image itself.
  [`opengraph-image.tsx:11`](../../travelblogs/src/app/opengraph-image.tsx#L11)

**Metadata & localization**

- Root metadata converted from a static object to `generateMetadata()` so it can resolve the request's base URL (via the existing `getRequestBaseUrl` utility, replacing an earlier draft that misused `NEXTAUTH_URL`) and locale for `og:locale`/title/description.
  [`layout.tsx:17`](../../travelblogs/src/app/layout.tsx#L17)

- New `site.title` / `site.description` translation keys (English + German) backing the metadata and share image text.
  [`i18n.ts:6`](../../travelblogs/src/utils/i18n.ts#L6)

**Tests**

- Smoke tests for the icon/OG routes (renders, correct content-type, non-empty output) and the compass mark's shape/colors.
  [`brand-icons.test.tsx:1`](../../travelblogs/tests/components/brand-icons.test.tsx#L1)

- Coverage for the new `site.*` translation keys in both locales.
  [`i18n.test.ts:29`](../../travelblogs/tests/utils/i18n.test.ts#L29)

**Peripheral**

- Deferred: no PWA/Android manifest or install icons added (iOS + OG/Twitter only, per user decision).
  [`deferred-work.md:19`](../../_bmad-output/implementation-artifacts/deferred-work.md#L19)
