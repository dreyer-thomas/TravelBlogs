#!/usr/bin/env bash
set -euo pipefail

# Production deploy for TravelBlogs (systemd unit: travelblogs).
#
# The server copy lives at /usr/local/bin/deploy-travelblogs.sh; this file is the
# reviewable copy. Keep them identical.
#
# Differences from deploy-travelplan.sh that matter, each one a failed deploy:
#  - Node 24 must be on PATH for the INSTALL, not just for the service. `npm ci`
#    fetches a better-sqlite3 prebuild matching the ABI of whichever node runs it
#    (Node 24 = ABI 137). Install under 20, start under 24, and the module will
#    not load.
#  - SHARP_IGNORE_GLOBAL_LIBVIPS=1 must be a real env var. The host has a system
#    libvips, so sharp otherwise tries to compile from source and fails. An
#    .npmrc entry does NOT work: npm exposes config as npm_config_*, which sharp
#    does not read.
#  - `prisma generate` runs on EVERY deploy, not only when package-lock.json
#    changed. Unlike TravelPlan, TravelBlogs does not commit the generated client
#    -- it lives in node_modules/.prisma. A schema change with an unchanged
#    lockfile therefore leaves a stale client, and `next build` fails type
#    checking with "Property 'tripView' does not exist on type 'PrismaClient'".
#    That is exactly how the 16.1 deploy broke.

SERVICE="travelblogs"
REPO_DIR="${REPO_DIR:-/home/app/apps/TravelBlogs}"
APP_DIR="${APP_DIR:-$REPO_DIR/travelblogs}"
BRANCH="${BRANCH:-main}"
BACKUP_DIR="${BACKUP_DIR:-/home/app/backups/travelblogs}"
KEEP_BACKUPS=10
NODE_BIN_DIR="${NODE_BIN_DIR:-/opt/node-24/bin}"
PORT="${PORT:-3000}"

echo "==> Deploy started: $(date -Is)"

# --- Runtime, before anything touches the service ---------------------------
if [[ ! -x "${NODE_BIN_DIR}/node" ]]; then
  echo "ERROR: no node executable at ${NODE_BIN_DIR}/node" >&2
  exit 1
fi
export PATH="${NODE_BIN_DIR}:${PATH}"
export SHARP_IGNORE_GLOBAL_LIBVIPS=1

node_version="$(node -v)"
echo "==> node ${node_version} (npm $(npm -v))"
case "${node_version}" in
  v24.*) ;;
  *)
    echo "ERROR: expected Node 24, got ${node_version} (engines: >=24 <25)." >&2
    exit 1
    ;;
esac

# --- Pre-flight, while the service is still up ------------------------------
cd "$REPO_DIR"
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: $REPO_DIR is not a git repository" >&2
  exit 1
fi

# A dirty tree means somebody edited on the server. git pull --ff-only would
# either abort or discard that - say so before stopping the service.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: working tree in $REPO_DIR has local changes:" >&2
  git status --short >&2
  exit 1
fi

LOCK_BEFORE=$(sha256sum "$APP_DIR/package-lock.json" | cut -d' ' -f1)

# Resolve the live DB from .env rather than hardcoding it, so a changed
# DATABASE_URL cannot leave us backing up a file nobody writes to.
DB_URL=$(grep -E '^DATABASE_URL=' "$APP_DIR/.env" | tail -1 | cut -d= -f2- | tr -d '"'"'"'')
DB_REL="${DB_URL#file:}"
case "$DB_REL" in
  /*) DB_PATH="$DB_REL" ;;
  *)  DB_PATH="$APP_DIR/${DB_REL#./}" ;;
esac
if [[ ! -f "$DB_PATH" ]]; then
  echo "ERROR: database not found at $DB_PATH (from DATABASE_URL=$DB_URL)" >&2
  exit 1
fi

echo "==> Stopping service: $SERVICE"
sudo systemctl stop "$SERVICE"

# --- Service is down: every abort from here must bring it back up -----------
# Without this, `set -e` exits before the start and the site stays dark.
trap 'echo "!! Deploy failed - restarting $SERVICE with the previous build"; sudo systemctl start "$SERVICE" || true' ERR

# The service is stopped, so nothing is writing - a plain cp is enough and needs
# no sqlite3 on the machine. Taken BEFORE migrate deploy, which is the only step
# here that cannot be rolled back by redeploying the old commit.
mkdir -p "$BACKUP_DIR"
BACKUP="$BACKUP_DIR/$(basename "$DB_PATH").$(date +%Y%m%d-%H%M%S)"
cp "$DB_PATH" "$BACKUP"
echo "==> DB backed up to $BACKUP"
ls -1t "$BACKUP_DIR/$(basename "$DB_PATH")".* 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm --

echo "==> Updating repo: $REPO_DIR (branch: $BRANCH)"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

cd "$APP_DIR"

# npm ci rebuilds native modules, which is slow here, so only when the lockfile
# actually moved.
if [ "$LOCK_BEFORE" != "$(sha256sum package-lock.json | cut -d' ' -f1)" ]; then
  echo "==> package-lock.json changed - installing"
  npm ci --no-audit --no-fund
else
  echo "==> dependencies unchanged - skipping install"
fi

# ALWAYS, and after any install. The generated client is not in git, so it goes
# stale on every schema change; `npm ci` regenerates it via postinstall, but the
# skip branch above does not. Cheap enough to run unconditionally.
echo "==> Generating Prisma client"
npx prisma generate

# No-op when nothing is pending. Runs after the backup above, never before.
echo "==> Applying migrations"
npx prisma migrate deploy

# `.next` is removed BEFORE the build, and this is not tidiness - it closes a
# fail-open. The auth gate is `src/proxy.ts`, which Next builds as Node
# middleware: `loadNodeMiddleware()` requires `.next/server/middleware.js` and
# swallows ENOENT and MODULE_NOT_FOUND silently. If that file is missing,
# `getMiddleware()` returns undefined and the request continues WITHOUT a
# session check. An aborted build that already wrote the manifest but not
# middleware.js leaves exactly that state: the app runs, systemd reports green,
# and every protected route is open.
echo "==> Removing previous build output"
rm -rf .next

echo "==> Building app"
npm run build

# --- Normal start from here -------------------------------------------------
trap - ERR

echo "==> Starting service: $SERVICE"
sudo systemctl start "$SERVICE"

# `start` returns before the app binds the port, so a crash two seconds in would
# otherwise look like a successful deploy.
sleep 5
if ! systemctl is-active --quiet "$SERVICE"; then
  echo "!! $SERVICE did not stay up:" >&2
  sudo journalctl -u "$SERVICE" -n 40 --no-pager >&2
  exit 1
fi

# is-active only says the process runs, not that it is still guarded - which is
# precisely the gap above. So knock once. `/trips` is in the matcher of
# src/proxy.ts, and without a cookie the gate must redirect to /sign-in (307).
# A 200 means the app serves protected routes unauthenticated: that is an
# incident, not a deploy, so stop rather than log a line.
echo "==> Verifying the session gate is live"
GATE_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
  "http://127.0.0.1:${PORT}/trips" || echo "000")
if [ "$GATE_STATUS" != "307" ]; then
  echo "!! SESSION GATE NOT ACTIVE: anonymous GET /trips answered $GATE_STATUS, expected 307." >&2
  echo "!! The app is serving protected routes without authentication. Stopping $SERVICE." >&2
  sudo systemctl stop "$SERVICE" || true
  sudo journalctl -u "$SERVICE" -n 40 --no-pager >&2
  exit 1
fi
echo "==> Session gate confirmed (anonymous /trips -> $GATE_STATUS)"

sudo systemctl --no-pager --full status "$SERVICE" || true
echo "==> Deploy finished: $(date -Is)"
