# Sprint Change Proposal - Email Foundation and Account Mails

**Date:** 2026-11-09
**Project:** TravelBlogs
**Submitted by:** John (Product Manager)
**Change Scope:** Moderate - New epic, PRD addition, deployment configuration change
**Status:** Approved by Tommy 2026-11-09; changes applied to PRD, epics.md and sprint-status.yaml
**Mode:** Batch

---

## 1. Issue Summary

### Problem Statement

TravelBlogs cannot send email. Every account-related task that would normally happen by mail runs through the operator by hand:

- A new account is created by an administrator who types a password and passes it on out of band; the user is then forced to change it on first sign-in (`mustChangePassword`).
- A user who forgets their password has no way to recover the account without the operator.
- A user who is added to a trip as viewer or contributor is not told about it.

### Context

Raised by Tommy on 2026-11-09 after Epic 17 shipped. The sister application TravelPlan solved outgoing mail in its Story 8.8 (SMTP via Strato, startup check, in-memory outbox outside production) and Story 9.3 (HTML mail). TravelBlogs reuses that proven approach rather than designing a new one.

An anonymous "subscribe to a trip, get mailed on new entries" feature was discussed in the same session and **deliberately dropped** by Tommy: it requires double opt-in, unsubscribe handling, a background sender, a definition of when an entry is "live" (entries have no draft state), and a privacy-policy extension for data of people without an account. It is not part of this proposal.

### Evidence

- `travelblogs/src` contains no mail transport; `nodemailer` is not a dependency.
- `src/app/api/users/route.ts` requires an admin-typed `password` and sets `mustChangePassword: true`.
- `prisma/schema.prisma` `User` has no language field; the UI language lives only in browser `localStorage`.
- `src/app/api/trips/[id]/viewers/route.ts` adds only existing, active users and sends nothing.

### Decisions Taken With Tommy (2026-11-09)

| Topic | Decision |
|---|---|
| Transport | Same as TravelPlan: Strato SMTP, `smtp.strato.de:465`, login `webmaster@dreyer-travels.de` |
| Sender | `TravelBlogs <system@blogs.dreyer-travels.de>`, an alias on the same mailbox (Tommy creates the alias at Strato) |
| Server | Same host as TravelPlan (`Travelblog`); port 465 to Strato is known to be reachable |
| Invitation | The admin enters name, email, role and language only. The system mails a link where the new user chooses their own password. The admin-typed password goes away for new accounts. |
| Mail language | Stored per user (`preferredLanguage`), chosen by the admin at creation, default **German**. Only affects UI strings in mails; blog content keeps the language it was written in. |
| Out of scope | Trip subscriptions / new-entry mails, contact form, HTML mail, digest mails |

---

## 2. Impact Analysis

### Epic Impact

- Epics 0–17: all complete, none affected. No reopening, no resequencing.
- **New Epic 18: Email Foundation and Account Mails** with four stories (Section 4).

### Story Impact

| Story | Effect |
|---|---|
| Existing admin user creation (Epic 5 area) | Behavior changes: no password field, invitation mail instead. Superseded by 18.3, not reopened. |
| Existing first-login password change (`mustChangePassword`) | Stays for accounts that already carry the flag; no new account sets it. Removal is a later cleanup, not part of this epic. |
| Existing viewer add (`POST /api/trips/[id]/viewers`) | Gains a notification mail (18.4); response and permissions unchanged. |
| Privacy policy (Story 17.2) | Gains an inventory section for outgoing mail (18.1). |

### Artifact Conflicts

- **PRD:** No conflict with goals. Missing requirements for mail-based account flows → add FR40–FR44 and one security NFR (Section 4).
- **Architecture / UX specs:** No formal documents exist in this project; nothing to update. Technical guidance lives in the stories.
- **`project-context.md`:** Note: the TravelPlan code lives in `src/lib/notifications/`; the TravelBlogs rule "use `utils/`, avoid adding `lib/`" applies, so the port goes to `src/utils/`.
- **Deployment:** Five new environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`) in `.env.example`, the README and the production systemd unit. They must be in the unit **before** the 18.1 build is deployed, or the server refuses to serve.
- **Privacy policy configuration:** One new required variable `SITE_PRIVACY_LEGAL_BASIS_EMAIL`. Following Story 17.2's rule, `/datenschutz` reverts to "not yet published" until it is set — intended, but a deploy-time step.

### Technical Impact

- New dependency `nodemailer` (v10.x, ships its own types; no `@types/nodemailer`).
- Prisma migration: `User.preferredLanguage` (`de` | `en`, default `de`) and a single-use token table for password-reset and invitation links.
- `src/instrumentation.ts` gains a startup SMTP check, placed before the existing data backfills and inside the existing `NEXT_RUNTIME === "nodejs"` guard.
- New public routes (forgot password, set password) must be added to the proxy's public allowlist.
- Links in mails are built from `NEXTAUTH_URL`.

---

## 3. Recommended Approach

**Selected:** Option 1 - Direct Adjustment: add Epic 18 to the existing plan.

**Rationale:**
- **Effort:** Medium. 18.1 is largely a port of TravelPlan's tested code; 18.2–18.4 are small flows on top. Estimated 13 story points.
- **Risk:** Low to medium. The risky parts (silent mail loss, secrets in logs, account enumeration, hanging requests) were already found and fixed in TravelPlan's Story 8.8 code review; this proposal carries those rules over as acceptance criteria. The new risk is the invitation flow replacing an existing admin path.
- **Timeline:** No impact on other work; nothing else is in flight.
- **Rejected alternatives:** Rollback does not apply. MVP review does not apply. A separate mail service (SendGrid etc.) was not considered: the Strato mailbox is already paid for and proven.

---

## 4. Detailed Change Proposals

### 4.1 PRD - `_bmad-output/planning-artifacts/prd.md`

**Header** - `**Last Updated:** 2026-01-28` → `**Last Updated:** 2026-11-09`

**Functional Requirements → new subsection after "Administration (Post‑MVP)":**

```markdown
### Account Mails (Extension)

- FR40: System can send email to account holders through a configured mail server; in development and tests mail is captured instead of sent. (Phase 4)
- FR41: Users can request a password-reset link by email from the sign-in page and set a new password through it. (Phase 4)
- FR42: Admin can create an account by entering name, email, role and language; the system emails an invitation link where the new user sets their own password. (Phase 4)
- FR43: Admin can resend an invitation to an account that has not yet set a password. (Phase 4)
- FR44: Users are notified by email when they are given access to a trip. (Phase 4)
```

**FR1** - unchanged wording; note added:
`- FR1: Admin can create user accounts. (Phase 2) — from Phase 4 via invitation email, see FR42.`

**Non-Functional Requirements → Security, append:**

```markdown
- Password-reset and invitation links are single-use, expire (reset: 1 hour, invitation: 7 days), and are stored only as a hash.
- Mail-sending flows never reveal whether an email address has an account, and never write passwords, tokens, links or message bodies to logs.
```

### 4.2 Epics - append to `_bmad-output/planning-artifacts/epics.md` after Epic 17

```markdown
## Epic 18: Email Foundation and Account Mails

Give TravelBlogs outgoing email and use it for the three account moments that today run through the operator by hand: recovering a password, joining the site, and being added to a trip.

**Business Value:** Users can onboard and recover their accounts on their own; the operator no longer creates, transmits or resets passwords.

**Dependencies:** Epic 5 (Roles and Contributor Access), Epic 17 (Privacy Policy). Reuses the transport proven in TravelPlan Story 8.8.

**Explicit Non-Goals:**
- No anonymous subscriptions or new-entry notifications (dropped 2026-11-09)
- No contact form
- No HTML mail, no attachments, no digests
- No mail for the environment-managed creator account (`CREATOR_EMAIL`)
- No removal of the existing `mustChangePassword` mechanism (later cleanup)

### Story 18.1: Email Transport and Preferred Language

**As the** operator
**I want** the application to send mail reliably in production and never in development
**So that** account mails can be built on a transport that cannot lose mail silently

**Acceptance Criteria:**

#### AC 1: SMTP in Production
**Given** `NODE_ENV=production` and all of `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` set
**When** `sendEmail` is called
**Then** the mail is sent via SMTP with `MAIL_FROM` as the From header
**And** port 465 uses implicit TLS, any other port requires STARTTLS, certificate verification stays on
**And** connection, greeting and socket each time out after 15 s

#### AC 2: Outbox Everywhere Else
**Given** `NODE_ENV` is not `production`
**When** `sendEmail` is called
**Then** the mail goes into an in-memory outbox and no network connection is opened, even if SMTP variables are set

#### AC 3: Refuse to Serve Without Configuration
**Given** `NODE_ENV=production` and any SMTP variable missing or blank
**When** the server starts
**Then** startup fails with an error naming the missing variables and never their values
**And** `next build` does not require the variables

#### AC 4: Failures Are Thrown, Logged Safely
**Given** an SMTP failure
**When** `sendEmail` runs
**Then** it throws, and any log line a caller writes contains only the error code, the server reply code and the message with mail addresses redacted — never the password, recipient, token, link or body

#### AC 5: Preferred Language on the User
**Given** the migration has run
**Then** every user has `preferredLanguage` (`de` | `en`), existing users default to `de`
**And** the admin user form shows a language selector defaulting to German, also when editing a user

#### AC 6: Privacy Policy Discloses Mail
**Given** the privacy policy renders
**Then** it has an "Email" section stating that account mails go to the account's address via the operator's mail provider, with the legal basis from the new required `SITE_PRIVACY_LEGAL_BASIS_EMAIL`

**Technical Requirements:**
- Port `email.ts` and `smtpConfig.ts` from TravelPlan into `src/utils/` (project rule: no new `lib/`), keeping the "no `nodemailer` in the boot-check module" split
- Boot check in `src/instrumentation.ts` inside the existing `NEXT_RUNTIME === "nodejs"` branch, before the backfills, skipped during `NEXT_PHASE=phase-production-build`
- `nodemailer` ^10, no `@types/nodemailer`; `npm audit` clean per the dependency policy
- Docs: `.env.example` (commented SMTP block, "production only"), README env and systemd sections with the Strato values, the "mailbox password, not customer login" note and a release note that the variables must be in the unit before deploying

**Testing Requirements:**
- Config: each variable missing / blank, several missing, bad port, value never in message, build phase and non-production skipped
- Transport (`nodemailer` mocked): 465 vs 587 options, timeouts, From header, rejection propagates, outbox untouched in production; non-production never creates a transport
- Migration default and admin form language selector
- Privacy policy renders the Email section; missing `SITE_PRIVACY_LEGAL_BASIS_EMAIL` keeps the page unpublished

**Source:** User request, 2026-11-09
**Priority:** High
**Story Points:** 5

### Story 18.2: Password Reset by Email

**As a** user who forgot my password
**I want to** request a reset link on the sign-in page
**So that** I can get back into my account without asking the operator

**Acceptance Criteria:**

#### AC 1: Request Without Enumeration
**Given** I am on the sign-in page
**When** I click "Forgot password?" and submit an email address
**Then** I always see the same confirmation, whether or not the address has an account
**And** the response does not wait for the mail to be sent

#### AC 2: Who Gets a Mail
**Given** the address belongs to an active account other than the environment-managed creator
**Then** one mail with a reset link is sent in that account's `preferredLanguage`
**And** for unknown, deactivated or creator addresses no mail is sent

#### AC 3: The Link
**Given** I open the reset link within 1 hour
**When** I enter a new password (min. 8 characters) twice
**Then** the password is changed, the link is consumed, any earlier unused reset links for my account are invalidated, and I am sent to sign-in
**And** an expired, used or unknown link shows a clear "link no longer valid" page with a way to request a new one

#### AC 4: Safe Logging
**Given** sending fails
**Then** the request still answers the same confirmation and the failure is logged per Story 18.1 AC 4

**Technical Requirements:**
- Single-use token table shared with Story 18.3 (type `reset` | `invite`); store only a hash of the token; 32 random bytes
- Link built from `NEXTAUTH_URL`; the forgot-password and set-password pages and their APIs added to the proxy public allowlist with proxy tests
- Setting the password clears `mustChangePassword`
- All strings in English and German

**Testing Requirements:**
- Known `de` and `en` users get one outbox mail in their language with a correctly formed link
- Unknown, deactivated and creator addresses: same response, empty outbox
- Expired, reused and tampered tokens rejected; success consumes the token
- Transport failure: same response, log contains no token, link, body or password

**Source:** User request, 2026-11-09
**Priority:** High
**Story Points:** 3

### Story 18.3: Invite New Users by Email

**As an** administrator
**I want to** create an account by entering only name, email, role and language
**So that** the new user chooses their own password and I never handle it

**Acceptance Criteria:**

#### AC 1: Create Without Password
**Given** I am an administrator creating a user
**Then** the form has name, email, role and language (default German) and no password field
**And** on save the account is created in a "invitation pending" state and an invitation mail is sent in the chosen language

#### AC 2: Accept the Invitation
**Given** I open the invitation link within 7 days
**When** I choose a password (min. 8 characters) twice
**Then** the account becomes active for sign-in, the link is consumed, and I am sent to sign-in
**And** before that, the account cannot sign in with any password

#### AC 3: Visible and Resendable
**Given** an account has not yet accepted its invitation
**Then** the admin user list marks it as "invitation pending"
**And** the administrator can resend the invitation, which invalidates the previous link

#### AC 4: Send Failure Is Visible to the Admin
**Given** the invitation mail cannot be sent
**Then** the account is still created, the administrator sees that the mail failed, and can use "resend"

**Technical Requirements:**
- Reuses the token table and set-password page from Story 18.2 (type `invite`, 7-day expiry)
- Pending state must not allow sign-in; decide in the story between a nullable `passwordHash` and an explicit flag
- Existing accounts and the environment-managed creator are unaffected
- Unlike password reset, the admin-facing create call may await the send, because only an administrator can reach it and enumeration does not apply
- All strings in English and German

**Testing Requirements:**
- Create sends exactly one outbox mail in the chosen language; no password accepted in the request
- Pending account cannot sign in; after accepting it can
- Resend invalidates the old link; expired link rejected
- Transport failure: account exists, response reports the failed mail

**Source:** User request, 2026-11-09
**Priority:** High
**Story Points:** 3

### Story 18.4: Notify Users When Added to a Trip

**As a** user
**I want to** get a mail when someone gives me access to a trip
**So that** I know the trip exists and can open it directly

**Acceptance Criteria:**

#### AC 1: Mail on Access Granted
**Given** a trip owner or administrator adds me to a trip as viewer or contributor
**Then** I receive one mail in my `preferredLanguage` naming the trip, who added me, and my role, with a link to the trip

#### AC 2: No Noise
**Given** my role on a trip changes later, or I am removed
**Then** no mail is sent
**And** adding myself (owner) sends nothing

#### AC 3: Adding Never Fails Because of Mail
**Given** sending fails
**Then** the user is still added, the response is unchanged, and the failure is logged per Story 18.1 AC 4

**Technical Requirements:**
- Hook into `POST /api/trips/[id]/viewers` after the access row is created; send without awaiting
- Link to the authenticated trip page, built from `NEXTAUTH_URL`; never include the public share token
- If the user's invitation is still pending, the trip mail is still sent; the link leads to sign-in, which is expected
- All strings in English and German

**Testing Requirements:**
- Adding a viewer or contributor puts one mail in the outbox with the right language, trip title and link
- Role change and removal send nothing
- Transport failure leaves the access row and the response unchanged

**Source:** User request, 2026-11-09
**Priority:** Medium
**Story Points:** 2
```

### 4.3 sprint-status.yaml - `_bmad-output/implementation-artifacts/sprint-status.yaml`

```yaml
  epic-18: backlog
  18-1-email-transport-and-preferred-language: backlog
  18-2-password-reset-by-email: backlog
  18-3-invite-new-users-by-email: backlog
  18-4-notify-users-when-added-to-a-trip: backlog
  epic-18-retrospective: optional
```

### 4.4 Operator Steps (Tommy, outside the code)

1. At Strato, create the alias `system@blogs.dreyer-travels.de` on the `webmaster@dreyer-travels.de` mailbox.
2. Before deploying 18.1: add the five SMTP `Environment=` lines (and `SITE_PRIVACY_LEGAL_BASIS_EMAIL`) to the TravelBlogs systemd unit. `SMTP_PASS` is the mailbox password, the same one TravelPlan uses.
3. After deploying 18.2: request a reset for a test account on `https://blogs.dreyer-travels.de` and confirm it arrives and the link works.

---

## 5. Implementation Handoff

**Scope classification:** Moderate - new epic and PRD extension, no replan of existing work.

**Handoff sequence:**
1. **PM (John, this workflow):** apply Sections 4.1–4.3 on approval.
2. **`bmad-create-story`** for 18.1, then **`bmad-dev-story`**. Stories run in order: 18.1 → 18.2 → 18.3 → 18.4 (18.3 reuses 18.2's token table and set-password page).
3. **Tommy:** operator steps in 4.4.

**Success criteria:**
- A real password reset and a real invitation arrive in an inbox from `system@blogs.dreyer-travels.de` and complete end to end in production.
- No password is typed by an administrator for any new account.
- `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` pass; `npm run build` passes without SMTP variables.
