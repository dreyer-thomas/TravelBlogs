# Deferred Work

## Deferred from: code review of 9-13-test-rich-text-features-end-to-end (2026-07-19)

- Story checklist overclaims new AC2/AC4 gallery insert/delete test coverage [_bmad-output/implementation-artifacts/9-13-test-rich-text-features-end-to-end.md:743] — the checked-off subtasks imply this story added gallery insert/delete verification; that coverage genuinely exists but was added by Stories 9.7 and 9.11, not this commit.
- entry-reader rich-formatting render test only covers H1 and center/right alignment [travelblogs/tests/components/entry-reader.test.tsx:1475] — H2/H3, underline, and left/justify alignment remain untested.
- New tests don't exercise the German locale despite an explicit translation requirement and an established in-file convention [travelblogs/tests/components/entry-reader.test.tsx, create-entry-form.test.tsx, edit-entry-form.test.tsx] — `entry-reader.test.tsx` already uses `LocaleProvider initialLocale="de"` elsewhere in the same file, but none of this story's new tests do.
- **Silent content loss on structurally invalid Tiptap JSON** [travelblogs/src/components/entries/entry-reader-rich-text.tsx `parseContent`] — discovered while tightening the invalid-JSON fallback test (2026-07-19). Entry text that is syntactically valid JSON shaped like `{type:"doc", content:[...]}` but contains a node type not registered in this app's Tiptap extension set (e.g. from a future editor version, or data corruption) is classified as `'tiptap'` by `detectEntryFormat`, then rejected internally by ProseMirror (`RangeError: Unknown node type`, logged as `[tiptap warn]: Invalid content`) and rendered as a fully empty document — no crash, but also no visible content and no error indication to the reader. This differs from the plain-text fallback path, which does show raw text on failure. Covered (as documented current behavior, not a fix) by `entry-reader.test.tsx` — "does not crash on structurally invalid Tiptap JSON...". Consider: fall back to visible raw text or a "content unavailable" message instead of silent blank.

## Deferred from: code review of 15-6-trip-list-ordered-by-start-date (2026-07-19)

- Admin trips-export page's data-loading/ordering logic has zero test coverage [travelblogs/src/app/admin/trips-export/page.tsx] — `trips-export.test.tsx` only exercises the presentational `TripsExportDashboard` component with hand-built props; `loadTripsForExport` itself is never tested.
- No dedicated unit test file for `travelblogs/src/utils/trip-ordering.ts`'s comparator — edge cases (millisecond-identical dates, identical titles differing only by id) are only indirectly exercised via API integration tests.
- No test proves "sorting is applied after filtering" (AC3) behaviorally [travelblogs/tests/api/trips/list-trips.test.ts, travelblogs/tests/api/trips/world-map.test.ts] — every ordering test uses trips that are all already visible to the requester; nothing confirms a trip excluded by an access rule doesn't corrupt the ordering of the remaining ones.
- `compareTripsByStartDate` ties on exact millisecond `getTime()`, not calendar-date equality [travelblogs/src/utils/trip-ordering.ts:21] — a restored/imported trip with a non-midnight timestamp compared against a freshly created trip defaulting to midnight UTC on the same calendar day will never hit the title/id tie-break, even though both display the same date.

## Deferred from: compass favicon & OG image (2026-07-19)

- No PWA/Android home-screen manifest or icons added alongside the favicon/OG overhaul [travelblogs/src/app/] — `apple-icon.tsx` covers iOS "Add to Home Screen", but there's no `manifest.json`/`site.webmanifest` or 192×192/512×512 PNGs for Android/Chrome home-screen installs. Add if/when PWA installability becomes a real ask.

## Deferred from: code review of 4-6-contextual-share-link-preview-images (2026-07-19)

- Server-only imports (`node:path`, `resolveUploadRoot`) added to client-shared `travelblogs/src/utils/media.ts` rely only on build-time tree-shaking, not a structural guard [travelblogs/src/utils/media.ts:1-3] — pre-existing file-placement convention across this codebase (no `server-only` package or `.server.ts` naming exists yet); fixing properly means establishing a new project-wide pattern, not a story-scoped change.
- Proxy allowlist regression tests only unit-test the pure `publicTripEntryView` classifier, not the full middleware→route chain [travelblogs/tests/api/auth/proxy.test.ts:65-78] — this is what actually caused the disclosed production incident (crawlers redirected to sign-in). Already fixed and regression-tested at the unit level; full end-to-end coverage through the real middleware chain is a testing-infra investment beyond this story's scope.

## Deferred from: code review of 0-5-upgrade-prisma-dev-tooling-to-resolve-vulnerable-dependencies (2026-07-19)

- Story 0.4 and 0.5 both edit the same uncommitted/untracked file — addendum could be lost if 0.4's file is regenerated before either is committed [_bmad-output/implementation-artifacts/0-4-dependency-vulnerability-gate.md:83] — process/commit-ordering advisory, not a code defect.
- AC2's manual runtime click-through (sign-in + view trip) has no artifact beyond the dev agent's self-report [_bmad-output/implementation-artifacts/0-5-upgrade-prisma-dev-tooling-to-resolve-vulnerable-dependencies.md:85] — automated suite (108 files/848 tests, including `prisma migrate deploy` executed live across ~35 test files) substantially corroborates the same code paths but not the exact manual flow.
- No `engines` field in `travelblogs/package.json` to enforce `prisma@7.8.0`'s new Node floor (`^20.19 || ^22.12 || >=24.0`) for non-local environments — pre-existing gap, not introduced by this story.
- Forced `@hono/node-server@1.19.14` override's actual functional surface (Prisma Studio / dev-CLI HTTP server) was never directly exercised [travelblogs/package.json:58-60] — tests/build/typecheck/`prisma generate` don't invoke it; low real-world impact since the project has no `prisma studio` script.
- Story file's own "Project Structure Notes" (only 3 files expected to change) contradicts its Tasks list, which requires editing a 4th file [_bmad-output/implementation-artifacts/0-5-upgrade-prisma-dev-tooling-to-resolve-vulnerable-dependencies.md:38,60] — pre-existing spec authoring inconsistency; dev correctly followed the Tasks list.
