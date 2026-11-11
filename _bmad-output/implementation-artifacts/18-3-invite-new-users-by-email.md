---
baseline_commit: 88d2ff431623fe85caa7791685dab943071a0635
---

# Story 18.3: Invite New Users by Email

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an administrator,
I want to create an account by entering only name, email, role and language,
so that the new user chooses their own password and I never handle it.

**FRs covered:** FR42 (create by invitation), FR43 (resend invitation); FR1 now runs through FR42. **NFR:** "Mail-sending flows never write passwords, tokens, links or message bodies to logs." (PRD → Security).
**Origin:** Tommy with John (PM), 2026-11-09 — [sprint-change-proposal-2026-11-09.md](../planning-artifacts/sprint-change-proposal-2026-11-09.md). That proposal says the existing admin create path (Epic 5) is **superseded** by this story, not reopened.
**Builds on:**
- Story 18.1 (done): `src/utils/email.ts` (`sendEmail`, `describeSendFailure`, outbox) and `User.preferredLanguage`.
- Story 18.2 (done): the `AccountToken` table (type `invite` already exists, 7-day TTL already set), `src/utils/account-token.ts`, `/set-password`, `SetPasswordForm` and `POST /api/account-tokens/redeem`.

This story adds no new token mechanics. It adds a pending state on `User`, the invitation mail, a resend endpoint, and the admin UI changes.

## Acceptance Criteria

1. **Create without password.** **Given** I am an administrator (or the creator) on `/admin/users`, **then** the create form has email, name, role and language (default German) and **no password field**. **When** I save, **then** `POST /api/users` creates the user with `invitationPending: true`, `mustChangePassword: false`, the email stored **trimmed and lowercased**, and an unusable random password hash. **And** exactly one invitation mail is sent, awaited, in the chosen language, containing `${NEXTAUTH_URL}/set-password?token=<raw>` (a 7-day `invite` token). **And** the response is `201 { data: { …user, invitationPending: true, invitationSent: true }, error: null }`. A request body that contains `password` (or any unknown key) → `400 VALIDATION_ERROR`, no user is created and no mail is sent.
2. **Accept the invitation.** **Given** I open the invitation link within 7 days, **then** `/set-password` shows the form under an invitation heading ("Welcome to TravelBlogs" / "Choose a password for your account"). **When** I enter a password (min. 8 characters) twice, **then** the password is set, `invitationPending` becomes `false`, the token is consumed (as are all my other unused tokens, per 18.2), and I am sent to `/sign-in?invitationAccepted=1`, which shows "Your account is ready. Sign in with your email and new password." **And** before that, `validateCredentials` rejects the account with `INVALID_CREDENTIALS` for **any** password, without running `compare`.
3. **Visible and resendable.** **Given** an account with `invitationPending: true`, **then** `GET /api/users` returns `invitationPending: true` for it and the admin list shows an "Invitation pending" badge on the row. **And** if the account is also active, the row has a "Resend invitation" button. Clicking it calls `POST /api/users/[id]/invitations`, which sends a new mail in the user's current `preferredLanguage`. **Only after** that send succeeds are all of the user's earlier unused `invite` tokens invalidated, so the old link stops working. The response is `201 { data: { invitationSent: true }, error: null }` and the row shows "Invitation sent." Resend for a user who is not pending → `409 INVITATION_NOT_PENDING`. For an inactive user → `409 USER_INACTIVE`. For the creator account (`id === "creator"` or `CREATOR_EMAIL`) → `403 FORBIDDEN`. Unknown id → `404 NOT_FOUND`. Not admin → `401`/`403` as in `POST /api/users`.
4. **Send failure is visible to the admin.** **Given** the invitation mail cannot be sent on **create** (SMTP error or `NEXTAUTH_URL` missing or invalid), **then** the user still exists with `invitationPending: true` and **no** usable invite token (the token created for the failed send is deleted). The response is `201` with `invitationSent: false`. The form shows a warning ("The user was created, but the invitation email could not be sent. Use 'Resend invitation' in the list."), and the new row shows the pending badge and the resend button. **Given** a **resend** fails, **then** the response is `502 INVITATION_NOT_SENT`, the earlier invite link **stays valid**, the new token is deleted, and the row shows the error. In both cases exactly one log line is written: a fixed prefix plus `describeSendFailure(error)`. It never contains the address, token, link, body or name.
5. **Existing accounts unaffected.** **Given** the migration has run, **then** every existing row has `invitationPending = false` and signs in exactly as before. The env-managed creator (`ensureDefaultCreator`) is created with `invitationPending = false`. `countActiveAdmins` does **not** count pending administrators, because a pending admin cannot sign in yet and must not satisfy the last-admin guard.
6. **Bilingual.** All new UI strings and both invitation mail texts exist in English and German, and the i18n parity test stays green. Admin UI strings keep the admin catalog's "Sie". Strings the invitee sees (mail, set-password heading, sign-in notice) use "du", like 18.2.
7. **Production acceptance (Tommy, manual).** After deploying, invite a test address on `https://blogs.dreyer-travels.de`. Check that the mail arrives from `system@blogs.dreyer-travels.de` in the chosen language, the link sets a password, and sign-in works. Check that the list shows "Invitation pending" before acceptance and not after. (Sprint change proposal, success criteria: "a real invitation arrives … and completes end to end in production.")

**Out of scope:**
- Trip-access mails (18.4).
- Converting existing accounts that still carry an admin-set temporary password (`mustChangePassword` stays and is removed in a later cleanup).
- A data migration that lowercases existing stored emails (the deferred item stays open for existing rows; this story only lowercases on write).
- An "invitation expires on …" date in the list.
- Purging expired tokens.
- Changing the email address of an existing user. There is no such UI today.

## Tasks / Subtasks

- [x] **Task 1: Pending state on `User`** (AC: 1, 2, 5)
  - [x] `prisma/schema.prisma`: add `invitationPending Boolean @default(false)` to `User`, next to `mustChangePassword`.
  - [x] Migration `npx prisma migrate dev --name add_user_invitation_pending --create-only`, then **hand-write** the SQL exactly as 18.1 did. If Prisma generates a `new_User` rebuild, replace it with:
    ```sql
    -- Story 18.3: accounts created by invitation cannot sign in until the invitee sets a password.
    -- Hand-written ALTER instead of Prisma's table rebuild: existing rows (and their TripAccess /
    -- AccountToken foreign keys) stay untouched and read false.
    ALTER TABLE "User" ADD COLUMN "invitationPending" BOOLEAN NOT NULL DEFAULT false;
    ```
    Then `npx prisma migrate dev` to apply it, `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script` must be empty, and `npx prisma generate`.
  - [x] Extend `tests/api/users/user-model.test.ts`: a new user defaults to `invitationPending: false`.
- [x] **Task 2: Sign-in rejects pending accounts** (AC: 2, 5) — `src/utils/auth.ts`
  - [x] In `validateCredentials`, after the `!user.isActive` check and **before** `compare`, add: `if (user.invitationPending) return { success: false, errorCode: "INVALID_CREDENTIALS", message: "Invalid email or password." }`. No new error code. The sign-in page already maps `INVALID_CREDENTIALS`, and a new code would add one more enumeration signal.
  - [x] The creator branch above it is unaffected (env password wins, creator row is never pending).
  - [x] Tests (extend `tests/api/auth/credentials.test.ts`): a pending user with the *correct* password → `INVALID_CREDENTIALS`. The same user after `invitationPending: false` → success.
- [x] **Task 3: Redeeming clears the pending state** (AC: 2) — `src/utils/account-token.ts`
  - [x] In `redeemAccountToken`'s transaction, change the user update to `data: { passwordHash, mustChangePassword: false, invitationPending: false }`. Do this for **both** token types. A pending user who uses "Forgot password?" proves the same mailbox and ends up active too. That is intended, and it is the self-service path for an expired invitation (see *Dev Notes → Expired invitation*).
  - [x] Move the private `buildSetPasswordUrl(raw)` from `src/utils/password-reset.ts` into `account-token.ts` as an export (returns `string | null`; null when `NEXTAUTH_URL` is unset or invalid). Make `password-reset.ts` import it. Its behavior and tests stay unchanged.
  - [x] Extend `tests/api/auth/account-token-redeem.test.ts`: an `invite` token for a pending user → 200 `{ type: "invite" }`, `invitationPending` false, `compare(password, passwordHash)` true. A `reset` token for a pending user also clears `invitationPending`.
- [x] **Task 4: `src/utils/invitation.ts`** (AC: 1, 3, 4) — the shared send used by create and resend
  - [x] `sendInvitation(user: { id; email; name; preferredLanguage }): Promise<{ sent: boolean }>`:
    1. If `buildSetPasswordUrl("probe") === null`, log `console.error("invitation: NEXTAUTH_URL not set; invitation mail not sent")` and return `{ sent: false }` **before** creating a token.
    2. `const raw = await createAccountToken(user.id, "invite")`, then `link = buildSetPasswordUrl(raw)`.
    3. `await sendEmail({ to: user.email, subject: getTranslation("email.invitation.subject", locale), text: getTranslation("email.invitation.body", locale).replace("{{name}}", user.name).replace("{{url}}", link) })`.
    4. On success: `prisma.accountToken.updateMany({ where: { userId: user.id, type: "invite", usedAt: null, tokenHash: { not: hashAccountToken(raw) } }, data: { usedAt: new Date() } })`, which invalidates earlier invitation links only **after** the new mail is out. Return `{ sent: true }`.
    5. On a send error: `deleteMany({ where: { tokenHash: hashAccountToken(raw) } }).catch(() => undefined)`, then `console.error("invitation: invitation mail not sent", describeSendFailure(error))` and return `{ sent: false }`. **Do not rethrow.** Both callers turn `sent: false` into a response.
  - [x] Prisma errors in step 2 (token create) may throw. The routes' outer `try/catch` → 500 handles them. Make sure that path logs no body (see Task 5).
  - [x] Never log `user.email`, `user.name`, `raw`, `link` or the text.
- [x] **Task 5: `POST /api/users` creates by invitation** (AC: 1, 4, 5) — `src/app/api/users/route.ts`
  - [x] Schema: drop `password` and make it `.strict()`, so a `password` key → `400 VALIDATION_ERROR`. Keep the existing messages. Normalize the email: `z.string().trim().min(1, …).email(…).transform((v) => v.toLowerCase())`. With Zod 4 the `.email()` check runs before the transform, which is fine.
  - [x] Duplicate check (`findUnique({ where: { email } })` → `409 DUPLICATE_USER`) uses the lowercased email, so a mixed-case duplicate of an existing lowercase account is caught.
  - [x] Password hash for the pending account: `await hash(randomBytes(32).toString("base64url"), 12)`. It is never shown or stored anywhere else. It exists only because `passwordHash` is `NOT NULL`, and it is a second barrier behind the `invitationPending` check.
  - [x] `prisma.user.create({ data: { email, name, role, passwordHash, invitationPending: true, mustChangePassword: false, preferredLanguage } })`, then `const { sent } = await sendInvitation(user)` (awaited, see *Dev Notes → Why create awaits*). Respond `201` with the existing user payload plus `invitationPending: user.invitationPending, invitationSent: sent`.
  - [x] `GET`: add `invitationPending` to the `select` and to each mapped item.
  - [x] The `catch` currently does `console.error("Failed to create user", error)`. A raw Prisma error can carry the email in `meta`. Change it to log `describeSendFailure(error)` (it redacts addresses) or only `{ code }`.
  - [x] `ensureDefaultCreator` stays unchanged. The default `false` covers it.
  - [x] `runtime = "nodejs"` is already set, which is required now that the route imports `email.ts`.
- [x] **Task 6: `POST /api/users/[id]/invitations`** — new `src/app/api/users/[id]/invitations/route.ts` (AC: 3, 4)
  - [x] `runtime = "nodejs"`. Copy `getAuthContext` / `requireAdmin` / `jsonError` from `src/app/api/users/[id]/route.ts`, which uses `isAdminUser`, so the creator and administrators are allowed, same as create. `params` is `Promise<{ id }> | { id }`, so `await` it.
  - [x] No request body is needed. Do not parse JSON.
  - [x] Load the user (`id, email, name, isActive, invitationPending, preferredLanguage`):
    - missing → `404 NOT_FOUND`
    - creator (`id === "creator"` or email equal to normalized `CREATOR_EMAIL`) → `403 FORBIDDEN "The creator account is managed in environment configuration."`
    - `!invitationPending` → `409 INVITATION_NOT_PENDING "This user has already accepted the invitation."`
    - `!isActive` → `409 USER_INACTIVE "Activate the user before resending the invitation."`
  - [x] `sendInvitation(user)`. Sent → `201 { data: { invitationSent: true }, error: null }`. Not sent → `502 INVITATION_NOT_SENT "The invitation email could not be sent."`.
  - [x] Unexpected error → `500 INTERNAL_SERVER_ERROR`, logged with a fixed text plus `describeSendFailure(error)`.
  - [x] No proxy change: `/api/*` is matched, but `isProtectedPath` lets every `/api/*` through to the handler's own auth, and admins are never must-change users here. Do **not** touch `src/proxy.ts` or its matcher snapshot.
- [x] **Task 7: Last-admin guard ignores pending admins** (AC: 5) — `src/app/api/users/admin-helpers.ts`
  - [x] Add `invitationPending: false` to the `where` of `countActiveAdmins`.
  - [x] Test (extend `tests/api/users/update-user-role.test.ts` or `delete-user.test.ts`): with one active admin plus one *pending* admin and no env creator, demoting or deleting the active admin → `403 "Cannot remove the last active admin."` / `"Cannot delete the last active admin."`.
- [x] **Task 8: Set-password and sign-in branch on the token type** (AC: 2) — closes the 18.2 deferred item "Set-password flow hard-codes reset wording"
  - [x] `src/app/set-password/page.tsx`: pass `headingKey={usable?.type === "invite" ? "auth.acceptInvitationTitle" : undefined}`. Optionally also pass a `descriptionKey` for a one-line subtitle (`auth.acceptInvitationDescription`).
  - [x] `src/components/account/set-password-form.tsx`: on 200, read `body.data.type` and go to `/sign-in?invitationAccepted=1` for `"invite"`, otherwise (default) to `/sign-in?passwordReset=1`. If the body cannot be parsed, fall back to `passwordReset=1`.
  - [x] The invalid-link state stays as it is (link to `/forgot-password`). For an expired invitation that path works, because a pending user is reset-eligible. Do not add per-type invalid states: the server cannot tell the type of an unknown token, and must not.
  - [x] `src/app/sign-in/page.tsx`: next to the `passwordReset` notice, show `auth.invitationAccepted` when `searchParams.get("invitationAccepted") === "1"`, using the same green box.
- [x] **Task 9: Admin UI** (AC: 1, 3, 4, 6)
  - [x] `src/components/admin/user-form.tsx`: remove the password state, field, validation and `FieldErrors.password`. `canSubmit` no longer needs a password. Keep the language selector (default `de`). Read `result.data.invitationSent`:
    - `true`: reset the fields and show a success note `admin.invitationSentTo` with `{{email}}` replaced (teal box, `role="status"`).
    - `false`: reset the fields and show the warning `admin.invitationCreatedNotSent` (amber box, `role="status"`).
    - Either way: `router.refresh()`.
    - Clear the note as soon as the admin types again.
    - Submit button labels: `admin.inviteUser` / `admin.invitingUser` ("Send invitation" / "Sending invitation…"), replacing `createUser` / `creatingUser` on the button only.
  - [x] `src/components/admin/users-dashboard.tsx`: replace `admin.setTemporaryPassword` with `admin.inviteUserDescription`. Add `invitationPending: boolean` to the item type.
  - [x] `src/app/admin/users/page.tsx`: add `invitationPending: boolean` to `UserListItem`.
  - [x] `src/components/admin/user-list.tsx`: add `invitationPending` to the item type.
    - When it is true, render an amber badge `admin.invitationPending` (`border-[#C58B2A]/30 bg-[#C58B2A]/10 text-[#8A5A12]` or similar; match the existing pill shape) **after** the active/inactive pill.
    - When it is true **and** `isActive`, render a "Resend invitation" pill button in the row's action area, next to "Edit". It sits outside the edit panel, because resending is the primary action for a pending row.
    - Add `resending: boolean` and `notice: string | null` to `UserListRow` (`notice` for "Invitation sent."), reusing `error` for failures. `isBusy` includes `resending`.
    - `handleResend(row)`: `POST /api/users/${row.id}/invitations`. On 201 set `notice: t("admin.invitationResent")`. On error show `result.error.message` mapped by code: `INVITATION_NOT_SENT` → `t("admin.invitationResendFailed")`, others → server message or `t("admin.invitationResendFailed")`.
    - Because `row.error` is currently only rendered inside the edit panel, render `error`/`notice` for the resend **under the row** even when the panel is closed (a small line under the article content).
  - [x] Remove now-unused i18n keys **only if** grep shows no other use: `admin.temporaryPassword`, `admin.setTemporaryPassword`, `admin.passwordRequired`, `admin.passwordMinLength`, `admin.atLeast8Characters`. Keep `account.temporaryPasswordMustUpdate`, which existing `mustChangePassword` accounts still need.
- [x] **Task 10: i18n** — `src/utils/i18n.ts`, EN and DE (AC: 6)
  - [x] `email.invitation.subject` and `email.invitation.body` (placeholders `{{name}}`, `{{url}}`). Suggested texts are in *Dev Notes → Mail text*.
  - [x] `auth.acceptInvitationTitle`, `auth.acceptInvitationDescription`, `auth.invitationAccepted`.
  - [x] `admin.inviteUser`, `admin.invitingUser`, `admin.inviteUserDescription`, `admin.invitationSentTo`, `admin.invitationCreatedNotSent`, `admin.invitationPending`, `admin.resendInvitation`, `admin.resendingInvitation`, `admin.invitationResent`, `admin.invitationResendFailed`.
  - [x] Check the manual text (`src/components/manual/manual-content.tsx`, keys `manual.*`/`admin.createUserAccountsDesc`): if any string tells admins to set a temporary password, reword it to the invitation flow in both languages.
- [x] **Task 11: Tests** (AC: 1–6)
  - [x] `tests/api/users/create-user.test.ts` (existing; uses `getToken` mock and a per-file DB):
    - Update the existing cases: no `password` in bodies.
    - The "short password" case becomes "password key rejected → 400, no user, empty outbox".
    - New cases. Use `clearEmailOutbox()` in `beforeEach`, `vi.stubEnv("NEXTAUTH_URL", "https://blogs.example.test")` and `vi.unstubAllEnvs()` in `afterEach`.
      - `de` create → 201, `invitationPending: true`, `invitationSent: true`, `mustChangePassword: false`. Exactly one outbox mail with the German subject and `to` = the lowercased email. The body contains the name and `https://blogs.example.test/set-password?token=` plus 43 base64url characters. `hashAccountToken(token)` exists with `type: "invite"` and `expiresAt ≈ now + 7 d`.
      - `en` → English mail.
      - `"  New.Viewer@Example.com "` is stored as `new.viewer@example.com`, and a second create with `NEW.VIEWER@example.com` → 409.
      - `NEXTAUTH_URL` unset → 201 `invitationSent: false`, user exists, no token row, empty outbox.
      - The new user cannot sign in: `validateCredentials(email, anything)` → `INVALID_CREDENTIALS`.
  - [x] **Transport failure** (new file `tests/api/users/create-user-mail-failure.test.ts`, using the `vi.resetModules()` + `vi.doMock` pattern from *Testing notes*). Make `sendEmail` reject with `Error("550 5.1.1 <new.viewer@example.com> unknown")` and keep the real `describeSendFailure` from `importOriginal`.
    - Create → 201 `invitationSent: false`, user exists and is pending, no invite token row is left.
    - `console.error` is called once, and its serialized args contain neither the address, the name, `set-password`, `token=`, nor any 43-character base64url run.
    - Resend in the same file: with an existing usable invite token, a failed resend → 502 `INVITATION_NOT_SENT`, and the old token is still unused and unexpired.
  - [x] `tests/api/users/resend-invitation.test.ts`:
    - Success → 201, one mail in the user's **current** language (change it first). The previous invite token now has `usedAt` set, the new one is usable, and an unrelated `reset` token of the same user is untouched.
    - Redeeming the old raw token → `{ ok: false }`.
    - Not pending → 409 `INVITATION_NOT_PENDING`.
    - Inactive → 409 `USER_INACTIVE`.
    - Creator → 403.
    - Unknown → 404.
    - No session → 401. Viewer → 403.
    - An expired invite token (`expiresAt` in the past) is rejected by redeem.
  - [x] End-to-end at util level (in `resend-invitation.test.ts` or a new `tests/utils/invitation.test.ts`): create via route, read the token from the outbox body, `redeemAccountToken(token, "Password123")` → `{ ok: true, type: "invite" }`. Then `validateCredentials` succeeds with `Password123`, and the user has `invitationPending: false`.
  - [x] Components (Testing Library, mocked `fetch`):
    - `tests/components/admin/user-form.test.tsx`:
      - The form renders no password field.
      - The posted body has no `password` and has `preferredLanguage`.
      - `invitationSent: true` → success note with the email.
      - `false` → warning.
      - 409 → error.
    - `tests/components/admin/user-list.test.tsx`:
      - The pending badge shows for pending users only.
      - The resend button shows only when pending and active.
      - It posts to `/api/users/<id>/invitations` and shows "Invitation sent." on 201.
      - It shows the failure message on 502.
    - `tests/components/auth/set-password-form.test.tsx`: `{ data: { type: "invite" } }` → `router.replace("/sign-in?invitationAccepted=1")`, `reset` still → `passwordReset=1`.
    - `set-password-page.test.tsx`: an invite token renders the invitation heading.
    - `tests/components/sign-in-page.test.tsx`: `?invitationAccepted=1` notice.
    - `users-dashboard.test.tsx` / `users-page.test.tsx`: update any assertion on the temporary-password text.
  - [x] i18n parity test green.
- [x] **Task 12: Docs** — `travelblogs/README.md` "Outgoing email" section: one paragraph saying that new users are invited by mail (link valid 7 days, resend from the admin list), that an invitee whose link expired can also use "Forgot password?", and the AC 7 smoke test as the post-deploy check.
- [x] **Task 13: Verification**
  - [x] `npm test`, `npm run typecheck`, `npm run lint` (2 pre-existing errors allowed: `trips-restore-dashboard.tsx`, `zip-stream.d.ts`; none in touched files), `npm run build`, `npm run audit` (no new dependencies expected).
  - [x] Local smoke in dev:
    - Invite a user, then take the link from the outbox (temporary log you remove, or a test).
    - Check that the list shows pending and that resend works.
    - Check that the old link is now invalid.
    - Accept the invitation and sign in.
    - Check that the badge is gone.
    - Remove the smoke user.
  - [x] Leave AC 7 open in Completion Notes as "pending Tommy".

### Review Findings

- [x] [Review][Patch] Concurrent resends invalidate each other's tokens: both mails go out, but neither link works. The cleanup `updateMany` should only invalidate invite tokens created before the new one (for example `createdAt: { lt: <new token createdAt> }`). A test should cover this. [travelblogs/src/utils/invitation.ts:54]
- [x] [Review][Patch] A Prisma error after `user.create` (when creating the token, or in the post-send `updateMany`) makes `POST /api/users` return 500 "Unable to create user" although the user exists, so a retry gives 409. Resend also returns 500 after the mail is already out. Fix: in `sendInvitation`, catch a failing post-send `updateMany`, log one safe line and still return `{ sent: true }`. In the create route, catch errors from `sendInvitation` and answer 201 `invitationSent: false`. [travelblogs/src/app/api/users/route.ts:229]
- [x] [Review][Patch] A resend that races the invitee's acceptance leaves a usable 7-day `invite` token on an account that is already active. `findUsableAccountToken` and `redeemAccountToken` should reject an `invite` token when the user is no longer `invitationPending`. [travelblogs/src/utils/account-token.ts]
- [x] [Review][Patch] `POST /api/users` does not refuse the `CREATOR_EMAIL` address. That address is matched case-insensitively elsewhere, so the invitee gets a link that can never work. If the creator row does not exist yet, a later `ensureDefaultCreator` hits P2002. Fix: return 409 `DUPLICATE_USER` when the normalized email equals the normalized `CREATOR_EMAIL`. [travelblogs/src/app/api/users/route.ts:203]
- [x] [Review][Patch] The Delete, Confirm and role controls (and the `handleDelete` / `handleSave` guards) check `saving || deleting` instead of `isBusy`, so they stay enabled while a resend is running. [travelblogs/src/components/admin/user-list.tsx:462]
- [x] [Review][Patch] Resend errors `INVITATION_NOT_PENDING` and `USER_INACTIVE` show the server's English message (not translated), and the row keeps a stale badge and button. Map these codes to admin i18n keys (EN/DE) and call `router.refresh()` on a 409. [travelblogs/src/components/admin/user-list.tsx:332]
- [x] [Review][Patch] The "Invitation sent." notice never clears. It survives later role, language and status actions on that row. Clear `notice` when any other row action starts. [travelblogs/src/components/admin/user-list.tsx:341]
- [x] [Review][Patch] The password-reset mail still uses a string replacement for `{{url}}`. Use a function replacement, as `invitation.ts` does. [travelblogs/src/utils/password-reset.ts:59]
- [x] [Review][Patch] The DE string `admin.invitationCreatedNotSent` opens with `„` but closes with an ASCII `"`. It should close with `“`. [travelblogs/src/utils/i18n.ts]
- [x] [Review][Patch] The pending-admin last-admin test covers only demotion. Add the delete (and deactivate) case. [travelblogs/tests/api/users/update-user-role.test.ts]
- [x] [Review][Defer] Sign-in timing reveals pending accounts: the pending branch returns before bcrypt `compare` runs. [travelblogs/src/utils/auth.ts] — deferred. The existing `ACCOUNT_NOT_FOUND` / `INVALID_CREDENTIALS` split already reveals which accounts exist, so this should be fixed together with that.

## Dev Notes

### Decision: explicit flag, not a nullable `passwordHash`

The epic leaves this to the story. **Use `invitationPending Boolean @default(false)` plus a random unusable hash.**

- SQLite cannot change a column from `NOT NULL` to nullable in place. Making `passwordHash` nullable forces Prisma's `new_User` table rebuild, which is exactly what 18.1 hand-wrote around to keep `User`, `TripAccess` and now `AccountToken` foreign keys untouched. A new flag is a one-line `ALTER TABLE … ADD COLUMN`.
- A nullable hash would change the type at every `compare(…, user.passwordHash)` site (`auth.ts:113`, `users/[id]/password/route.ts:98`) and in tests.
- The admin list needs a flag to show anyway, and an explicit check in `validateCredentials` is easier to read and test than a null hash.
- Defense in depth: even if a future code path forgot the flag check, the stored hash is bcrypt of 32 random bytes nobody has ever seen.

The flag is **not** `isActive`. Deactivation stays a separate admin decision. A deactivated pending user cannot accept (`isTokenEligibleUser` requires `isActive`) and cannot be resent to (409). Reactivating them brings the resend button back.

### What exists today (read before changing)

- **`src/app/api/users/route.ts`**
  - POST: zod schema with `password` (`.trim().min(8)`), hashes it, sets `mustChangePassword: true`, stores the email **without lowercasing** (deferred item from 18.2, half-fixed here).
  - GET: `select` + map, consumed by `src/app/admin/users/page.tsx` via a server-side `fetch` with the cookie.
  - `ensureDefaultCreator` creates the creator row lazily on GET.
  - Auth: `isAdminUser` (creator or administrator).
- **`src/app/api/users/[id]/route.ts`** (PATCH role/language, DELETE) and **`[id]/status/route.ts`** (PATCH isActive, administrator only). Both are unchanged. The new `[id]/invitations/route.ts` copies their helper pattern. Note that `status` uses `requireAdministrator` (role must be `administrator`) while `[id]/route.ts` uses `isAdminUser`. Resend follows **create** (`isAdminUser`).
- **`src/utils/account-token.ts`** (18.2)
  - `createAccountToken(userId, type)` → raw. The TTL comes from `ACCOUNT_TOKEN_TTL_MS` (`invite` = 7 d, already there).
  - `isTokenEligibleUser` = active and not creator.
  - `findUsableAccountToken` returns `{ id, userId, type }`.
  - `redeemAccountToken` → `{ ok: true, type } | { ok: false }`. It already invalidates **all** other unused tokens of the user after a successful redeem, so accepting an invitation also kills stray reset links.
  - The only change here: add `invitationPending: false` to the user update, and export `buildSetPasswordUrl`.
- **`src/utils/password-reset.ts`**: the reference for the send-then-clean-up-on-failure pattern (`deleteMany` the just-created token if `sendEmail` throws). Copy that shape. Do **not** copy the 5-minute throttle; resend is admin-only.
- **`src/utils/email.ts`**: `sendEmail({ to, subject, text })` throws on failure. `describeSendFailure(error)` → `{ code, responseCode, message }` with addresses redacted (safe for Prisma errors too). Outbox in non-production: `getEmailOutbox()` / `clearEmailOutbox()`.
- **`src/components/account/set-password-form.tsx`**: already takes `headingKey`. Its success redirect is hard-coded to `passwordReset=1` (the deferred item this story closes). The redeem route already returns `{ data: { type } }`.
- **`src/components/admin/user-list.tsx`**:
  - Per-row optimistic state (`UserListRow` with `saving`, `savingLanguage`, `deleting`, `error`). `useEffect` rebuilds rows when `users` changes after `router.refresh()`.
  - The row header shows role, active and language pills plus an "Edit" button.
  - `row.error` is only rendered **inside** the edit panel, so render resend feedback outside it.
  - The self row is locked for role, status and delete. Resend is not relevant for self, because the admin is not pending.
- **`src/components/admin/user-form.tsx`**: client form that posts JSON, resets its fields and calls `router.refresh()` on success. Shows `result.error.message` from the server on failure. Language select defaults to `de`.
- **DE tone**: the admin catalog uses "Sie" (`admin.setTemporaryPassword` "Legen Sie …"). Keep new `admin.*` strings in "Sie". Invitee-facing strings (`auth.*`, `email.*`) use "du", as 18.2 did.
- **Privacy policy** already lists "invitations to set up an account" in the Email section (`i18n.ts` ~line 499). No change.
- **Proxy**: `/set-password` and `POST /api/account-tokens/redeem` are already public (18.2). No proxy change in this story.

### Why create awaits the send

Password reset answers before doing anything, to prevent enumeration and timing leaks. Here only an authenticated admin reaches the route, the admin already knows the address, and AC 4 requires the admin to *see* the failure. So `POST /api/users` awaits `sendInvitation`. SMTP timeouts are 15 s per phase (18.1), which bounds the wait. Do not hold a DB transaction across the send. The user row is committed first, so a slow or failed SMTP never loses the account.

### Order of operations in a resend

Create the new token → send → **then** invalidate the older invite tokens. If the send fails, delete the new token and leave the old link alone. The invitee still has a working link, and the admin can retry. AC 3's "invalidates the previous link" applies to a *successful* resend. Invalidating first would leave the user with no working link after a failed resend.

### Expired invitation

`/set-password` with an expired token shows "This link is no longer valid" plus "Request a new link" → `/forgot-password`. A pending user is active and not the creator, so `requestPasswordReset` sends them a 1-hour reset link. Redeeming that link clears `invitationPending` (Task 3). So the invitee can recover alone, and the admin can still resend. No new page is needed. Mention it in the README paragraph.

### Mail text (suggested; Tommy may reword)

- **EN subject:** `You're invited to TravelBlogs`
- **EN body:**
  ```
  Hello {{name}},

  an account has been created for you on TravelBlogs. Open this link within 7 days to choose your password:

  {{url}}

  Then sign in with this email address and your new password.

  If you did not expect this invitation, you can ignore this email.
  ```
- **DE subject:** `Einladung zu TravelBlogs`
- **DE body:**
  ```
  Hallo {{name}},

  für dich wurde ein Konto bei TravelBlogs angelegt. Öffne diesen Link innerhalb von 7 Tagen, um dein Passwort zu wählen:

  {{url}}

  Danach meldest du dich mit dieser E-Mail-Adresse und deinem neuen Passwort an.

  Falls du diese Einladung nicht erwartet hast, kannst du diese E-Mail ignorieren.
  ```
- Name: `user.name` is free text typed by an admin. In a plain-text mail no escaping is needed. `.replace` with a string pattern does interpret `$&` and similar sequences in the **replacement**, so pass a function: `.replace("{{name}}", () => user.name)`. Do the same for `{{url}}` for symmetry.

### Suggested UI strings

| key | EN | DE |
|---|---|---|
| `admin.inviteUserDescription` | We'll email them a link to choose their own password. | Die Person erhält per E-Mail einen Link, um ihr eigenes Passwort zu wählen. |
| `admin.inviteUser` / `admin.invitingUser` | Send invitation / Sending invitation… | Einladung senden / Einladung wird gesendet… |
| `admin.invitationSentTo` | Invitation sent to {{email}}. | Einladung an {{email}} gesendet. |
| `admin.invitationCreatedNotSent` | The user was created, but the invitation email could not be sent. Use "Resend invitation" in the list. | Der Benutzer wurde angelegt, aber die Einladungs-E-Mail konnte nicht gesendet werden. Verwenden Sie „Einladung erneut senden" in der Liste. |
| `admin.invitationPending` | Invitation pending | Einladung ausstehend |
| `admin.resendInvitation` / `admin.resendingInvitation` | Resend invitation / Sending… | Einladung erneut senden / Wird gesendet… |
| `admin.invitationResent` | Invitation sent. | Einladung gesendet. |
| `admin.invitationResendFailed` | The invitation email could not be sent. Try again later. | Die Einladungs-E-Mail konnte nicht gesendet werden. Versuchen Sie es später erneut. |
| `auth.acceptInvitationTitle` | Welcome to TravelBlogs | Willkommen bei TravelBlogs |
| `auth.acceptInvitationDescription` | Choose a password for your account. | Wähle ein Passwort für dein Konto. |
| `auth.invitationAccepted` | Your account is ready. Sign in with your email and new password. | Dein Konto ist bereit. Melde dich mit deiner E-Mail-Adresse und deinem neuen Passwort an. |

### Known limits (state them in Completion Notes, do not fix here)

- Existing mixed-case emails in the DB are not lowercased. New ones are.
- Accounts created before this story keep their admin-set temporary password and `mustChangePassword` flow.
- The sign-in page's pre-existing `ACCOUNT_NOT_FOUND` vs `INVALID_CREDENTIALS` distinction is unchanged. Pending accounts deliberately report `INVALID_CREDENTIALS`.

### Testing notes

- Route/DB tests: per-file SQLite DB (`file:./prisma/test-<name>.db`), `execSync("npx prisma migrate deploy")`, `PrismaBetterSqlite3` adapter, dynamic `import()` of the route **after** setting `DATABASE_URL`. Copy `tests/api/users/create-user.test.ts`. `getToken` is mocked via `vi.hoisted` + `vi.mock("next-auth/jwt")`. Use a **distinct DB filename** per new test file.
- `vi.stubEnv` + `vi.unstubAllEnvs()` in `afterEach` (see `tests/utils/password-reset.test.ts`). Vitest runs with `NODE_ENV=test`, which means outbox, never SMTP.
- Mail-failure tests: copy the second `describe` of `tests/api/auth/password-resets.test.ts` (~line 79). It uses `vi.resetModules()` + `vi.doMock("…/src/utils/email", async (importOriginal) => ({ ...original, sendEmail: vi.fn().mockRejectedValue(Object.assign(new Error("550 5.1.1 <…> unknown"), { code: "EENVELOPE", responseCode: 550 })) }))`, then its own DB file and dynamic imports, and `vi.doUnmock` in `afterAll`. That pattern also lets the failure cases live in the same file as the happy path if you prefer.
- Credential checks: `tests/api/auth/credentials.test.ts` is where `validateCredentials` is tested (Task 2).
- The full suite has pre-existing 5 s timeout flakes under load (`change-password`, `backfill-image-compression`, `edit-trip-page-map`). Re-run alone before calling a failure a regression.

### Project Structure Notes

- New files:
  - `prisma/migrations/<ts>_add_user_invitation_pending/migration.sql`
  - `src/utils/invitation.ts`
  - `src/app/api/users/[id]/invitations/route.ts`
  - `tests/api/users/resend-invitation.test.ts`
  - `tests/api/users/create-user-mail-failure.test.ts`
  - optionally `tests/utils/invitation.test.ts`
- Modified:
  - `prisma/schema.prisma`
  - `src/utils/auth.ts`, `src/utils/account-token.ts`, `src/utils/password-reset.ts` (import only), `src/utils/i18n.ts`
  - `src/app/api/users/route.ts`, `src/app/api/users/admin-helpers.ts`
  - `src/app/admin/users/page.tsx`
  - `src/components/admin/{user-form,user-list,users-dashboard}.tsx`
  - `src/app/set-password/page.tsx`, `src/components/account/set-password-form.tsx`, `src/app/sign-in/page.tsx`
  - `README.md`, possibly `src/components/manual/manual-content.tsx`
  - related tests
- REST: `POST /api/users/[id]/invitations` (plural sub-resource: "create a new invitation for this user"). `utils/` not `lib/`, kebab-case files, central tests, `{ data, error }` envelope, camelCase JSON.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 18.3]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-11-09.md] — FR42/FR43, the 7-day expiry, hash-only storage, "admin-typed password goes away for new accounts", production success criterion
- [Source: _bmad-output/implementation-artifacts/18-2-password-reset-by-email.md] — token table, redeem semantics, set-password page, send-failure cleanup, test patterns
- [Source: _bmad-output/implementation-artifacts/18-1-email-transport-and-preferred-language.md] — hand-written `ALTER TABLE` migration, `describeSendFailure`
- [Source: _bmad-output/implementation-artifacts/deferred-work.md#Deferred from: code review of 18-2] — set-password type branching (closed here), email lowercasing (half-closed: on write)
- [Source: _bmad-output/project-context.md] — Next 16.4.5, Zod 4.6.7, Prisma 7.10, `utils/`, bilingual strings, envelope
- [Source: travelblogs/src/app/api/users/route.ts, src/app/api/users/[id]/route.ts, src/app/api/users/admin-helpers.ts, src/utils/auth.ts, src/utils/account-token.ts, src/utils/password-reset.ts, src/components/admin/user-form.tsx, src/components/admin/user-list.tsx, src/components/account/set-password-form.tsx]

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (claude-opus-5-5)

### Debug Log References

- `prisma migrate dev --create-only` generated a `new_User` table rebuild; replaced with the hand-written `ALTER TABLE … ADD COLUMN` from the story. `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` → "This is an empty migration." (Prisma 7 renamed the flags from the story's `--from-migrations … --to-schema-datamodel`.)
- Full suite: 132 files, 1222 passed / 1 skipped. `npm run typecheck` clean. `npm run lint`: only the 2 pre-existing errors (`trips-restore-dashboard.tsx`, `zip-stream.d.ts`), none in touched files. `npm run build` succeeds (route `/api/users/[id]/invitations` listed). `npm run audit`: 0 vulnerabilities.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created (2026-11-11).
- **Pending state:** `User.invitationPending Boolean @default(false)` via a hand-written `ALTER TABLE` migration (`20261111160149_add_user_invitation_pending`). Existing rows and the env creator read `false`.
- **Sign-in:** `validateCredentials` returns `INVALID_CREDENTIALS` for a pending account before `compare` runs. Pending accounts also carry a bcrypt hash of 32 random bytes nobody has seen.
- **Redeem:** `redeemAccountToken` clears `invitationPending` for both token types, so "Forgot password?" also finishes an expired invitation. `buildSetPasswordUrl` moved to `account-token.ts` and is imported by `password-reset.ts`.
- **`src/utils/invitation.ts`:** `sendInvitation` checks `NEXTAUTH_URL` before creating a token, creates the 7-day `invite` token, sends (function replacements for `{{name}}`/`{{url}}`), and only after success invalidates the user's older unused invite tokens. On a send failure it deletes the new token, logs one fixed line plus `describeSendFailure`, and returns `{ sent: false }`.
- **`POST /api/users`:** strict schema without `password` (a `password` or any unknown key → 400), email trimmed and lowercased (duplicate check uses the lowercased value), awaited invitation send, response adds `invitationPending` and `invitationSent`. The catch logs `describeSendFailure(error)` instead of the raw error. `GET` returns `invitationPending`.
- **`POST /api/users/[id]/invitations`:** admin or creator only; 404 / 403 creator / 409 `INVITATION_NOT_PENDING` / 409 `USER_INACTIVE` / 502 `INVITATION_NOT_SENT` / 201 `{ invitationSent: true }`.
- **Last-admin guard:** `countActiveAdmins` ignores pending administrators.
- **Set-password / sign-in:** an `invite` token shows "Welcome to TravelBlogs" plus a subtitle (`descriptionKey` prop added to `SetPasswordForm`). After success the form reads `data.type` and goes to `/sign-in?invitationAccepted=1` for an invitation, otherwise (and if the body cannot be read) to `passwordReset=1`. The sign-in page shows the new notice. This closes the 18.2 deferred item about hard-coded reset wording.
- **Admin UI:** the form has no password field, and its button reads "Send invitation". After a create it shows a teal success note naming the address, or an amber warning if the mail was not sent. Either note clears as soon as the admin edits the form again. In the list, an amber "Invitation pending" badge sits after the status pill. Rows that are pending and active get a "Resend invitation" button. Resend feedback (a success notice or an error) is shown under the row while the edit panel is closed. The dashboard description now explains the invitation flow.
- **i18n:** all new EN/DE keys added (admin in "Sie", invitee-facing in "du"); removed the unused `admin.temporaryPassword`, `admin.setTemporaryPassword`, `admin.passwordRequired`, `admin.passwordMinLength`, `admin.atLeast8Characters`. `account.temporaryPasswordMustUpdate` kept. The manual text had no temporary-password wording, so it is unchanged. `admin.creatingUser` is now unused but was not on the removal list and is left in place.
- **Tests added:** credentials (pending rejected, accepted after clear); redeem (invite clears pending, reset clears pending); create-user (de/en mail with 43-char token and a 7-day invite row, lowercasing and mixed-case duplicate, `password` key or unknown key → 400 with no mail, missing `NEXTAUTH_URL` → `invitationSent: false` with no token, no sign-in while pending, list flag); `create-user-mail-failure.test.ts` (create → 201 `invitationSent: false` with no token left and one safe log line; failed resend → 502 with the old link still usable); `resend-invitation.test.ts` (success in the current language, old invite invalidated and reset token untouched, old raw token rejected, 409/409/403/404/401/403, creator may resend, 502 without `NEXTAUTH_URL`, expired token rejected, end-to-end create → mail → redeem → sign-in); last-admin with a pending admin; components (form, list, dashboard, set-password form and page, sign-in notice).
- **Local smoke:** done as the route-level end-to-end test in `resend-invitation.test.ts` (invite, resend, old link invalid, accept, sign in, `invitationPending` false), which the story allows instead of a temporary log. No interactive dev-server session was run.
- **Known limits (by design):** existing mixed-case emails are not lowercased (only new writes are). Accounts created before this story keep their admin-set temporary password and the `mustChangePassword` flow. The existing `ACCOUNT_NOT_FOUND` vs `INVALID_CREDENTIALS` distinction on sign-in is unchanged; pending accounts deliberately report `INVALID_CREDENTIALS`.
- **Deploy:** this build adds a migration, so production needs `npx prisma migrate deploy` before the service starts.
- **AC 7 (production acceptance): pending Tommy.**

### File List

- travelblogs/prisma/schema.prisma
- travelblogs/prisma/migrations/20261111160149_add_user_invitation_pending/migration.sql (new)
- travelblogs/src/utils/invitation.ts (new)
- travelblogs/src/utils/auth.ts
- travelblogs/src/utils/account-token.ts
- travelblogs/src/utils/password-reset.ts
- travelblogs/src/utils/i18n.ts
- travelblogs/src/app/api/users/route.ts
- travelblogs/src/app/api/users/admin-helpers.ts
- travelblogs/src/app/api/users/[id]/invitations/route.ts (new)
- travelblogs/src/app/admin/users/page.tsx
- travelblogs/src/app/set-password/page.tsx
- travelblogs/src/app/sign-in/page.tsx
- travelblogs/src/components/account/set-password-form.tsx
- travelblogs/src/components/admin/user-form.tsx
- travelblogs/src/components/admin/user-list.tsx
- travelblogs/src/components/admin/users-dashboard.tsx
- travelblogs/README.md
- travelblogs/tests/api/users/user-model.test.ts
- travelblogs/tests/api/users/create-user.test.ts
- travelblogs/tests/api/users/create-user-mail-failure.test.ts (new)
- travelblogs/tests/api/users/resend-invitation.test.ts (new)
- travelblogs/tests/api/users/update-user-role.test.ts
- travelblogs/tests/api/users/delete-user.test.ts
- travelblogs/tests/api/auth/credentials.test.ts
- travelblogs/tests/api/auth/account-token-redeem.test.ts
- travelblogs/tests/components/admin/user-form.test.tsx
- travelblogs/tests/components/admin/user-list.test.tsx
- travelblogs/tests/components/admin/users-dashboard.test.tsx
- travelblogs/tests/components/auth/set-password-form.test.tsx
- travelblogs/tests/components/auth/set-password-page.test.tsx
- travelblogs/tests/components/sign-in-page.test.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/18-3-invite-new-users-by-email.md

### Change Log

- 2026-11-11: Implemented Story 18.3 (invite new users by email): `invitationPending` flag and migration, invitation mail and resend endpoint, sign-in block for pending accounts, set-password/sign-in branching by token type, admin UI without password field, EN/DE strings, README. Status → review.
- 2026-11-11: Code review: 10 patches applied. Concurrent resends no longer invalidate each other (only older tokens, ties broken by id). Create answers 201 `invitationSent: false` when the send fails with a database error, and a failed cleanup after a sent mail still counts as sent. Invite tokens stop working once the invitation is accepted. `CREATOR_EMAIL` cannot be invited. Admin list: busy guards cover resend, 409 resend errors are translated and update the row, the notice clears on the next action. Reset mail uses a function replacement. DE quote fixed. Pending-admin delete test added. 1 item deferred (sign-in timing). Full suite 1233 passed / 1 skipped, typecheck clean, lint only the 2 pre-existing errors. Status → done.
