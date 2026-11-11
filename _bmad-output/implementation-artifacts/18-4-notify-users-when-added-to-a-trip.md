---
baseline_commit: 88d2ff431623fe85caa7791685dab943071a0635
---

# Story 18.4: Notify Users When Added to a Trip

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to get a mail when someone gives me access to a trip,
so that I know the trip exists and can open it directly.

**FRs covered:** FR44 ("Users are notified by email when they are given access to a trip"). **NFR:** "Mail-sending flows never write passwords, tokens, links or message bodies to logs." (PRD → Security).
**Origin:** Tommy with John (PM), 2026-11-09 — [sprint-change-proposal-2026-11-09.md](../planning-artifacts/sprint-change-proposal-2026-11-09.md).
**Builds on (all done):**
- 18.1: `src/utils/email.ts` (`sendEmail`, `describeSendFailure`, outbox), `User.preferredLanguage`.
- 18.2: the fire-and-forget pattern in `src/utils/password-reset.ts` (`startPasswordReset`), `buildSetPasswordUrl` (the `NEXTAUTH_URL` handling to copy).
- 18.3: `invitationPending`, the creator-account check in `src/utils/account-token.ts`.

The privacy policy ("notices that you were given access to a trip") and the README "Outgoing email" section ("trip-access notice") already mention this mail. No proxy change, no migration, no UI change.

## Acceptance Criteria

1. **Mail on access granted.** **Given** a trip owner (creator) or an administrator calls `POST /api/trips/[id]/viewers` for a user who has no access row on that trip yet, **when** the row is created (`201`), **then** exactly one mail goes to that user's address, in their `preferredLanguage`. It names the trip title, the name of the person who added them, and their role on this trip (viewer, or contributor when the created row has `canContribute: true`). It links to `${NEXTAUTH_URL}/trips/<tripId>`.
2. **No noise.** No mail is sent when:
   - the user already had access (the existing `200` branch),
   - the role changes (`PATCH /api/trips/[id]/viewers/[userId]`),
   - access is removed (`DELETE …/[userId]`),
   - the added user is the acting user ("adding myself") or the trip's owner,
   - the added user is the environment-managed creator account (`id === "creator"` or `CREATOR_EMAIL`, epic non-goal),
   - `NEXTAUTH_URL` is unset or invalid (one fixed log line, no mail).
3. **Adding never fails because of mail.** **Given** sending fails (SMTP error, or any error while preparing the mail), **then** the access row exists, the response status and body are exactly what they are without mail, and exactly one log line is written: a fixed prefix plus `describeSendFailure(error)`. It never contains the address, names, trip title, link or body. The response does **not** wait for the mail.
4. **Pending invitations still get the mail.** **Given** the added user still has `invitationPending: true`, **then** the mail is sent anyway. It has one extra paragraph saying they must first set their password with the invitation mail. The link still points at the trip; it leads to sign-in (and back to the trip via `callbackUrl`), which is expected.
5. **Never the share token.** The mail contains the authenticated trip URL only, never a `/trips/share/<token>` link or the share token.
6. **Bilingual.** Subject, body, role sentences and the pending paragraph exist in English and German. The recipient is addressed with "du" (as in 18.2/18.3). The i18n parity test stays green.
7. **Production acceptance (Tommy, manual).** After deploying, add a test account to a trip on `https://blogs.dreyer-travels.de`. Check that the mail arrives in that account's language, names the trip, you, and the role, and that the link opens the trip after sign-in. Then toggle contributor and remove the account, and check that no further mail arrives.

**Out of scope:**
- A role choice in the add-user UI of `trip-detail.tsx`. The UI keeps adding as viewer (see *Dev Notes → Contributor on add*).
- Mails on role change or removal (explicitly excluded by the epic).
- Notifying anyone other than the added user. No digest, no HTML.
- Changing who may add users, or the eligible-users list.

## Tasks / Subtasks

- [x] **Task 1: Export the creator-account check** (AC: 2) — `src/utils/account-token.ts`
  - [x] Export the existing private `isCreatorAccount(user: { id; email })`. Do not change its behavior. `isTokenEligibleUser` keeps using it.
- [x] **Task 2: `src/utils/trip-access-notice.ts`** (new) (AC: 1–6)
  - [x] `buildTripUrl(tripId: string): string | null` — same handling as `buildSetPasswordUrl`. Trim `NEXTAUTH_URL`; return null when it is empty or `new URL` throws. Otherwise `new URL(\`/trips/${encodeURIComponent(tripId)}\`, base).toString()`.
  - [x] `sendTripAccessNotice(input): Promise<void>` with input `{ tripId, tripTitle, actorId, recipient: { id, email, name, preferredLanguage, invitationPending }, canContribute }`:
    1. If `buildTripUrl(tripId) === null`: `console.error("trip-access-notice: NEXTAUTH_URL not set; trip access mail not sent")` and return.
    2. Load the actor's name: `prisma.user.findUnique({ where: { id: actorId }, select: { name: true } })`. If the row is missing (the env creator before `ensureDefaultCreator` ran), fall back to `getTranslation("email.tripAccess.someone", locale)`. Do not use the email as a fallback.
    3. Build the mail from `email.tripAccess.subject` and `email.tripAccess.body` in **one pass with a function replacement**: `template.replace(/\{\{(\w+)\}\}/g, (m, k) => values[k] ?? m)` (see 18.3 review on `$&`, and *Mail text* on why one pass). Use `{{name}}`, `{{actor}}`, `{{trip}}`, `{{role}}`, `{{url}}`, `{{pending}}`. `{{role}}` is `email.tripAccess.roleContributor` or `email.tripAccess.roleViewer`. `{{pending}}` is `email.tripAccess.pendingInvitation` + `"\n\n"` when `invitationPending`, else `""`.
    4. **Subject:** collapse whitespace in the trip title (`title.replace(/\s+/g, " ").trim()`) before putting it in the subject. A header must never carry a line break. The body can keep the title as is.
    5. `await sendEmail({ to: recipient.email, subject, text })`. Let errors propagate. `startTripAccessNotice` handles them.
  - [x] `startTripAccessNotice(input): Promise<void>` — the route's entry point, a copy of `startPasswordReset`: `return sendTripAccessNotice(input).catch((error: unknown) => { console.error("trip-access-notice: trip access mail not sent", describeSendFailure(error)); })`. Return the caught promise so util tests can await it. The route ignores it with `void`. The `.catch` is mandatory: an unhandled rejection would put the raw error (which can carry the recipient) in the journal.
  - [x] Never log `recipient.email`, any name, the trip title, the URL or the text.
  - [x] `shouldNotifyTripAccess({ actorId, ownerId, recipient })`: false when `recipient.id === actorId`, `recipient.id === ownerId`, or `isCreatorAccount(recipient)`. Export it so it can be tested on its own.
- [x] **Task 3: Hook into `POST /api/trips/[id]/viewers`** (AC: 1–5) — `src/app/api/trips/[id]/viewers/route.ts`
  - [x] `requireCreatorTrip`: add `title: true` to the trip `select` and return `user` with the trip: `return { trip, user }`. `GET` ignores it. The `[userId]` and `eligible` routes have their own copies and stay unchanged.
  - [x] `inviteSchema`: add `canContribute: z.boolean().optional()` (see *Dev Notes → Contributor on add*). Pass `canContribute: parsed.data.canContribute ?? false` to `tripAccess.create`. The existing-row branch does **not** apply it; it stays a pure no-op `200`.
  - [x] Make the `user` lookup's `select` explicit and include `id, email, name, role, isActive, invitationPending, preferredLanguage`. Today it loads the full row, including `passwordHash`.
  - [x] After `tripAccess.create` succeeds and **before** `return NextResponse.json(…201)`:
    ```ts
    if (shouldNotifyTripAccess({ actorId: access.user.id, ownerId: access.trip.ownerId, recipient: user })) {
      void startTripAccessNotice({ tripId: access.trip.id, tripTitle: access.trip.title, actorId: access.user.id, recipient: user, canContribute: created.canContribute });
    }
    ```
    Do not `await` it. Nothing it does may change the response.
  - [x] The outer `catch` currently logs `console.error("Failed to invite viewer", error)`. A raw Prisma error can carry the email in `meta`. Change it to `console.error("Failed to invite viewer", describeSendFailure(error))`, as 18.3 did in `POST /api/users`.
  - [x] `runtime = "nodejs"` is already set. It is required, because the route now imports `email.ts` (nodemailer).
  - [x] Do **not** touch `[userId]/route.ts` (PATCH/DELETE) or `eligible/route.ts`. AC 2 holds because they never import the notice.
- [x] **Task 4: i18n** — `src/utils/i18n.ts`, EN (`email:` block ~line 377) and DE (~line 1046), next to `invitation` (AC: 6)
  - [x] `email.tripAccess.subject`, `email.tripAccess.body`, `email.tripAccess.roleViewer`, `email.tripAccess.roleContributor`, `email.tripAccess.pendingInvitation`, `email.tripAccess.someone`. Suggested texts are in *Dev Notes → Mail text*.
  - [x] Privacy policy and README already cover this mail. Check them and do not change them unless the wording is wrong.
- [x] **Task 5: Tests** (AC: 1–6)
  - [x] **New `tests/api/trips/viewers-notification.test.ts`** (own DB `file:./prisma/test-trip-viewers-notification.db`; copy the setup of `tests/api/trips/viewers.test.ts`, i.e. `getToken` via `vi.hoisted` + `vi.mock("next-auth/jwt")`, `migrate deploy`, adapter, dynamic imports). `beforeEach`: `clearEmailOutbox()`, `vi.stubEnv("NEXTAUTH_URL", "https://blogs.example.test")`. `afterEach`: `vi.unstubAllEnvs()`. Positive cases wait with `await vi.waitFor(() => expect(getEmailOutbox()).toHaveLength(1))`. Negative cases flush with `await new Promise((r) => setTimeout(r, 50))` and then expect an empty outbox.
    - Owner adds a `de` viewer by `userId` → 201, one mail to that address. The German subject contains the trip title. The body contains the owner's name, the trip title, the German viewer sentence and exactly `https://blogs.example.test/trips/<tripId>`. It does not contain `/trips/share/` or `token`.
    - Owner adds an `en` user by `email` → English mail.
    - `canContribute: true` → 201 with `canContribute: true` in the response, the row has it, and the mail has the contributor sentence.
    - Administrator adds a user to someone else's trip → the mail names the administrator, not the owner.
    - Pending invitee (`invitationPending: true`) → mail sent and includes the pending paragraph. A non-pending user's mail does not include it.
    - Adding again (existing row) → 200, no mail.
    - `PATCH …/[userId]` `{ canContribute: true }` → 200, no mail. `DELETE …/[userId]` → 200, no mail.
    - Owner adds themselves (`userId` = owner id) → no mail (whatever status the route returns today; do not change it).
    - Recipient with `id: "creator"` → access created, no mail.
    - `NEXTAUTH_URL` unset → 201, row created, no mail, one `console.error` with the fixed line.
    - `canContribute: "yes"` → 400 `VALIDATION_ERROR`, no row.
  - [x] **New `tests/api/trips/viewers-notification-failure.test.ts`**: use the `vi.resetModules()` + `vi.doMock("…/src/utils/email", async (importOriginal) => ({ ...original, sendEmail: vi.fn().mockRejectedValue(Object.assign(new Error("550 5.1.1 <added.user@example.com> unknown"), { code: "EENVELOPE", responseCode: 550 })) }))` pattern from `tests/api/auth/password-resets.test.ts` (~line 79) and its own DB file.
    - The response is 201 with the same `data` shape as the happy path, and the access row exists.
    - Wait until `console.error` has been called (`vi.waitFor`). It is called exactly once with `"trip-access-notice: trip access mail not sent"`. The serialized args contain none of: the address, the user's or actor's name, the trip title, `/trips/`, `blogs.example.test`.
  - [x] **Unit tests `tests/utils/trip-access-notice.test.ts`** (no DB needed for these two; mock `./db` only if a test needs `sendTripAccessNotice`):
    - `buildTripUrl`: unset, blank and invalid `NEXTAUTH_URL` → null. A base with a trailing slash or a path → `https://host/trips/<id>`. An id with `/` or `?` is encoded.
    - `shouldNotifyTripAccess`: self, owner, `id: "creator"`, `CREATOR_EMAIL` match (case-insensitive) → false. A normal user → true.
    - A trip title with `\n` → the subject has no line break (via `sendTripAccessNotice` with the outbox).
    - A name or title containing `$&` is rendered literally.
  - [x] Existing `tests/api/trips/viewers.test.ts` must stay green unchanged. It does not stub `NEXTAUTH_URL`, so its POSTs log the "not set" line. That is acceptable. If the noise bothers you, stub it in that file's `beforeEach`.
  - [x] `tests/utils/i18n.test.ts` parity green.
- [x] **Task 6: Verification**
  - [x] `npm test`, `npm run typecheck`, `npm run lint` (2 pre-existing errors allowed: `trips-restore-dashboard.tsx`, `zip-stream.d.ts`; none in touched files), `npm run build`, `npm run audit` (no new dependencies).
  - [x] Leave AC 7 open in Completion Notes as "pending Tommy". This story has no migration, so a plain deploy is enough.

### Review Findings

- [x] [Review][Patch] The "owner adds themselves" test ignores the response. A 4xx or 500 from the route would still pass the "no mail" check. Assert the status the route returns today (201). [travelblogs/tests/api/trips/viewers-notification.test.ts:243]
- [x] [Review][Patch] The failure test never asserts that the mocked `sendEmail` was called. If an earlier step failed (for example the actor lookup), the test would still pass, and the leak checks on the SMTP error text would have checked nothing. Assert one call with `to: "added.user@example.com"`. [travelblogs/tests/api/trips/viewers-notification-failure.test.ts:94]
- [x] [Review][Patch] No route test covers an administrator adding themselves to someone else's trip (actor ≠ owner). The self check is only unit-tested. Add a route test: 201, no mail. [travelblogs/tests/api/trips/viewers-notification.test.ts]
- [x] [Review][Patch] The German pending paragraph is never asserted. The pending test uses `en` only. Add a `de` pending case that checks for the DE `pendingInvitation` text. [travelblogs/tests/api/trips/viewers-notification.test.ts]
- [x] [Review][Defer] Two concurrent POSTs for the same trip and user both miss `findUnique`. The second `create` then hits the `tripId_userId` unique constraint (P2002), and the route returns 500 instead of 200 with the existing row. [travelblogs/src/app/api/trips/[id]/viewers/route.ts:262] — deferred, pre-existing

## Dev Notes

### What exists today (read before changing)

- **`src/app/api/trips/[id]/viewers/route.ts`**
  - `requireCreatorTrip`: the caller must be signed in, have role creator or administrator, and be active. A creator must own the trip; an administrator may act on any trip. Today it selects `id, ownerId`.
  - `POST`: `inviteSchema` takes `email` (lowercased) or `userId`. It loads the user and returns 404 if they are missing or inactive, and 400 for any role outside creator/administrator/viewer. An existing `TripAccess` → **200** with that row (idempotent). Otherwise it creates the row → **201**. `canContribute` always defaults to `false`. It does **not** refuse the trip owner: the UI never offers them (`eligible/route.ts` excludes `ownerId`), but the API would add them. Leave that behavior alone and only suppress the mail.
  - The response is `formatAccess(created)`. It must stay byte-identical whether or not a mail is sent.
- **`src/app/api/trips/[id]/viewers/[userId]/route.ts`**: `PATCH { canContribute }` toggles the contributor flag, `DELETE` removes access. Neither is changed. Not importing the notice there is how AC 2 is met.
- **`src/components/trips/trip-detail.tsx`** (~line 806 `handleInviteViewer`): posts `{ userId }` only. Contributor is a later toggle (~line 911 `handleToggleContributor` → PATCH). **No UI change** in this story.
- **`src/utils/password-reset.ts` `startPasswordReset`**: the fire-and-forget shape to copy: `void promise.catch(e => console.error(fixedText, describeSendFailure(e)))`. The self-hosted Node server (`server.js`) keeps running after the response, so a background promise completes. Stay consistent with 18.2 and do not switch to `after()` from `next/server`.
- **`src/utils/email.ts`**: in non-production `sendEmail` pushes to the outbox. Vitest runs with `NODE_ENV=test`, so tests always use the outbox and never SMTP. `describeSendFailure` redacts addresses and is safe for Prisma errors too.
- **`src/utils/account-token.ts`**: `isCreatorAccount` (private today) is `id === "creator"` or the email equals `CREATOR_EMAIL`, case-insensitive. `buildSetPasswordUrl` is the URL pattern to mirror. Do not put `buildTripUrl` in `account-token.ts`; it has nothing to do with tokens.
- **Proxy / sign-in**: `/trips/*` is protected. An unauthenticated request is redirected to `/sign-in?callbackUrl=/trips/<id>`, and `src/app/sign-in/page.tsx` honors `callbackUrl` (line 39). So the link works for signed-out users with no change. A pending invitee lands on sign-in and cannot sign in until they accept, which is what the pending paragraph explains.
- **Trip page access**: viewers and contributors can open `/trips/[tripId]` (covered by `tests/api/trips/trip-detail-access.test.ts`). The link is the same for both roles.

### Contributor on add (decision)

The epic says "adds me as viewer or contributor". Today `POST` always creates a viewer, and contributor is a later PATCH, which AC 2 says sends nothing. So without a change, no mail could ever say "contributor". The story adds an **optional** `canContribute` boolean to `POST` (default `false`, backwards compatible). Then an API caller, and any future UI role choice, can create a contributor in one step, and the mail states the role of the **created row**. The UI stays as it is. In practice, mails from the current UI say "viewer". If the owner then enables contribution, the user gets no second mail. That is accepted per AC 2.

### Why the trip mail goes to pending invitees

The epic decides it. A pending invitee was invited by an admin and will become active, so telling them about the trip now saves a second round. The pending paragraph prevents the confusing "I can't sign in" moment.

### Mail text (suggested; Tommy may reword)

- **EN subject:** `{{actor}} shared the trip "{{trip}}" with you`
- **EN body:**
  ```
  Hello {{name}},

  {{actor}} has given you access to the trip "{{trip}}" on TravelBlogs. {{role}}

  Open the trip:

  {{url}}

  {{pending}}You get this email because your TravelBlogs account was added to this trip.
  ```
- **EN roleViewer:** `You can read the trip and all its entries.`
- **EN roleContributor:** `You can read the trip and add and edit entries as a contributor.`
- **EN pendingInvitation:** `Your account is not set up yet: first choose your password with the link in your invitation email, then sign in.`
- **EN someone:** `Someone`
- **DE subject:** `{{actor}} hat die Reise „{{trip}}“ mit dir geteilt`
- **DE body:**
  ```
  Hallo {{name}},

  {{actor}} hat dir Zugriff auf die Reise „{{trip}}“ bei TravelBlogs gegeben. {{role}}

  Zur Reise:

  {{url}}

  {{pending}}Du erhältst diese E-Mail, weil dein TravelBlogs-Konto zu dieser Reise hinzugefügt wurde.
  ```
- **DE roleViewer:** `Du kannst die Reise und alle Einträge lesen.`
- **DE roleContributor:** `Du kannst die Reise lesen und als Mitwirkende*r Einträge hinzufügen und bearbeiten.` (Tommy may prefer a gender-neutral rewording, e.g. `… lesen und Einträge hinzufügen und bearbeiten.`)
- **DE pendingInvitation:** `Dein Konto ist noch nicht eingerichtet: Wähle zuerst mit dem Link aus deiner Einladungs-E-Mail dein Passwort und melde dich dann an.`
- **DE someone:** `Jemand`
- German quotes: open with `„`, close with `“` (18.3 review caught an ASCII close quote).
- Replace `{{actor}}` in the subject too. Apply all replacements with functions, and replace `{{pending}}` **before** the others, so that text inside a name or title cannot be read as a placeholder. Better still, replace in one pass: `text.replace(/\{\{(\w+)\}\}/g, (m, k) => values[k] ?? m)`. One pass means a placeholder-looking string inside a value is never expanded again.

### Logging rules (AC 3)

There are exactly two `console.error` sites in the new code. Both use a fixed string, and the second adds `describeSendFailure(error)`:
- `"trip-access-notice: NEXTAUTH_URL not set; trip access mail not sent"`
- `"trip-access-notice: trip access mail not sent"`

The route's own catch uses `describeSendFailure`. Nothing logs the input object.

### Testing notes

- Copy the setup from `tests/api/trips/viewers.test.ts` (users, trips and `getToken` mocks for the owner `{ sub, role: "creator" }` and the administrator). Use a **distinct DB filename** per new file.
- Mocks of the route's imports: the failure test uses `vi.doMock` on `src/utils/email` *before* the dynamic route import, after `vi.resetModules()`. `vi.doUnmock` + `vi.resetModules()` in `afterAll`.
- `vi.waitFor` is the clean way to observe the background send. Do not make the route await the send to simplify tests; AC 3 forbids it.
- The full suite has pre-existing 5 s timeout flakes under load (`change-password`, `backfill-image-compression`, `edit-trip-page-map`). Re-run them alone before calling a failure a regression.

### Previous story intelligence (18.1–18.3)

- Use function replacements in templates (18.3 review: `$&` in a typed name).
- Use `describeSendFailure` for every error log in mail-adjacent routes, Prisma errors included (18.3 changed `POST /api/users`).
- Keep the DE tone "du" toward the recipient and use correct German quotes.
- Fire-and-forget always gets a `.catch` with one safe log line (18.2).
- `NEXTAUTH_URL` missing → log and skip, never send a mail with a broken link (18.2/18.3).
- Prisma 7 renamed `migrate diff` flags. Not relevant here, because there is no migration.

### Project Structure Notes

- New: `src/utils/trip-access-notice.ts`, `tests/api/trips/viewers-notification.test.ts`, `tests/api/trips/viewers-notification-failure.test.ts`, `tests/utils/trip-access-notice.test.ts`.
- Modified: `src/app/api/trips/[id]/viewers/route.ts`, `src/utils/account-token.ts` (one `export`), `src/utils/i18n.ts`.
- Not modified: `src/proxy.ts` (no new public route), `prisma/schema.prisma`, `trip-detail.tsx`, `[userId]/route.ts`, `eligible/route.ts`.
- Conventions: `utils/` not `lib/`, kebab-case files, central `tests/`, `{ data, error }` envelope, camelCase JSON.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 18.4]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-11-09.md] — FR44, mail NFR
- [Source: _bmad-output/implementation-artifacts/18-3-invite-new-users-by-email.md] — review findings (function replacements, safe Prisma logging, DE quotes), test patterns
- [Source: _bmad-output/implementation-artifacts/18-2-password-reset-by-email.md] — fire-and-forget send, `NEXTAUTH_URL` handling
- [Source: _bmad-output/project-context.md] — stack versions, bilingual strings, envelope, `utils/`
- [Source: travelblogs/src/app/api/trips/[id]/viewers/route.ts, [userId]/route.ts, eligible/route.ts, src/utils/email.ts, src/utils/password-reset.ts, src/utils/account-token.ts, src/utils/invitation.ts, src/components/trips/trip-detail.tsx, src/proxy.ts, src/app/sign-in/page.tsx]

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Debug Log References

- Red: new unit and route tests failed before implementation (module missing; 8/12 route tests failing, incl. `canContribute: "yes"` returning 201 because zod stripped the unknown key).
- Green: `npm test` 135 files / 1254 passed, 1 skipped. `npm run typecheck` clean. `npm run lint`: only the 2 pre-existing errors, touched files lint-clean. `npm run build` OK. `npm run audit`: 0 vulnerabilities.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created (2026-11-11).
- `isCreatorAccount` exported from `account-token.ts`, behavior unchanged.
- New `src/utils/trip-access-notice.ts`: `buildTripUrl`, `shouldNotifyTripAccess`, `sendTripAccessNotice`, `startTripAccessNotice`. Templates filled in one pass with a function replacement; actor name and trip title are whitespace-collapsed in the subject. Missing actor row falls back to "Someone"/"Jemand". Exactly two fixed `console.error` lines; the failure line adds only `describeSendFailure(error)`.
- `POST /api/trips/[id]/viewers`: optional `canContribute` boolean (only on create; existing-row branch is still a pure 200 no-op), explicit user `select` (no `passwordHash`), trip `title` selected, `requireCreatorTrip` returns the acting user, fire-and-forget notice after create (not awaited), outer catch logs `describeSendFailure(error)`. `[userId]` and `eligible` routes untouched.
- i18n: `email.tripAccess.*` in EN and DE ("du", German quotes „…“). DE contributor sentence uses the gender-neutral variant suggested in Dev Notes: "Du kannst die Reise lesen und Einträge hinzufügen und bearbeiten." Tommy may reword.
- README "Outgoing email" and privacy policy already cover the trip-access notice; no change needed.
- Tests: 6 unit tests (`tests/utils/trip-access-notice.test.ts`), 11 route tests (`viewers-notification.test.ts`), 1 failure-path test (`viewers-notification-failure.test.ts`). Existing `viewers.test.ts` unchanged and green.
- **AC 7 (production acceptance): passed 2026-11-11 (Tommy).** Trip-access mail arrived with trip, actor and role; link opened the trip after sign-in; no mail on contributor toggle or removal. Invitation and password-reset mails also confirmed in production.

### File List

- travelblogs/src/utils/trip-access-notice.ts (new)
- travelblogs/src/utils/account-token.ts (modified)
- travelblogs/src/utils/i18n.ts (modified)
- travelblogs/src/app/api/trips/[id]/viewers/route.ts (modified)
- travelblogs/tests/utils/trip-access-notice.test.ts (new)
- travelblogs/tests/api/trips/viewers-notification.test.ts (new)
- travelblogs/tests/api/trips/viewers-notification-failure.test.ts (new)
- _bmad-output/implementation-artifacts/18-4-notify-users-when-added-to-a-trip.md (modified)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)

### Change Log

- 2026-11-11: Story 18.4 implemented — trip-access notice mail on `POST /api/trips/[id]/viewers` (fire-and-forget, bilingual, pending-invitee paragraph), optional `canContribute` on add, safe error logging. Status → review.
- 2026-11-11: Code review — 4 test-gap patches applied (owner-self status assertion, `sendEmail` call asserted in the failure test, admin-adds-self route test, German pending paragraph test), 1 pre-existing race deferred to `deferred-work.md`. Status → done (AC 7 production check still pending Tommy).
- 2026-11-11: AC 7 production acceptance passed (Tommy).
