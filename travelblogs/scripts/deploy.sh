#!/usr/bin/env bash
#
# Production deploy for TravelBlogs (systemd unit: travelblogs).
#
# Run from the travelblogs/ directory on the production host, after `git pull`:
#
#   sudo systemctl stop travelblogs
#   ./scripts/deploy.sh
#   sudo systemctl start travelblogs
#
# This script exists because three settings are mandatory and easy to forget; each
# one has already caused a failed deploy:
#
#  1. Node 24 must be on PATH for the *install*, not just for the service. `npm ci`
#     fetches a `better-sqlite3` prebuild matching the ABI of whichever Node runs it
#     (Node 24 = ABI 137). Install under Node 20, start under Node 24, and the native
#     module fails to load at runtime.
#  2. SHARP_IGNORE_GLOBAL_LIBVIPS=1. The host has a system libvips, so sharp's
#     install check prefers it and tries to compile from source, which fails (no
#     toolchain / no node-addon-api). This forces the prebuilt @img binary instead.
#     It must be a real environment variable — an .npmrc entry does NOT work, because
#     npm maps config keys to npm_config_*, which sharp does not read.
#  3. `prisma generate` must run after `npm ci`, because `npm ci` wipes node_modules
#     and the generated client lives there. This is now wired to the `postinstall`
#     hook in package.json, so it happens automatically -- but the build fails loudly
#     if it is ever removed.

set -euo pipefail

NODE_BIN_DIR="${NODE_BIN_DIR:-/opt/node-24/bin}"

if [[ ! -x "${NODE_BIN_DIR}/node" ]]; then
  echo "error: no node executable at ${NODE_BIN_DIR}/node" >&2
  echo "       set NODE_BIN_DIR to the Node 24 install directory and re-run." >&2
  exit 1
fi

export PATH="${NODE_BIN_DIR}:${PATH}"
export SHARP_IGNORE_GLOBAL_LIBVIPS=1

node_version="$(node -v)"
echo "==> node ${node_version} (npm $(npm -v))"

case "${node_version}" in
  v24.*) ;;
  *)
    echo "error: expected Node 24, got ${node_version}." >&2
    echo "       package.json engines requires >=24.0.0 <25.0.0." >&2
    exit 1
    ;;
esac

echo "==> npm ci (runs prisma generate via postinstall)"
npm ci

echo "==> verifying native modules against this runtime"
node -e "
require('better-sqlite3');
console.log('    better-sqlite3 OK (ABI ' + process.versions.modules + ')');
"
node -e "
require('sharp')({ create: { width: 8, height: 8, channels: 3, background: '#000' } })
  .jpeg().toBuffer()
  .then((b) => console.log('    sharp OK (' + b.length + ' bytes, libvips ' + require('sharp').versions.vips + ')'))
  .catch((e) => { console.error('    sharp FAILED: ' + e.message); process.exit(1); });
"

echo "==> npm run build"
npm run build

echo
echo "Build complete. Now:"
echo "  sudo systemctl start travelblogs"
echo "  journalctl -u travelblogs -n 40 --no-pager"
