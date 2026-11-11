---
baseline_commit: 88d2ff431623fe85caa7791685dab943071a0635
---

# Story 18.2: Password Reset by Email

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user who forgot my password,
I want to request a reset link on the sign-in page,
so that I can get back into my account without asking the operator.

**FRs covered:** FR41. **NFR:** "Mail-sending flows never reveal whether an email address has an account, and never write passwords, tokens, links or message bodies to logs." (PRD → Security).
**Origin:** Tommy with John (PM), 2026-11-09 — [sprint-change-proposal-2026-11-09.md](../planning-artifacts/sprint-change-proposal-2026-11-09.md).
**Builds on:** Story 18.1 (done) — `src/utils/email.ts` (`sendEmail`, `describeSendFailure`, outbox), `User.preferredLanguage`.
**Reference implementation:** TravelPlan Story 1.5 / 8.8 — `/Users/tommy/Development/TravelPlan/travelplan/src/lib/auth/passwordReset.ts`, `src/app/api/auth/password-reset/{request,confirm}/route.ts`. Reuse the ideas (sha256 of 32 random bytes, fire-and-forget send, same answer always); **do not** port its CSRF/rate-limit modules (TravelBlogs has neither) and **do not** copy its confirm route's check-then-update race (see *Dev Notes → Consuming a token atomically*).

**This story is the first real mail.** It also lays the token table and the set-password page that Story 18.3 (invitations) reuses — build them type-agnostic.

## Acceptance Criteria

1. **Request without enumeration.** **Given** I am on `/sign-in`, **when** I click "Forgot password?" and submit an address on `/forgot-password`, **then** I always see the same confirmation ("If an account exists for this address, we've sent a link…"), whether or not the address has an account. **And** `POST /api/password-resets` answers `200 { data: { accepted: true }, error: null }` immediately — the user lookup, token creation and send run **after** the response is produced (not awaited), so neither DB work nor SMTP time differs between known and unknown addresses. A syntactically invalid address → `400 VALIDATION_ERROR` (that reveals nothing about accounts).
2. **Who gets a mail.** **Given** the normalized address (trim + lowercase, exactly as `validateCredentials` does) belongs to an **active** user that is **not** the environment-managed creator (`id === "creator"` or email equal to normalized `CREATOR_EMAIL`), **then** exactly one plain-text mail with a reset link is sent, subject and body in that user's `preferredLanguage`. **And** for unknown, deactivated or creator addresses no token is created and no mail is sent.
3. **The link.** **Given** I open `${NEXTAUTH_URL}/set-password?token=<raw>` within 1 hour, **when** I enter a new password (min. 8 characters) twice and they match, **then** the password is changed, `mustChangePassword` is cleared, the token is consumed, **all other unused tokens of my account are invalidated**, and I am sent to `/sign-in?passwordReset=1`, which shows a success notice. **And** an expired, used, unknown or malformed token — or one whose user has since been deactivated — renders a clear "This link is no longer valid" state on `/set-password` with a link to `/forgot-password` (the form is not shown). The same check runs again on submit (`400 TOKEN_INVALID`), and a submit that loses a race to a second tab also gets `TOKEN_INVALID`.
4. **Safe logging.** **Given** sending fails (or the background task throws for any reason), **then** the request has already answered the same confirmation, and exactly one log line is written: a fixed prefix plus `describeSendFailure(error)` — never the address, token, link, body or password.
5. **Public routes.** **Given** an anonymous visitor or a signed-in user with `mustChangePassword`, **then** `/forgot-password`, `/set-password`, `POST /api/password-resets` and `POST /api/account-tokens/redeem` are reachable without a redirect; proxy tests pin this.
6. **Bilingual.** All new UI strings and both mail texts exist in English and German; the i18n parity test stays green.
7. **Production acceptance (Tommy, manual).** After deploying: request a reset for a test account on `https://blogs.dreyer-travels.de`, the mail arrives from `system@blogs.dreyer-travels.de` in the account's language, the link sets a new password, and signing in with it works. (Sprint change proposal, step 3.)

**Out of scope:** invitation mails and the `invite` flow (18.3 — but the table and page must already accept `type`); trip notices (18.4); revoking existing JWT sessions after a reset (NextAuth JWT sessions are stateless — see *Dev Notes → Known limits*); fixing the sign-in page's existing `ACCOUNT_NOT_FOUND` / `ACCOUNT_INACTIVE` messages (a separate enumeration channel, pre-existing); IP-based rate limiting; removing `mustChangePassword`.

## Tasks / Subtasks

- [x] **Task 1: Token table** (AC: 2, 3)
  - [x] `prisma/schema.prisma`: add
    ```prisma
    enum AccountTokenType {
      reset
      invite
    }

    model AccountToken {
      id        String           @id @default(cuid())
      userId    String
      type      AccountTokenType
      tokenHash String           @unique
      expiresAt DateTime
      usedAt    DateTime?
      createdAt DateTime         @default(now())

      user User @relation(fields: [userId], references: [id], onDelete: Cascade)

      @@index([userId, type])
    }
    ```
    and `accountTokens AccountToken[]` on `User`. Model name singular, camelCase columns — match the existing schema style (no `@map` snake_case; that is TravelPlan's style, not this repo's).
  - [x] `npx prisma migrate dev --name add_account_token`. This one is a **new table**, so a `CREATE TABLE` is expected; verify the migration does **not** rebuild `User` (it should not — the relation lives on `AccountToken`). If it does, hand-write the SQL as 18.1 did.
  - [x] Extend `tests/api/users/user-model.test.ts` or add `tests/api/users/account-token-model.test.ts`: deleting a user cascades its tokens; `tokenHash` is unique.
- [x] **Task 2: `src/utils/account-token.ts`** (AC: 2, 3) — type-agnostic, reused by 18.3
  - [x] `ACCOUNT_TOKEN_TTL_MS: Record<AccountTokenType, number>` = `{ reset: 60 * 60 * 1000, invite: 7 * 24 * 60 * 60 * 1000 }`.
  - [x] `hashAccountToken(raw) = createHash("sha256").update(raw).digest("hex")`.
  - [x] `createAccountToken(userId, type)` → raw token: `randomBytes(32).toString("base64url")` (URL-safe, no encoding needed in the query string; 43 chars). Stores only the hash.
  - [x] `findUsableAccountToken(raw)` → `{ id, userId, type } | null`: null when raw is not a 43-char base64url string, hash unknown, `usedAt` set, `expiresAt <= now`, or the user is missing/inactive/creator. Used by the page (render decision) — **not** as the guard for the write.
  - [x] `redeemAccountToken(raw, password)` → `{ ok: true, type } | { ok: false }`: bcrypt-hash the password (cost 12, `bcryptjs` as in the change-password route) **before** opening the transaction; then in `prisma.$transaction(async (tx) => …)`: (1) `tx.accountToken.updateMany({ where: { tokenHash, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } })` — `count !== 1` → `{ ok: false }`; (2) load the token's user, reject (throw to roll back → `{ ok: false }`) if missing, inactive or creator; (3) `tx.user.update({ passwordHash, mustChangePassword: false })`; (4) `tx.accountToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } })` — invalidates every other unused token of the user (both types). Returns the token `type` so the caller (and 18.3) can branch.
  - [x] Never log raw tokens, hashes or passwords in this module.
- [x] **Task 3: `src/utils/password-reset.ts`** (AC: 1, 2, 4)
  - [x] `requestPasswordReset(email: string): Promise<void>` — the background job:
    - normalize (`trim().toLowerCase()`); look up `prisma.user.findUnique({ where: { email }, select: { id, email, isActive, preferredLanguage } })`;
    - return silently if no user, `!isActive`, `id === "creator"`, or email equals normalized `process.env.CREATOR_EMAIL`;
    - **throttle:** if this user has an unused, unexpired `reset` token created within the last **5 minutes**, return without a new token or mail (prevents mail-bombing a known address by repeated clicks; same response either way, so it leaks nothing);
    - build the link: `new URL("/set-password", process.env.NEXTAUTH_URL)` with `searchParams.set("token", raw)`. If `NEXTAUTH_URL` is unset/invalid → `console.error("password-reset: NEXTAUTH_URL not set; reset mail not sent")` and return **before** creating a token;
    - `createAccountToken(user.id, "reset")`;
    - `await sendEmail({ to: user.email, subject, text })` with `getTranslation("email.passwordReset.subject", user.preferredLanguage)` and `getTranslation("email.passwordReset.body", …).replace("{{url}}", link)` (the repo's placeholder convention is `{{name}}` + `.replace`; there is no interpolation helper).
  - [x] `startPasswordReset(email)` — what the route calls: `void requestPasswordReset(email).catch((error) => console.error("password-reset: reset mail not sent", describeSendFailure(error)))`. One log line, nothing else in it. Note `describeSendFailure` also handles non-SMTP errors (e.g. a Prisma error) safely: it emits only `code`/`responseCode`/address-redacted `message`.
- [x] **Task 4: `POST /api/password-resets`** — `src/app/api/password-resets/route.ts` (AC: 1, 4)
  - [x] `export const runtime = "nodejs"` (imports `email.ts` → `nodemailer`).
  - [x] Parse JSON (`400 INVALID_JSON`), validate `z.object({ email: z.string().trim().min(1).email() })` (`400 VALIDATION_ERROR`), call `startPasswordReset(parsed.data.email)`, return `200 { data: { accepted: true }, error: null }`. No auth check. Use the local `jsonError` helper pattern of `src/app/api/users/[id]/password/route.ts`.
  - [x] Do **not** `await` anything after validation. Do not use `after()` from `next/server` unless you verify it works under the custom `server.js`; the plain `void` promise is what TravelPlan runs in production on a long-lived process, and so is TravelBlogs (`server.js`).
- [x] **Task 5: `POST /api/account-tokens/redeem`** — `src/app/api/account-tokens/redeem/route.ts` (AC: 3)
  - [x] `runtime = "nodejs"`. Body `z.object({ token: z.string().min(1), password: z.string().trim().min(8, "Password must be at least 8 characters.") })` — `.trim()` deliberately mirrors the change-password route, so a password set here signs in exactly like one set there.
  - [x] `redeemAccountToken` → `{ ok: false }` → `400 TOKEN_INVALID "This link is no longer valid."`; ok → `200 { data: { type }, error: null }`. Unexpected error → `500 INTERNAL_SERVER_ERROR`, logged with a fixed message and **no** body/token (do not `console.error(error)` raw if the error could carry the request — log `describeSendFailure(error)`-style `{ code, message }` or just the fixed text).
  - [x] No auth required; no session is created (user signs in afterwards).
- [x] **Task 6: Proxy** — `src/proxy.ts` (AC: 5)
  - [x] The pages live at top level (`/forgot-password`, `/set-password`), next to `/sign-in`, so the current `config.matcher` never runs the proxy on them — keep the matcher unchanged (the snapshot test at `tests/api/auth/proxy.test.ts:131` must still pass).
  - [x] Belt and braces, like `/impressum`/`/datenschutz`: in `isProtectedPath` return `false` for both page paths; in the `mustChangePassword` branch let both pages through (alongside `/sign-in`); in `isAllowedMustChangeApi` allow `/api/password-resets` and `/api/account-tokens/redeem` (otherwise a signed-in must-change user is redirected off these APIs — `/api/*` **is** matched).
  - [x] Tests in `tests/api/auth/proxy.test.ts`: anonymous → both pages pass (`x-middleware-next`), both APIs pass; must-change token → both pages and both APIs pass with no `location`.
- [x] **Task 7: Pages and components** (AC: 1, 3, 6)
  - [x] `src/app/forgot-password/page.tsx` (client, same card layout and Tailwind classes as `src/app/sign-in/page.tsx`): email field, submit → `POST /api/password-resets`. On any 200 replace the form by the confirmation text; on 400 show the validation message; on network/500 show a generic retry error (not the confirmation — the request did not get through). Link "Back to sign in".
  - [x] `src/app/set-password/page.tsx` — **server component**: `noStore()`; read `searchParams.token` (Next 16: `searchParams` is a `Promise` — `await` it); `findUsableAccountToken(token)`; invalid → render the "link no longer valid" card with a link to `/forgot-password`; valid → render `<SetPasswordForm token={token} />`. Export `metadata = { referrer: "no-referrer", robots: { index: false } }` so the token in the URL is never sent as a Referer.
  - [x] `src/components/account/set-password-form.tsx` (client): new password + confirm, client-side min 8 (trimmed) and match check, submit → `POST /api/account-tokens/redeem`; 200 → `router.replace("/sign-in?passwordReset=1")`; `TOKEN_INVALID` → switch to the "no longer valid" state with the `/forgot-password` link; 400 validation → field error. `autoComplete="new-password"` on both fields. Title/labels neutral enough for 18.3 to reuse (pass an optional `heading` prop or derive from token type later — do not hard-code "reset" in the component name).
  - [x] `src/app/sign-in/page.tsx`: add a "Forgot password?" link to `/forgot-password` under the password field; when `searchParams.get("passwordReset") === "1"` show a success notice ("Your password has been changed. Sign in with your new password.") using a green/teal variant of the existing error box.
- [x] **Task 8: i18n** — `src/utils/i18n.ts`, EN and DE (AC: 6)
  - [x] `auth.forgotPassword`, `auth.forgotPasswordTitle`, `auth.forgotPasswordDescription`, `auth.sendResetLink`, `auth.sendingResetLink`, `auth.resetLinkSent`, `auth.resetRequestFailed`, `auth.backToSignIn`, `auth.passwordResetSuccess`, `auth.setPasswordTitle`, `auth.newPassword`, `auth.confirmPassword`, `auth.passwordsDoNotMatch`, `auth.savePassword`, `auth.savingPassword`, `auth.linkInvalidTitle`, `auth.linkInvalidDescription`, `auth.requestNewLink` (reuse `account.passwordMinLength` if its wording fits).
  - [x] New top-level `email.passwordReset.subject` / `email.passwordReset.body` — suggested texts in *Dev Notes → Mail text*.
  - [x] `tests/utils/i18n.test.ts` parity stays green.
- [x] **Task 9: Tests** (AC: 1–5)
  - [x] `tests/utils/password-reset.test.ts` (per-file SQLite DB via `npx prisma migrate deploy`, pattern of `tests/api/users/change-password.test.ts`; `clearEmailOutbox()` in `beforeEach`; `vi.stubEnv("NEXTAUTH_URL", "https://blogs.example.test")`, `vi.stubEnv("CREATOR_EMAIL", …)`): call `requestPasswordReset` directly and assert —
    - `de` user → one outbox mail, German subject, `to` = user's email, body contains `https://blogs.example.test/set-password?token=` + a 43-char base64url token, and `hashAccountToken(token)` exists in the DB with `type: "reset"`, `expiresAt ≈ now + 1h`;
    - `en` user → English subject/body;
    - mixed-case input (`"  Viewer@Example.com "`) finds the lowercase account;
    - unknown address, deactivated user, `id: "creator"` row, and an address equal to `CREATOR_EMAIL` → outbox empty, **no token row**;
    - second request within 5 min → still one mail, one token; after advancing time (`vi.setSystemTime`) past 5 min → second mail;
    - `NEXTAUTH_URL` unset → no mail, no token, one `console.error` without the address.
  - [x] `tests/api/auth/password-resets.test.ts` (route): known and unknown address return byte-identical JSON and status; invalid email → 400; invalid JSON → 400; mail arrives asynchronously (`await vi.waitFor(() => expect(getEmailOutbox()).toHaveLength(1))`). **Transport failure:** `vi.mock("../../../src/utils/email", …)` with `sendEmail` rejecting an `Error("550 5.1.1 <viewer@example.com> unknown")` → response still 200 identical; spy `console.error`: called once, and the serialized args contain neither the address, the token (read it from the DB-side? — instead assert no 43-char base64url substring and no `set-password` substring), nor `"token="`.
  - [x] `tests/api/auth/account-token-redeem.test.ts` (route + util): success → 200 `{ type: "reset" }`, `compare(newPassword, passwordHash)` true, `mustChangePassword` false, token `usedAt` set, a second unused token for the same user also has `usedAt` set, a token of **another** user untouched; reuse → 400 `TOKEN_INVALID`; expired (`expiresAt` in the past) → 400; unknown / tampered (one char flipped) → 400; deactivated user → 400 and password unchanged; password < 8 → 400 `VALIDATION_ERROR` and token **not** consumed; two concurrent redeems of the same token → exactly one 200.
  - [x] Component tests (`tests/components/auth/…`, Testing Library, mock `fetch`): forgot-password shows the confirmation after 200 and an error after 500; set-password form blocks mismatch and < 8, posts `{ token, password }`, redirects on 200, shows invalid state on `TOKEN_INVALID`; sign-in shows the "Forgot password?" link and the success notice with `?passwordReset=1`.
  - [x] Proxy tests per Task 6.
- [x] **Task 10: Docs** — `travelblogs/README.md` "Outgoing email" section: one paragraph that password reset now depends on `NEXTAUTH_URL` being the public `https://blogs.dreyer-travels.de` (links are built from it), and the AC 7 smoke test as the post-deploy check.
- [x] **Task 11: Verification**
  - [x] `npm test`, `npm run typecheck`, `npm run lint` (2 pre-existing errors allowed, none in touched files), `npm run build`.
  - [x] Local smoke in dev: request a reset, read the link from the outbox (e.g. a temporary `console.log` you remove, or a test), set a password, sign in.
  - [x] AC 7 stays open in Completion Notes as "pending Tommy".

### Review Findings

- [x] [Review][Patch] A failed send leaves a usable token that throttles retries for 5 minutes. If `sendEmail` throws, delete the token just created so the user's next request can send again [travelblogs/src/utils/password-reset.ts:58]
- [x] [Review][Patch] Redeem runs bcrypt at cost 12 before checking the token exists. Any 43-character string costs about 200 ms of CPU on a public endpoint. Add a cheap `findFirst` for a usable token before hashing; the atomic `updateMany` claim stays the guard [travelblogs/src/utils/account-token.ts:101]
- [x] [Review][Patch] `/forgot-password` shows the server's English 400 text ("Enter a valid email address.") to German users (AC 6). Map `VALIDATION_ERROR` to an i18n key and update the pinned test [travelblogs/src/app/forgot-password/page.tsx:44]
- [x] [Review][Patch] An empty email on `/forgot-password` shows `auth.credentialsRequired` ("Email and password are required."). Use an email-only message [travelblogs/src/app/forgot-password/page.tsx]
- [x] [Review][Patch] A normal password change leaves outstanding reset links usable for up to 1 hour. Invalidate the user's unused account tokens in the change-password route [travelblogs/src/app/api/users/[id]/password/route.ts:103]
- [x] [Review][Patch] Task 9 test gaps: no redeem or page test for a creator-owned token; the tampered-token test doesn't assert `TOKEN_INVALID`; no test for an invalid (not just empty) `NEXTAUTH_URL` [travelblogs/tests/api/auth/account-token-redeem.test.ts]
- [x] [Review][Defer] Password trim mismatch: redeem, create-user and change-password trim the password, but sign-in compares it untrimmed, so a password with surrounding spaces locks the user out [travelblogs/src/utils/auth.ts:113] — deferred, pre-existing
- [x] [Review][Defer] `POST /api/users` stores the email without lowercasing, so mixed-case accounts get neither sign-in nor a reset mail [travelblogs/src/app/api/users/route.ts:202] — deferred, pre-existing
- [x] [Review][Defer] Passwords over 72 bytes are silently truncated by bcrypt; there is no max length on any password route [travelblogs/src/app/api/account-tokens/redeem/route.ts:11] — deferred, pre-existing
- [x] [Review][Defer] The success redirect always goes to `?passwordReset=1`, and the invalid-link state always points to `/forgot-password`; 18.3 invitations must branch on the returned `type` [travelblogs/src/components/account/set-password-form.tsx] — deferred, belongs to 18.3
- [x] [Review][Defer] Parallel reset requests for one address can race past the throttle (`findFirst` then `create`) and send more than one mail [travelblogs/src/utils/password-reset.ts:41] — deferred, low impact
- [x] [Review][Defer] A signed-in must-change user who resets via the link keeps a JWT with `mustChangePassword=true` until signing in again [travelblogs/src/proxy.ts:132] — deferred, JWT staleness (known limit)

## Dev Notes

### What exists today (read before changing)

- **`src/app/sign-in/page.tsx`** — client component in `<Suspense>`, `useSearchParams` for `callbackUrl` and `error`, `signIn("credentials", { redirect: false })`, card layout `max-w-md rounded-2xl … bg-white p-8`, error box `border-[#B34A3C]/30 bg-[#B34A3C]/10`. Preserve the `toRelative` callback sanitising and the error mapping; only add the link and the success notice.
- **`src/utils/auth.ts` `validateCredentials`** — normalizes email with `trim().toLowerCase()` and looks up `findUnique({ where: { email } })`. The creator is env-managed: `CREATOR_EMAIL`/`CREATOR_PASSWORD` win before the DB lookup; its DB row has the literal id `"creator"`. A reset for the creator would be useless (its password is env) — hence excluded. Note: `POST /api/users` does **not** lowercase the email it stores (pre-existing); the reset lookup must match sign-in's behavior, not try to be cleverer.
- **`src/app/api/users/[id]/password/route.ts`** — the model for a password write: `bcryptjs` `hash(…, 12)`, `mustChangePassword: false`, zod `.trim().min(8)`, local `jsonError(status, code, message)`, `runtime = "nodejs"`. Keep the error envelope `{ data: null, error: { code, message } }`.
- **`src/proxy.ts`** — `config.matcher` covers only `/trips`, `/entries`, `/account`, `/api`. `isProtectedPath` treats every `/api/*` as unprotected (route handlers do their own auth), but the `mustChangePassword` branch runs **before** that and redirects any matched path not in its allowlist — that is why the two new APIs must go into `isAllowedMustChangeApi`. The test file pins the matcher as an exact snapshot (`tests/api/auth/proxy.test.ts:131`) and has the `/impressum`/`/datenschutz` "public if a future matcher lets it through" pattern to copy. (Memory note: anything under `/trips/share/[token]/*` needs the exact-match allowlist — not relevant here because these pages are top-level, but the same philosophy applies.)
- **`src/utils/email.ts`** (18.1) — `sendEmail({ to, subject, text })` throws on failure; outbox in non-production (`getEmailOutbox()`, `clearEmailOutbox()`); `describeSendFailure(error)` → `{ code, responseCode, message }` with addresses redacted. Only route handlers (nodejs runtime) may import it.
- **`src/utils/i18n.ts`** — `Locale = 'en' | 'de'` matches `PreferredLanguage`, so `getTranslation(key, user.preferredLanguage)` type-checks. No interpolation; placeholders are `{{name}}` replaced with `.replace` (see `full-screen-photo-viewer.tsx:791`). `auth` subtree at line ~336 (EN) / ~964 (DE).
- **`NEXTAUTH_URL`** — documented in `.env.example` (`http://localhost:3000`), required by NextAuth in production anyway; not otherwise read in `src/`. `src/utils/request-base-url.ts` uses `NEXT_PUBLIC_SITE_URL`/`SITE_URL`/headers — **do not** use it for mail links (Host headers are attacker-controlled; the epic fixes `NEXTAUTH_URL`).
- **No rate limiting and no CSRF module** exist in TravelBlogs. The 5-minute per-account throttle (Task 3) is the minimal guard; IP rate limiting is out of scope.

### Consuming a token atomically

TravelPlan's confirm route reads the token, checks `used`/`expiresAt`, then updates — two tabs (or an attacker racing the user) can both pass the check. Here the **conditional `updateMany` is the check**: only the call that flips `usedAt` from null gets `count === 1`. SQLite serializes writers, so this is sufficient. Hash the password before the transaction — bcrypt at cost 12 takes ~200 ms and would hold the SQLite write lock. `findUsableAccountToken` is only for deciding what the page renders.

Interactive transactions (`$transaction(async (tx) => …)`) are not used elsewhere in this repo yet; they work with `@prisma/adapter-better-sqlite3`. If you hit an adapter limitation, fall back to: conditional `updateMany` on the token first (outside a transaction), then a batch `$transaction([user.update, accountToken.updateMany])` — the consumed token cannot be replayed either way.

### Why the route returns before doing anything

AC 1's "does not wait for the mail" is the epic's wording; going one step further (no DB lookup before the response either) removes the remaining timing difference between known and unknown addresses (a lookup + insert vs. a lookup). The process is the long-lived `server.js`, so the detached promise completes after the response. The `.catch` is mandatory — an unhandled rejection would otherwise surface as a raw error object in the journal, and that object could contain the recipient.

### Mail text (suggested; Tommy may reword)

- **EN subject:** `Reset your TravelBlogs password`
- **EN body:**
  ```
  Hello,

  someone asked to reset the password for your TravelBlogs account. Open this link within one hour to choose a new password:

  {{url}}

  If you did not ask for this, ignore this email - your password stays as it is.
  ```
- **DE subject:** `TravelBlogs-Passwort zurücksetzen`
- **DE body:**
  ```
  Hallo,

  für dein TravelBlogs-Konto wurde das Zurücksetzen des Passworts angefordert. Öffne diesen Link innerhalb einer Stunde, um ein neues Passwort zu wählen:

  {{url}}

  Falls du das nicht angefordert hast, ignoriere diese E-Mail – dein Passwort bleibt unverändert.
  ```
  (The DE catalog addresses the user with "du" — e.g. `auth.signInDescription` "Nutze dein Konto…". Keep all new DE UI strings in "du" too.)

### Known limits (state them in Completion Notes, do not fix here)

- Sessions are JWT (`session.strategy: "jwt"`); a reset does not sign out other browsers already signed in. Acceptable for this site; a session-version claim would be a separate story.
- The sign-in page itself distinguishes `ACCOUNT_NOT_FOUND` from `INVALID_CREDENTIALS`, so enumeration is possible there regardless of this story. Flag it as a follow-up; changing sign-in errors is out of scope.
- Expired/used tokens are not purged. Volume is tiny; a cleanup can ride along with a later backfill if ever needed.

### Testing notes

- Route/DB tests: per-file SQLite DB (`file:./prisma/test-<name>.db`), `execSync("npx prisma migrate deploy")`, `PrismaBetterSqlite3` adapter, dynamic `import()` of the route **after** setting `DATABASE_URL` — copy `tests/api/users/change-password.test.ts`. The new migration is exercised automatically.
- `vi.stubEnv` + `vi.unstubAllEnvs()` in `afterEach` (as `tests/utils/email.test.ts` does). Vitest runs with `NODE_ENV=test` → outbox, never SMTP.
- The full suite has pre-existing 5 s timeout flakes under load (`change-password`, `backfill-image-compression`, `edit-trip-page-map`); see 18.1 Debug Log. Re-run alone before calling a failure a regression.

### Project Structure Notes

- New files: `src/utils/account-token.ts`, `src/utils/password-reset.ts`, `src/app/api/password-resets/route.ts`, `src/app/api/account-tokens/redeem/route.ts`, `src/app/forgot-password/page.tsx`, `src/app/set-password/page.tsx`, `src/components/account/set-password-form.tsx`, migration `prisma/migrations/<ts>_add_account_token/`, tests under `tests/utils/`, `tests/api/auth/`, `tests/components/auth/`.
- Modified: `prisma/schema.prisma`, `src/proxy.ts`, `src/app/sign-in/page.tsx`, `src/utils/i18n.ts`, `README.md`, `tests/api/auth/proxy.test.ts`.
- REST naming: plural resources (`/password-resets`, `/account-tokens`); `redeem` is an action sub-path because the token is a secret and must travel in the body, not the URL path. `utils/` not `lib/`; kebab-case files; central tests; `{ data, error }` envelope; camelCase JSON.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 18.2]
- [Source: _bmad-output/planning-artifacts/prd.md#Account Mails (Extension)] — FR41; Security NFR on enumeration and logging
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-11-09.md] — token table shared with invitations, 1 h / 7 d expiries, hash-only storage, post-deploy check
- [Source: _bmad-output/implementation-artifacts/18-1-email-transport-and-preferred-language.md] — transport, `describeSendFailure`, `preferredLanguage`, test patterns, pre-existing flakes
- [Source: _bmad-output/project-context.md] — `utils/`, central tests, bilingual strings, response envelope, Next 16.4.5, Zod 4.6.7, Prisma 7.10
- [Source: travelblogs/src/utils/auth.ts, src/app/api/users/[id]/password/route.ts, src/proxy.ts, src/app/sign-in/page.tsx, tests/api/auth/proxy.test.ts]
- [Source: TravelPlan travelplan/src/lib/auth/passwordReset.ts, src/app/api/auth/password-reset/{request,confirm}/route.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Debug Log References

- `prisma migrate dev --name add_account_token` produced a pure `CREATE TABLE "AccountToken"` + two indexes; `User` is not rebuilt. `prisma generate` was needed before typecheck saw the new model.
- Interactive `prisma.$transaction(async (tx) => …)` works with `@prisma/adapter-better-sqlite3`; no fallback needed.
- Mutation check: removing `usedAt: null` from the claiming `updateMany` makes the "already used" and "two concurrent redeems" tests fail (2/9); restored.
- `next dev` (local smoke) rewrote its own generated block in `travelblogs/AGENTS.md` (`#` → `##`); left as is, per the file's note.
- Dev server request logging prints `GET /set-password?token=…`; that is `next dev` only. Production `server.js` logs no request URLs.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created (2026-11-10).
- **Token table** `AccountToken` (type `reset | invite`, sha256 `tokenHash` unique, `expiresAt`, `usedAt`, cascade on user delete), migration `20261110062245_add_account_token`.
- **`src/utils/account-token.ts`** (type-agnostic for 18.3): TTLs 1 h / 7 d, `hashAccountToken`, `createAccountToken` (32 random bytes base64url, hash stored only), `findUsableAccountToken` (render decision only), `redeemAccountToken` (bcrypt cost 12 before the transaction; conditional `updateMany` is the claim; rejects inactive/creator users by rollback; clears `mustChangePassword`; invalidates all other unused tokens of the account). Also exports `isTokenEligibleUser` (active, not `id === "creator"`, not `CREATOR_EMAIL`), shared by the request and redeem paths.
- **`src/utils/password-reset.ts`**: `requestPasswordReset` (normalize like sign-in, eligibility, 5-minute per-account throttle, `NEXTAUTH_URL` check before any token, mail in `preferredLanguage`); `startPasswordReset` fire-and-forget with one `describeSendFailure` log line.
- **Routes**: `POST /api/password-resets` (answers `{ accepted: true }` before any DB work; `INVALID_JSON` / `VALIDATION_ERROR`); `POST /api/account-tokens/redeem` (`TOKEN_INVALID`, `VALIDATION_ERROR`, 500 logs a fixed text + error code only).
- **Proxy**: matcher unchanged; `/forgot-password`, `/set-password` public and allowed for must-change users; both APIs in `isAllowedMustChangeApi`.
- **UI**: `/forgot-password` (client), `/set-password` (server: `await connection()`, `metadata.referrer = "no-referrer"`, `robots.index = false`), `SetPasswordForm` (client, handles both the form and the "link no longer valid" state, optional `headingKey` prop for 18.3), sign-in "Forgot password?" link + success notice on `?passwordReset=1`.
  - Small deviations from the task text: `connection()` instead of `unstable_noStore()` (the Next 16 docs mark `unstable_noStore` legacy and recommend `connection`); the server page passes `token | null` to the client form instead of rendering the invalid card itself, so both states use the client locale like `/sign-in` and the TOKEN_INVALID path shares the same markup; one extra i18n key `auth.setPasswordFailed` for non-token errors on submit.
- **i18n**: 19 `auth.*` keys + `email.passwordReset.{subject,body}` in EN and DE ("du"); mail texts as suggested in Dev Notes. Parity test green.
- **Tests added** (48): model (2), `requestPasswordReset` (9), request route incl. transport-failure log check (4), redeem route (9: success + sibling invalidation + other user untouched, reuse, expired, unknown, malformed, tampered, deactivated, short password not consuming, concurrent), proxy (8), forgot-password page (4), set-password form (6), set-password page (5), sign-in (2).
- **Verification**: `npm test` 130 files / 1179 passed, 1 skipped; `npm run typecheck` clean; `npm run lint` 2 pre-existing errors (`trips-restore-dashboard.tsx`, `zip-stream.d.ts`), none in touched files (only the pre-existing `_error` warning in `sign-in/page.tsx`); `npm run build` succeeds; `npm run audit` 0 vulnerabilities.
- **Local smoke (dev server, port 3123)**: known/unknown address → identical 200 bodies; `/forgot-password` 200; `/set-password?token=<valid>` renders the form with `<meta name="referrer" content="no-referrer">`; bogus token → "no longer valid"; redeem → 200 `{ type: "reset" }`, second redeem → `TOKEN_INVALID`; NextAuth credentials sign-in with the new password → session (`mustChangePassword: false`). Smoke user removed from `dev.db`.
- **AC 7 — pending Tommy**: production smoke on `https://blogs.dreyer-travels.de` after deploy (mail from `system@blogs.dreyer-travels.de` in the account's language, link sets password, sign-in works). Requires production `NEXTAUTH_URL=https://blogs.dreyer-travels.de`.
- **Known limits (not fixed here)**: a reset does not end JWT sessions already open in other browsers; `/sign-in` still distinguishes `ACCOUNT_NOT_FOUND` from `INVALID_CREDENTIALS` (pre-existing enumeration channel — follow-up); used/expired tokens are not purged.

- **Code review (2026-11-11)** applied 6 patches:
  - A failed send deletes its token, so retries aren't throttled.
  - Redeem pre-checks the token before running bcrypt.
  - `/forgot-password` uses translated validation texts (new keys `auth.resetEmailRequired` / `auth.resetEmailInvalid`).
  - The change-password route invalidates the user's outstanding account tokens.
  - New tests: creator-owned tokens, tampered `TOKEN_INVALID`, invalid `NEXTAUTH_URL`, empty email.
  - Verification: `npm test` 130 files / 1184 passed; typecheck clean.
  - Six items deferred to `deferred-work.md`.

### File List

- travelblogs/prisma/schema.prisma (modified)
- travelblogs/prisma/migrations/20261110062245_add_account_token/migration.sql (new)
- travelblogs/src/utils/account-token.ts (new)
- travelblogs/src/utils/password-reset.ts (new)
- travelblogs/src/app/api/password-resets/route.ts (new)
- travelblogs/src/app/api/account-tokens/redeem/route.ts (new)
- travelblogs/src/app/forgot-password/page.tsx (new)
- travelblogs/src/app/set-password/page.tsx (new)
- travelblogs/src/components/account/set-password-form.tsx (new)
- travelblogs/src/app/sign-in/page.tsx (modified)
- travelblogs/src/proxy.ts (modified)
- travelblogs/src/utils/i18n.ts (modified)
- travelblogs/README.md (modified)
- travelblogs/AGENTS.md (modified by `next dev`, generated block only)
- travelblogs/tests/api/users/account-token-model.test.ts (new)
- travelblogs/tests/utils/password-reset.test.ts (new)
- travelblogs/tests/api/auth/password-resets.test.ts (new)
- travelblogs/tests/api/auth/account-token-redeem.test.ts (new)
- travelblogs/tests/api/auth/proxy.test.ts (modified)
- travelblogs/tests/components/auth/forgot-password-page.test.tsx (new)
- travelblogs/tests/components/auth/set-password-form.test.tsx (new)
- travelblogs/tests/components/auth/set-password-page.test.tsx (new)
- travelblogs/tests/components/sign-in-page.test.tsx (modified)
- travelblogs/src/app/api/users/[id]/password/route.ts (modified, review)
- travelblogs/tests/api/users/change-password.test.ts (modified, review)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)
- _bmad-output/implementation-artifacts/18-2-password-reset-by-email.md (modified)

### Change Log

- 2026-11-11: Code review: 6 patches applied, 6 items deferred. Status → done.
- 2026-11-10: Implemented Story 18.2 — AccountToken table, password reset request/redeem APIs, /forgot-password and /set-password pages, sign-in link and success notice, EN/DE strings and mails, proxy allowances, README. Status → review.
