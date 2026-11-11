This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Localization

All user-facing UI text must be translatable and shipped in both English and German. Use the translation utilities and add keys for both locales whenever new UI copy is introduced.

## Prerequisites

- **Node.js 24 LTS** is required. The repository root contains an `.nvmrc` pinning the major
  version, so `nvm use` (or `fnm use` / `asdf install`) from the repo root selects the right
  runtime. `travelblogs/package.json` also declares `engines.node` (`>=24.0.0 <25.0.0`), which
  makes npm warn on a mismatched runtime.
- Node.js 20 reached end-of-life in April 2026 and is no longer security-supported. Running on
  it is not supported: the pinned `better-sqlite3` native module publishes prebuilt binaries per
  Node ABI, so an unsupported runtime falls back to compiling from source.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## HTTPS (Production)

TravelBlogs runs over HTTPS in production using a custom Node HTTPS entrypoint.

1. Obtain certificates from a free provider like Lets Encrypt.
2. Place the files on your NAS, for example:
   - `/volume1/certs/travelblogs/fullchain.pem`
   - `/volume1/certs/travelblogs/privkey.pem`
3. Set the env vars in `.env`:
   - `TLS_CERT_PATH=/volume1/certs/travelblogs/fullchain.pem`
   - `TLS_KEY_PATH=/volume1/certs/travelblogs/privkey.pem`
   - `TLS_CA_PATH=/volume1/certs/travelblogs/chain.pem` (optional)
4. Build and run the HTTPS server:
   - `npm run build`
   - `npm run start` (alias: `npm run start:https`)

### Deploying an update

The service is managed by systemd (unit: `travelblogs`). On the production host, Node.js 24 is
installed at `/opt/node-24` — the same location the sibling TravelPlan service uses.

> **Run every deploy command under Node 24.** `better-sqlite3` is a native module and `npm ci`
> downloads a prebuilt binary matching the ABI of whichever Node runs the install (Node 24 =
> ABI 137). If you install under an older Node and the service then starts under Node 24, the
> service fails to load the module. Put Node 24 first on your shell `PATH` before step 3:
>
> ```bash
> export PATH=/opt/node-24/bin:$PATH
> node -v   # must report v24.x
> ```

Deploy in this order:

```bash
sudo systemctl stop TravelBlogs
git pull
./scripts/deploy.sh                 # installs, verifies native modules, migrates, builds
sudo systemctl start TravelBlogs
sudo journalctl -u TravelBlogs -n 40 --no-pager
```

`scripts/deploy.sh` exists because four steps are mandatory, easy to forget, and each has
already caused a failed deploy. It puts Node 24 on `PATH`, exports
`SHARP_IGNORE_GLOBAL_LIBVIPS=1`, runs `npm ci` (which now runs `prisma generate` via the
`postinstall` hook), asserts both native modules load, applies pending database migrations
(`npx prisma migrate deploy`), and then builds. If you would rather run the
steps by hand, they are:

1. Stop the service — `sudo systemctl stop travelblogs`
2. `git pull`
3. `export PATH=/opt/node-24/bin:$PATH` — **before** installing, so the `better-sqlite3` prebuild
   matches the ABI the service will run under (Node 24 = ABI 137). Installing under an older Node
   and starting under Node 24 leaves a module that cannot be loaded.
4. `export SHARP_IGNORE_GLOBAL_LIBVIPS=1` — the host has a system libvips, so sharp's install check
   otherwise prefers it and tries to compile from source, which fails without a C++ toolchain and
   `node-addon-api`. This forces the prebuilt `@img/sharp-linux-*` binary. It must be a real
   environment variable: an `.npmrc` entry does **not** work, because npm exposes config keys as
   `npm_config_*` and sharp only reads `SHARP_IGNORE_GLOBAL_LIBVIPS`.
5. `npm ci` — required whenever `package-lock.json` changed or a native module was bumped;
   `npm run build` alone reuses a stale `node_modules`. The `postinstall` hook runs
   `prisma generate` for you, because `npm ci` wipes the generated client along with
   `node_modules`.
6. `npx prisma migrate deploy` — nothing else applies migrations (not the build, not
   `npm start`). It only applies pending ones, so it is harmless on a deploy without any.
7. `npm run build`
8. Start the service — `sudo systemctl start TravelBlogs` — then confirm it is active and serving:
   `sudo journalctl -u TravelBlogs -f`

Sanity checks worth running after any reinstall:

```bash
node -e "require('better-sqlite3'); console.log('ABI', process.versions.modules)"   # expect 137
node -e "require('sharp')({create:{width:8,height:8,channels:3,background:'#000'}}).jpeg().toBuffer().then(b=>console.log('sharp OK',b.length))"
sudo readlink -f /proc/$(systemctl show -p MainPID --value travelblogs)/exe          # expect /opt/node-24/bin/node
```

### systemd unit and the Node runtime

`npm start` runs `NODE_ENV=production node server.js`, so the `node` the unit resolves is what
actually runs the app. Pin it explicitly, following the pattern already proven by the TravelPlan
unit on this host:

```ini
Environment="PATH=/opt/node-24/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=/opt/node-24/bin/npm start
```

After editing the unit: **`sudo systemctl daemon-reload`, then restart the service.** Do not skip the
reload — systemd keeps serving the cached unit definition, so the app silently keeps running on the
old interpreter. That failure mode is nasty to diagnose: `better-sqlite3` is built for the Node it was
installed under, so a stale Node 20 unit produces
`NODE_MODULE_VERSION 137 ... requires 115`, every Prisma call fails with `ERR_DLOPEN_FAILED`, and
because auth failures and database failures look identical at the UI, it presents as *"my password
stopped working"*.

Note the unit is named `TravelBlogs.service` (capitalised) — `journalctl -u travelblogs` returns
`-- No entries --` rather than an error. Journal access also needs `sudo`, since the `app` user is not
in `adm`/`systemd-journal`.

Unlike TravelPlan, TravelBlogs loads its configuration from `.env` via `dotenv` rather than from
`Environment=` lines in the unit, so do not copy TravelPlan's `Environment=` block across. Note
also that TravelBlogs reads `HOSTNAME` (not `HOST`) alongside `PORT`, `HTTPS_ENABLED`,
`DATABASE_URL`, and the `TLS_*` paths.

Lets Encrypt certificates expire every 90 days. Plan regular renewals and update the files in place so the server can be restarted with fresh certs.

### Outgoing email

TravelBlogs sends account mails (password reset, invitation, trip-access notice) over SMTP in
production. Any other `NODE_ENV` (development, test, staging, unset) never opens a connection: mail
goes into an in-memory outbox instead, whatever SMTP variables are set.

Set all five in the production `.env` — the same Strato mailbox TravelPlan uses on this host:

| Variable | Production value |
| --- | --- |
| `SMTP_HOST` | `smtp.strato.de` |
| `SMTP_PORT` | `465` (implicit TLS) |
| `SMTP_USER` | `webmaster@dreyer-travels.de` |
| `SMTP_PASS` | the mailbox password |
| `MAIL_FROM` | `TravelBlogs <system@blogs.dreyer-travels.de>` |

- **`SMTP_PASS` is the mailbox password** from Strato's "Postfach bearbeiten", **not** the Strato
  customer login. It is a secret: keep the production `.env` at `chmod 600`, owned by the service
  user. Never put it on a development machine.
- **`MAIL_FROM` must be an alias on the `SMTP_USER` mailbox** — Strato rejects From addresses the
  mailbox does not own. Create the alias in Strato first.
- **Quoting in `.env`.** dotenv treats an unquoted `#` as the start of a comment, so quote
  `MAIL_FROM` (it contains `<`, `>` and spaces) and any `SMTP_PASS` containing `#`, spaces or
  quotes. Prefer single quotes, which disable escape processing:
  `SMTP_PASS='p#ss w"rd'`. This differs from TravelPlan, whose values live in systemd
  `Environment=` lines.
- **Port 587 (STARTTLS) is the fallback** if 465 is unreachable from the host. Check with
  `timeout 5 bash -c "</dev/tcp/smtp.strato.de/465" && echo open` (the host has no `nc`). On any
  port other than 465 the app requires STARTTLS and refuses to continue in clear text; certificate
  verification is always on.
- **Startup check.** With `NODE_ENV=production`, the server checks the five variables when it starts
  (`src/instrumentation.ts`). A missing or whitespace-only variable, or a `SMTP_PORT` that is not a
  whole number from 1 to 65535, does not stop the process: **every request answers HTTP 500** and
  the journal names the variables at fault (never their values). `npm run build` skips the check, so
  building needs no SMTP settings.
- **Privacy policy.** `/datenschutz` discloses account mails as its own activity and needs
  `SITE_PRIVACY_LEGAL_BASIS_EMAIL`; until it is set the page shows "not yet published".
- **Deliverability.** `dreyer-travels.de` publishes DMARC `p=reject` with no SPF record, so delivery
  relies on Strato's DKIM signing. The optional SPF record is `v=spf1 include:_spf.strato.com -all`.

> **Release note (Story 18.1).** Put the five SMTP variables **and**
> `SITE_PRIVACY_LEGAL_BASIS_EMAIL` into the production `.env` **before** deploying this build. A
> missing SMTP variable shows as HTTP 500 on every request with the reason in
> `sudo journalctl -u TravelBlogs`; a missing legal basis turns `/datenschutz` back to "not yet
> published". This build sends no mail yet — the first mail is the password reset (Story 18.2).

**Password reset (Story 18.2).** "Forgot password?" on `/sign-in` mails a one-hour link to
`/set-password`. The link is built from **`NEXTAUTH_URL`**, so in production it must be the public
`https://blogs.dreyer-travels.de` — never `localhost` or the internal address. If it is unset, no
reset mail is sent and the journal says `password-reset: NEXTAUTH_URL not set`. The request always
answers the same confirmation, so a failed send shows only in the journal as one
`password-reset: reset mail not sent` line (error code and redacted message, never the address or
link). The env-managed creator account cannot reset its password this way. **Post-deploy check:**
request a reset for a test account on `https://blogs.dreyer-travels.de`, confirm the mail arrives
from `system@blogs.dreyer-travels.de` in that account's language, set a new password through the
link and sign in with it.

**Invitations (Story 18.3).** Administrators no longer type a password for new users. "Add user" on
`/admin/users` takes email, name, role and language and mails the new user a link to
`/set-password`, valid for **7 days** and built from `NEXTAUTH_URL` like the reset link. Until the
invitee sets a password the account cannot sign in and the list shows "Invitation pending" with a
**"Resend invitation"** button; a resend mails a fresh link in the user's current language and only
then invalidates the old one. If the mail cannot be sent, the user is still created and the form
says so; the journal gets one `invitation: invitation mail not sent` line (error code and redacted
message, never address, name or link). An invitee whose link has expired can also use "Forgot
password?" on `/sign-in`, which finishes the invitation the same way. Accounts created before this
release keep their admin-set temporary password. **Post-deploy check:** invite a test address on
`https://blogs.dreyer-travels.de`, confirm the mail arrives from `system@blogs.dreyer-travels.de` in
the chosen language and that the list shows "Invitation pending", set a password through the link,
sign in, and confirm the badge is gone.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
