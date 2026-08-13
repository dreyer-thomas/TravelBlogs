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

1. Stop the service — `sudo systemctl stop travelblogs`
2. `git pull`
3. `npm ci` — required whenever `package-lock.json` changed or a native module was bumped;
   `npm run build` alone reuses a stale `node_modules`.
4. `npx prisma generate` — `npm ci` wipes `node_modules`, and the generated Prisma client lives
   there. There is no `postinstall` hook, so skipping this step makes the build fail with
   `Module '"@prisma/client"' has no exported member 'PrismaClient'`.
5. `npm run build`
6. Start the service — `sudo systemctl start travelblogs` — then confirm it is active and serving
   HTTPS: `journalctl -u travelblogs -f`

### systemd unit and the Node runtime

`npm start` runs `NODE_ENV=production node server.js`, so the `node` the unit resolves is what
actually runs the app. Pin it explicitly, following the pattern already proven by the TravelPlan
unit on this host:

```ini
Environment="PATH=/opt/node-24/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=/opt/node-24/bin/npm start
```

After editing the unit: `sudo systemctl daemon-reload`, then restart the service.

Unlike TravelPlan, TravelBlogs loads its configuration from `.env` via `dotenv` rather than from
`Environment=` lines in the unit, so do not copy TravelPlan's `Environment=` block across. Note
also that TravelBlogs reads `HOSTNAME` (not `HOST`) alongside `PORT`, `HTTPS_ENABLED`,
`DATABASE_URL`, and the `TLS_*` paths.

Lets Encrypt certificates expire every 90 days. Plan regular renewals and update the files in place so the server can be restarted with fresh certs.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
