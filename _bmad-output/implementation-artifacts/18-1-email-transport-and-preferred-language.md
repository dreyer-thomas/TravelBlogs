---
baseline_commit: 88d2ff4
---

# Story 18.1: Email Transport and Preferred Language

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the operator,
I want the application to send mail reliably in production and never in development,
so that account mails (Stories 18.2–18.4) can be built on a transport that cannot lose mail silently.

**FRs covered:** FR40 (and the groundwork for FR41–FR44).
**Origin:** Tommy with John (PM), 2026-11-09 — [sprint-change-proposal-2026-11-09.md](../planning-artifacts/sprint-change-proposal-2026-11-09.md).
**Reference implementation:** TravelPlan Story 8.8 (`/Users/tommy/Development/TravelPlan/_bmad-output/implementation-artifacts/8-8-password-reset-emails-that-arrive.md`) and its code in `/Users/tommy/Development/TravelPlan/travelplan/src/lib/notifications/{email,smtpConfig}.ts`. Port it; do not redesign it. That code already went through an adversarial review whose fixes are listed in *Dev Notes → Lessons already paid for*.

**This story sends no mail to anybody.** It delivers the transport, the startup check, the per-user language and the privacy-policy disclosure. The first real mail is Story 18.2.

## Acceptance Criteria

1. **SMTP in production.** **Given** `NODE_ENV=production` and all of `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` set, **when** `sendEmail` is called, **then** the mail is sent via `nodemailer` with `MAIL_FROM` as the From header. Port 465 uses implicit TLS (`secure: true`); any other port sets `secure: false, requireTLS: true`. Certificate verification stays on (no `tls.rejectUnauthorized`). `connectionTimeout`, `greetingTimeout` and `socketTimeout` are each 15 000 ms.
2. **Outbox everywhere else.** **Given** `NODE_ENV` is anything other than `production` (`development`, `test`, `staging`, unset), **when** `sendEmail` is called, **then** the message is pushed to an in-memory outbox and **no transport is created**, even if all SMTP variables are set.
3. **Refuse to serve without configuration.** **Given** `NODE_ENV=production` and any SMTP variable missing or whitespace-only, **when** the server starts, **then** `register()` in `src/instrumentation.ts` throws an error that names every missing variable (fixed order) and never contains a value. **And** `SMTP_PORT` that is not an integer from 1 to 65535 throws, naming `SMTP_PORT` but not its value. **And** with `NEXT_PHASE=phase-production-build` the check is skipped, so `npm run build` passes with no SMTP variables.
4. **Failures are thrown and can be logged safely.** **Given** an SMTP failure, **when** `sendEmail` runs, **then** it rejects (it never swallows). **And** `describeSendFailure(error)` returns only `{ code, responseCode, message }` with every address-shaped substring in `message` replaced by `<address>`, and for a non-`Error` throw returns `message: "non-Error thrown (<typeof>)"` — never the error object, `command`, `response` or envelope.
5. **Preferred language on the user.** **Given** the migration has run, **then** `User.preferredLanguage` exists as enum `PreferredLanguage { de en }`, `NOT NULL`, default `de`, and every existing row reads `de`. **And** the admin create form has a language selector (Deutsch / English) defaulting to German, sent as `preferredLanguage` to `POST /api/users`. **And** the edit row in the admin user list lets an administrator change a user's language via `PATCH /api/users/[id]`. **And** `GET /api/users` and the PATCH/POST responses include `preferredLanguage`.
6. **Privacy policy discloses mail.** **Given** `/datenschutz` renders, **then** the inventory has a new **Email** activity (EN "Emails from this site" / DE "E-Mails dieser Website") describing: account mails (password reset, invitation, trip-access notice) go to the account's own address; the address, the message and the sending server's metadata pass through the operator's mail provider (Strato) to deliver it; nothing is sent to people without an account. **And** its legal basis comes from the new required `SITE_PRIVACY_LEGAL_BASIS_EMAIL`, so until it is set the page stays in "not yet published". **And** the existing **Account data** text no longer says the address is "not passed on to anyone else", and lists the preferred language.
7. **Docs.** **Given** the repo docs, **then** `travelblogs/.env.example` has a commented SMTP block plus `SITE_PRIVACY_LEGAL_BASIS_EMAIL=`, and `travelblogs/README.md` has an "Outgoing email" section with the Strato values, the mailbox-password note, `.env` quoting rules and the release note in *Dev Notes → Docs*.
8. **Production acceptance (Tommy, manual).** **Given** the production `.env` holds the five SMTP variables and `SITE_PRIVACY_LEGAL_BASIS_EMAIL`, **when** this build is deployed, **then** the journal shows no SMTP configuration error, the site serves normally, and `/datenschutz` shows the Email section. Mail delivery itself is verified in Story 18.2.

**Out of scope:** any mail content or sending call site (18.2–18.4); HTML mail and attachments (TravelPlan's 9.3 additions — do **not** port them); the user's own language switch writing to the DB (the UI language stays browser-side, see *Dev Notes → Language*); removing `mustChangePassword`; the admin password field (stays until 18.3).

## Tasks / Subtasks

- [x] **Task 1: Dependency** (AC: 1)
  - [x] In `travelblogs/`: `npm install nodemailer@^10` (10.4.0 is current; TravelPlan runs `^10.1.7`). **No `@types/nodemailer`** — v10 ships its own `.d.ts`; `@types/nodemailer` describes an older API.
  - [x] `npm audit` clean (dependency policy: fix findings, never `npm audit fix` blindly). Record the installed version in Completion Notes.
- [x] **Task 2: `src/utils/smtp-config.ts`** (AC: 1, 3)
  - [x] Port TravelPlan's `smtpConfig.ts` verbatim in behavior: `SMTP_VARIABLES` (order: `SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM`), `usesSmtp() = process.env.NODE_ENV === "production"`, `readSmtpConfig()`, `assertSmtpConfigured()`.
  - [x] Empty-check on the trimmed value, but `pass` returns the **raw** `process.env.SMTP_PASS` (a password may start/end with a space).
  - [x] `secure = port === 465`. Port regex `/^\d+$/` then range check.
  - [x] Error text: replace "(password reset)" / "docs/deployment-configuration.md" with TravelBlogs wording pointing to `README.md → Outgoing email`.
  - [x] **Must not import `nodemailer`** (see *Dev Notes → Edge runtime*).
- [x] **Task 3: `src/utils/email.ts`** (AC: 1, 2, 4)
  - [x] Port TravelPlan's `email.ts` **without** `html` and `attachments`: `EmailMessage = { to: string; subject: string; text: string }`. `sendMail({ from, to, subject, text })` exactly — no extra keys.
  - [x] Keep: `describeSendFailure` + `ADDRESS_PATTERN`, `SMTP_TIMEOUT_MS = 15_000`, transport-per-call, `globalThis` outbox (only pinned to `globalThis` outside production), `getEmailOutbox()` (returns a copy), `clearEmailOutbox()`.
  - [x] `sendEmail` throws on failure. Callers decide; document that in the JSDoc.
- [x] **Task 4: Boot check in `src/instrumentation.ts`** (AC: 3)
  - [x] Inside the existing `if (process.env.NEXT_RUNTIME === "nodejs")` branch, **first statement**: `const { assertSmtpConfigured } = await import("./utils/smtp-config"); assertSmtpConfigured();` — before the Prisma client and backfills, and **outside** their `try/catch` (that catch logs and swallows; the SMTP throw must propagate).
  - [x] Extend the docblock: why this check lives here (knowable at startup; losing mail silently is the failure being prevented) and why the module is imported dynamically.
- [x] **Task 5: Prisma migration** (AC: 5)
  - [x] `schema.prisma`: `enum PreferredLanguage { de en }` next to `UserRole`; `preferredLanguage PreferredLanguage @default(de)` on `User`.
  - [x] `npx prisma migrate dev --name add_user_preferred_language`. Inspect the SQL: it must be an `ALTER TABLE "User" ADD COLUMN "preferredLanguage" TEXT NOT NULL DEFAULT 'de'` (SQLite stores the enum as TEXT), **not** a table rebuild that could drop data. If Prisma generates a rebuild, hand-write the `ALTER` instead.
  - [x] Extend `tests/api/users/user-model.test.ts`: a created user defaults to `de`; `en` round-trips.
- [x] **Task 6: User API** (AC: 5)
  - [x] `src/app/api/users/route.ts` POST: schema gains `preferredLanguage: z.enum(["de","en"]).default("de")`; persist it; include it in the response. GET: add to `select` and to the mapped output.
  - [x] `ensureDefaultCreator` in the same file: leave `preferredLanguage` alone (creating → default `de`; the sync `update` must not touch it).
  - [x] `src/app/api/users/[id]/route.ts` PATCH: schema becomes `{ role?: …, preferredLanguage?: z.enum(["de","en"]) }` with a refine requiring at least one. **All existing role guards apply only when `role` is present**: "Cannot change your own role" (move the self-check after parsing and condition it on `role !== undefined`), "Cannot change creator role", last-admin protection. A language-only PATCH is allowed for any user including self and `creator`. Include `preferredLanguage` in the response. Keep the `{ data, error }` envelope and existing error codes.
  - [x] Tests: extend `tests/api/users/create-user.test.ts` (default `de`, explicit `en`, invalid value → 400 `VALIDATION_ERROR`, GET includes the field) and `tests/api/users/update-user-role.test.ts` (language-only PATCH on self and on another user succeeds; role-only behavior unchanged; empty body → 400; self role change still 403).
- [x] **Task 7: Admin UI** (AC: 5)
  - [x] `src/components/admin/user-form.tsx`: add a `preferredLanguage` select (default `"de"`, options "Deutsch"/"English" via new i18n keys), send it, reset it to `"de"` after success. Password field unchanged.
  - [x] `src/components/admin/user-list.tsx`: in the edit row, add a language select next to the role select with its own pending state and save, using the same optimistic/rollback pattern as the role change (`handleRoleChange` area). Show the current language in the row (e.g. a small `DE`/`EN` badge).
  - [x] Thread the field through `UserListItem` types in `user-list.tsx`, `users-dashboard.tsx` and `src/app/admin/users/page.tsx`.
  - [x] Tests: `tests/components/admin/user-form.test.tsx` (selector present, defaults to German, value in POST body), `tests/components/admin/user-list.test.tsx` (language shown, change sends PATCH `{ preferredLanguage }` only).
- [x] **Task 8: Privacy policy** (AC: 6)
  - [x] `src/utils/privacy-policy.ts`: append `"email"` to `PRIVACY_ACTIVITY_IDS`. `legalBasisEnvKey("email")` derives `SITE_PRIVACY_LEGAL_BASIS_EMAIL` automatically — do not add a second list.
  - [x] `src/utils/i18n.ts` EN and DE: add `legal.privacy.activities.email.{title,what,why,where}`; update `activities.account.what` (add "preferred language for emails") and `activities.account.where` (address goes to the mail provider when the site emails you; see the Email section). Suggested wording in *Dev Notes → Privacy texts*. Check whether the policy's intro or any count ("nine activities", "eight activities") mentions a number and update it.
  - [x] Tests: `tests/utils/privacy-policy.test.ts` (missing `SITE_PRIVACY_LEGAL_BASIS_EMAIL` → gap listed, page unpublished; set → published) and `tests/components/privacy-policy-page.test.tsx` (Email section renders in both languages; account text no longer contains "Not passed on to anyone else"). Existing fixtures that build a "fully configured" env must gain the new variable, or they will start failing — that failure is expected, fix the fixture, not the gate.
- [x] **Task 9: i18n** (AC: 5, 6)
  - [x] All new keys in both `en` and `de` in `src/utils/i18n.ts` (`admin.language`, `admin.languageGerman`, `admin.languageEnglish`, `admin.languageFor`, plus the privacy keys). `tests/utils/i18n.test.ts` and the catalog must stay in parity.
- [x] **Task 10: Transport tests** (AC: 1–4)
  - [x] `tests/utils/smtp-config.test.ts`: each variable missing; each whitespace-only; several missing (all named, in order); bad ports (`abc`, `0`, `65536`, `46 5`) with an **exact** message assertion; sentinel `SMTP_PASS` never in any message; `SMTP_PASS=" pw "` returned raw; build phase skipped; non-production skipped.
  - [x] `tests/utils/email.test.ts` (`vi.mock("nodemailer", () => ({ default: { createTransport }, createTransport }))`, env via `vi.stubEnv`, `vi.unstubAllEnvs()` in `afterEach`): non-production for `development`/`test`/`staging` → outbox, `createTransport` not called even with SMTP set; production 465 → `secure: true`, 587 → `secure: false, requireTLS: true`; all three timeouts `15_000`; no `tls` key; `sendMail` called with exactly `{ from: MAIL_FROM, to, subject, text }` (`toStrictEqual`, so a stray `html: undefined` fails); production leaves outbox empty; rejecting `sendMail` → `sendEmail` rejects; `describeSendFailure` redacts addresses, handles non-`Error`, ignores `command`/`response` holding a sentinel.
  - [x] `tests/utils/instrumentation.test.ts`: mock `@prisma/client`, `@prisma/adapter-better-sqlite3` and the four `./utils/backfill-*` modules; with `NEXT_RUNTIME=nodejs`, `NODE_ENV=production`, SMTP unset → `register()` rejects naming the variables **and no backfill mock was called**; with SMTP set → backfills run; with `NEXT_RUNTIME=edge` → resolves, nothing imported.
- [x] **Task 11: Docs** (AC: 7)
  - [x] `.env.example` and README per *Dev Notes → Docs*.
- [x] **Task 12: Verification**
  - [x] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` — the build with **no** SMTP variables in the environment or `.env`.
  - [x] Optional local smoke: `NODE_ENV=production node server.js` with SMTP unset shows the named-variables error in the console. **Never** put the real Strato password on a dev machine.
  - [x] AC 8 stays unchecked in Completion Notes as "pending Tommy".

### Review Findings

- [x] [Review][Decision] An administrator cannot change their own email language in the UI — `isEditDisabled = isSelf && !isDefaultCreator` (user-list.tsx:314) still locks the whole edit panel, so the new language select is unreachable on an admin's own row, although the API allows a self language-only PATCH (Task 6). Options: (a) open the panel for language only on self rows, keeping role/status/delete locked; (b) accept as is (already disclosed in Completion Notes) and leave it for a later story. **Resolved (Tommy): (a)** — the panel opens on the admin's own row; only the language select is usable, and role, status and delete stay locked.
- [x] [Review][Patch] A role save or Edit toggle during an in-flight language save closes the panel and hides the language error — `handleSave`, the role Save button and the Edit toggle ignore `savingLanguage`, and `user.error` is only rendered inside the panel [travelblogs/src/components/admin/user-list.tsx:158]
- [x] [Review][Patch] Reuse the existing `Locale` type instead of four inline `"de" | "en"` literals (Dev Notes → Language) [travelblogs/src/app/admin/users/page.tsx:19; user-list.tsx; users-dashboard.tsx; user-form.tsx]
- [x] [Review][Patch] `eslint-plugin-react-hooks` is held at 7.0.1 only by a hand-edited lockfile entry; the next lockfile refresh floats it to 7.1.x. Pin it via `overrides` [travelblogs/package.json:64]
- [x] [Review][Patch] `project-context.md` still lists Next.js 16.3.5 and Zod 4.2.1 after the bump to 16.4.5 / 4.6.7 [_bmad-output/project-context.md:21]
- [x] [Review][Patch] PATCH tests lack a combined role + language update on another user, and a language-only update on the last active admin (must skip the last-admin guard) [travelblogs/tests/api/users/update-user-role.test.ts]
- [x] [Review][Patch] Language badge puts `aria-label` on a role-less `<span>`, which screen readers may ignore; use visually hidden text instead [travelblogs/src/components/admin/user-list.tsx:341]

## Dev Notes

### What exists today (read before changing)

- **No mail anywhere.** `grep -ri nodemailer src` is empty.
- **`src/instrumentation.ts`** — `register()` runs only under `NEXT_RUNTIME === "nodejs"`, dynamically imports Prisma and four backfill modules, runs `backfillGpsData` awaited inside a `try/catch` that **logs and swallows**, then chains the other backfills fire-and-forget. Preserve all of that; the SMTP check goes in front of it and outside the catch.
- **`server.js`** — custom HTTPS/HTTP server; line 2 is `require("dotenv/config")`, so `.env` is loaded before Next starts and the instrumentation hook sees the SMTP variables. `npm start` sets `NODE_ENV=production`. Vitest runs with `NODE_ENV=test`.
- **`User`** (`prisma/schema.prisma`) — `id, email, name, role (UserRole enum), passwordHash, isActive, mustChangePassword, createdAt, updatedAt`. The env-managed creator has the literal id `"creator"` and is (re)synced by `ensureDefaultCreator()` in `src/app/api/users/route.ts` on every admin list/create call — that sync must not reset `preferredLanguage`.
- **`PATCH /api/users/[id]`** — role-only today. Order of checks: admin auth → self-change forbidden (before parsing!) → parse → 404 → `id === "creator"` forbidden → last-admin guard → update. Language-only updates must get past the self and creator guards; role updates must hit them exactly as before.
- **Admin UI** — `user-form.tsx` (create: email, name, role, temporary password), `user-list.tsx` (edit row with role select, optimistic save + rollback, status toggle, delete), `users-dashboard.tsx`, server page `src/app/admin/users/page.tsx` fetching `GET /api/users`.
- **Privacy policy** — `src/utils/privacy-policy.ts` holds `PRIVACY_ACTIVITY_IDS` (nine today); the page (`src/components/legal/privacy-policy-content.tsx`) maps over it and reads `legal.privacy.activities.<id>.{title,what,why,where}`; the publish gate (`describePrivacyPolicyGaps`) requires a meaningful legal basis per id. Adding the id is the whole wiring.
- **i18n** — single catalog `src/utils/i18n.ts` with `en` and `de` trees, `Locale = 'en' | 'de'`, `getTranslation(key, locale)` returns the key on a miss. Server-side translation by explicit locale (what 18.2 will need for mails) is `getTranslation(key, user.preferredLanguage)`.

### Language

`preferredLanguage` decides **only the language of mails** (18.2–18.4). The UI language remains what it is today: browser `Accept-Language` plus the switch persisted in `localStorage`. Do not wire the user-menu switch to the DB in this story — Tommy decided the admin sets it at creation (default German) and that it matters little, because blog content keeps the language it was written in. Reuse the existing `Locale` type for the TS side so `getTranslation(key, user.preferredLanguage)` type-checks.

### Edge runtime

`instrumentation.ts` is compiled for the edge runtime too, where `net`/`tls` do not exist. That is why (a) the import is dynamic and inside the `nodejs` branch, and (b) `smtp-config.ts` must never import `nodemailer` — only `email.ts` does, and only route handlers will import `email.ts`.

### Lessons already paid for (TravelPlan 8.8 review — keep these)

- `SMTP_PASS` is checked trimmed but **used raw**.
- A bad-port test must assert the **exact** message, not just `not.toContain(value)`.
- nodemailer's error `message` can quote the recipient (`550 5.1.1 <user@…>`) → redact addresses; never log the error object (`command`, `response`, envelope).
- `requireTLS: !secure` — without it nodemailer silently continues in clear text, AUTH included, if STARTTLS is not offered.
- `NEXT_PHASE === "phase-production-build"` guard, or `next build` demands the mailbox password.
- One predicate (`usesSmtp`) for both sending and the boot check — a `NODE_ENV=staging` server must not pass the check and then drop mail into the outbox.

### How a startup failure shows

In TravelPlan a throw in `register()` surfaced as **HTTP 500 on every request with the reason in the journal**, not as a process exit. Expect the same here; document it that way (README) rather than promising the service "refuses to start".

### Privacy texts (suggested; operator may reword)

- **email.title** — EN "Emails from this site" / DE "E-Mails dieser Website"
- **email.what** — EN "Your email address and the content of the message: password-reset links, invitations to set up an account, and notices that you were given access to a trip." / DE "Ihre E-Mail-Adresse und der Inhalt der Nachricht: Links zum Zurücksetzen des Passworts, Einladungen zur Einrichtung eines Kontos und Hinweise, dass Ihnen Zugriff auf eine Reise gegeben wurde."
- **email.why** — EN "To let account holders recover and set up their account and to tell them about trips shared with them. Only people with an account receive mail; readers of a share link never do." / DE entsprechend.
- **email.where** — EN "Sent from this site's server through the operator's mail provider, which receives the address and the message in order to deliver it. Nothing is sent to any other service." / DE entsprechend.
- **account.what** add: EN "…, the preferred language for emails, …" / DE "…, die bevorzugte Sprache für E-Mails, …"
- **account.where** — EN "Held in this site's own database on its server. Your email address is additionally passed to the operator's mail provider whenever the site sends you an email (see Emails from this site)." / DE entsprechend.

Do **not** name Strato in the i18n text — the provider is the operator's choice and `SITE_PRIVACY_HOSTING` already exists as the pattern for operator-named providers. Mentioning "the operator's mail provider" is accurate regardless.

### Docs

`.env.example`, after the TLS block:

```
# Outgoing email (Story 18.1). Required in production only: with NODE_ENV=production
# the server refuses to serve until all five are set. In development and tests mail
# is captured in an in-memory outbox and these are ignored.
# SMTP_HOST=smtp.strato.de
# SMTP_PORT=465
# SMTP_USER=webmaster@dreyer-travels.de
# SMTP_PASS=
# MAIL_FROM="TravelBlogs <system@blogs.dreyer-travels.de>"
```

and `SITE_PRIVACY_LEGAL_BASIS_EMAIL=` in the privacy block (with a one-line comment).

README, new section **Outgoing email** under the deploy section:
- the five variables with production values (`smtp.strato.de`, `465`, `webmaster@dreyer-travels.de`, mailbox password, `TravelBlogs <system@blogs.dreyer-travels.de>`), same mailbox as TravelPlan on this host;
- `SMTP_PASS` is the **mailbox** password from Strato "Postfach bearbeiten", **not** the Strato customer login; it is a secret, so the production `.env` should be `chmod 600` and owned by the service user;
- `MAIL_FROM` is an alias on the `SMTP_USER` mailbox (Strato rejects unowned From addresses) — create the alias first;
- **quoting in `.env`**: dotenv treats an unquoted `#` as a comment start, so quote `MAIL_FROM` and any `SMTP_PASS` containing `#`, spaces or quotes (single quotes avoid escape processing). This differs from TravelPlan, whose values live in systemd `Environment=` lines;
- port 587 (STARTTLS) as fallback if 465 is unreachable: `timeout 5 bash -c "</dev/tcp/smtp.strato.de/465"` (the host has no `nc`);
- **release note:** put the five variables and `SITE_PRIVACY_LEGAL_BASIS_EMAIL` into the production `.env` **before** deploying this build; a missing SMTP variable shows as HTTP 500 on every request with the reason in `journalctl -u TravelBlogs`, a missing legal basis turns `/datenschutz` back to "not yet published".
- deliverability: `dreyer-travels.de` publishes DMARC `p=reject` with no SPF (per TravelPlan's docs), so delivery relies on Strato's DKIM signing; the optional SPF record is `v=spf1 include:_spf.strato.com -all`.

### Project Structure Notes

- Project rule "use `utils/` for shared helpers; avoid adding `lib/`" → files are `src/utils/email.ts` and `src/utils/smtp-config.ts` (kebab-case), **not** TravelPlan's `src/lib/notifications/…`. Import paths in TravelBlogs code are mostly relative; the `@/` alias also works (see `vitest.config.ts`).
- Tests are central: `tests/utils/…`, `tests/api/users/…`, `tests/components/admin/…`. No co-located tests.
- API responses keep `{ data, error }` with `{ error: { code, message } }`; JSON fields camelCase (`preferredLanguage`).
- Route tests use a per-file SQLite DB created with `npx prisma migrate deploy` (see `tests/api/users/create-user.test.ts`), so the new migration is exercised automatically.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 18.1]
- [Source: _bmad-output/planning-artifacts/prd.md#Account Mails (Extension)] — FR40; Security NFRs
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-11-09.md]
- [Source: _bmad-output/project-context.md] — `utils/` not `lib/`, central tests, bilingual strings, response envelope
- [Source: travelblogs/README.md#Deploying an update, #systemd unit and the Node runtime] — `.env` via dotenv, not `Environment=`
- [Source: TravelPlan travelplan/src/lib/notifications/email.ts, smtpConfig.ts, src/instrumentation.ts, test/email.test.ts, test/smtpConfig.test.ts]
- [Source: TravelPlan _bmad-output/implementation-artifacts/8-8-password-reset-emails-that-arrive.md#Review Findings]
- [Source: TravelPlan docs/deployment-configuration.md] — Strato values, DMARC/DKIM note

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Debug Log References

- `npm install nodemailer@^10` failed with ERESOLVE: `next-auth@4.24.15` declares an optional peer `nodemailer@^7.0.7` (only for its EmailProvider, which this app does not use — only Credentials). Resolved with a scoped override `"next-auth": { "nodemailer": "$nodemailer" }` instead of `--legacy-peer-deps`.
- `npm audit` was not clean before this story (pre-existing): critical Next.js RCE advisories (GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr; no 16.3.x fix), zod <4.6.6, sharp <0.35.5, vitest/@vitest/mocker, vite 8.3.0–8.3.2, brace-expansion, fast-uri, source-map-js, and minimatch inside `@typescript-eslint/typescript-estree`. Fixed per the dependency policy (no `npm audit fix`).
- During that upgrade `eslint-plugin-react-hooks` floated 7.0.1 → 7.1.1 via `eslint-config-next`, which raised lint from 2 to 22 errors (new `set-state-in-effect` hits in untouched files). Restored the lockfile entry to 7.0.1 and kept `eslint-config-next` at 16.3.5; lint is back to the 2 pre-existing errors (`trips-restore-dashboard.tsx`, `zip-stream.d.ts`), confirmed against a clean HEAD checkout.
- `prisma migrate dev` generated a `new_User` table rebuild; replaced it with a hand-written `ALTER TABLE "User" ADD COLUMN "preferredLanguage" TEXT NOT NULL DEFAULT 'de'`. `prisma migrate diff` against the schema afterwards is empty; existing dev rows read `de`.
- Full-suite runs show 1–2 files failing with 5 s timeouts (`change-password`, `backfill-image-compression`, `edit-trip-page-map` — a different set each run). Same behaviour before any story code; they pass when run alone. Pre-existing load flakiness, not a regression.

### Completion Notes List

- **Dependencies:** `nodemailer@10.4.0` (ships its own types; no `@types/nodemailer`). Audit fixes: `next` 16.3.5 → 16.4.5 (exact pin kept), `zod` 4.2.1 → 4.6.7 (exact pin kept), `sharp` ^0.35.5, `vitest` ^4.1.12, transitive refreshes (vite 8.3.7, fast-uri 3.1.9, brace-expansion 1.1.21, source-map-js 1.2.2), override `@typescript-eslint/typescript-estree → minimatch ^11.0.5`. `npm audit`: 0 vulnerabilities.
- **Transport:** `src/utils/smtp-config.ts` and `src/utils/email.ts` ported from TravelPlan 8.8 without HTML/attachments; `sendMail` gets exactly `{ from, to, subject, text }`. All "lessons already paid for" kept (raw `SMTP_PASS`, exact port message, address redaction, `requireTLS: !secure`, build-phase skip, single `usesSmtp` predicate). Error text points to README "Outgoing email".
- **Boot check:** first statement in the `nodejs` branch of `register()`, outside the backfill try/catch, dynamically imported. Local smoke: `NODE_ENV=production node server.js` with SMTP unset → every request 500, journal line names all five variables and no values; with dummy values set → `/datenschutz` 200 and shows the Email section.
- **Preferred language:** enum `PreferredLanguage { de en }`, default `de`. POST accepts/defaults/returns it, GET returns it, `ensureDefaultCreator` leaves it untouched (tested). PATCH accepts `role` and/or `preferredLanguage` (refine: at least one); self/creator/last-admin guards apply only when `role` is present; self role check moved after parsing.
- **Admin UI:** create form has an "Email language" select (Deutsch/English, default German, reset after success). User list shows a DE/EN badge and, in the edit row, a language select with its own pending/saving state, Save button and optimistic rollback; sends `{ preferredLanguage }` only. The field is labelled "Email language" / "E-Mail-Sprache" because it only governs mail language. Note: the edit row stays disabled for a non-creator administrator's own row (unchanged behaviour); the API allows a self language change, the UI does not expose it there.
- **i18n:** new `admin.language`, `admin.languageGerman`, `admin.languageEnglish`, `admin.languageFor`, plus `admin.saveLanguage` and `admin.updateLanguageError` (needed for the save button and error), and `legal.privacy.activities.email.*` in EN and DE; parity test green.
- **Privacy:** `"email"` appended to `PRIVACY_ACTIVITY_IDS` (→ `SITE_PRIVACY_LEGAL_BASIS_EMAIL`, gate enforced). Account `what` lists the preferred language; account `where` no longer says "not passed on to anyone else". No provider named in the catalog. Additionally added one sentence to the "Services this site calls from its own server" paragraph (EN/DE) so that list does not read as exhaustive while omitting the mail provider. `.env.example` count comment updated ("nine … tenth").
- **Docs:** `.env.example` SMTP block (commented) + `SITE_PRIVACY_LEGAL_BASIS_EMAIL=`; README "Outgoing email" with Strato values, mailbox-password note, `.env` quoting, 587 fallback, startup-check behaviour (HTTP 500, not exit), DMARC/DKIM note and the release note.
- **Verification:** `npm run typecheck` clean; `npm run lint` 2 pre-existing errors, none in touched files; `npm run build` succeeds with no SMTP variables in env or `.env`; `npm audit` 0; full suite 1124 passed / 1 skipped, with only the pre-existing timeout flakes described above.
- **AC 8 (production acceptance): pending Tommy** — put the five SMTP variables and `SITE_PRIVACY_LEGAL_BASIS_EMAIL` into the production `.env` before deploying.

### File List

- travelblogs/package.json
- travelblogs/package-lock.json
- travelblogs/prisma/schema.prisma
- travelblogs/prisma/migrations/20261109182128_add_user_preferred_language/migration.sql (new)
- travelblogs/src/utils/smtp-config.ts (new)
- travelblogs/src/utils/email.ts (new)
- travelblogs/src/instrumentation.ts
- travelblogs/src/app/api/users/route.ts
- travelblogs/src/app/api/users/[id]/route.ts
- travelblogs/src/app/admin/users/page.tsx
- travelblogs/src/components/admin/user-form.tsx
- travelblogs/src/components/admin/user-list.tsx
- travelblogs/src/components/admin/users-dashboard.tsx
- travelblogs/src/utils/privacy-policy.ts
- travelblogs/src/utils/i18n.ts
- travelblogs/.env.example
- travelblogs/README.md
- travelblogs/tests/utils/smtp-config.test.ts (new)
- travelblogs/tests/utils/email.test.ts (new)
- travelblogs/tests/utils/instrumentation.test.ts (new)
- travelblogs/tests/api/users/user-model.test.ts
- travelblogs/tests/api/users/create-user.test.ts
- travelblogs/tests/api/users/update-user-role.test.ts
- travelblogs/tests/components/admin/user-form.test.tsx
- travelblogs/tests/components/admin/user-list.test.tsx
- travelblogs/tests/utils/privacy-policy.test.ts
- travelblogs/tests/components/privacy-policy-page.test.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-11-09: Story 18.1 implemented — SMTP transport + outbox, production boot check, `User.preferredLanguage` (migration, API, admin UI), privacy-policy Email activity, docs. Pre-existing npm audit findings fixed (next 16.4.5, zod 4.6.7, sharp, vitest, transitive). Status → review.
