/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv/config");
const { createServer } = require("https");
const { createServer: createHttpServer } = require("http");
const { readFileSync } = require("fs");
const next = require("next");

const REQUEST_URL_BASE = "http://localhost";

// Replaces the runtime-deprecated `url.parse()` (DEP0169). Next's request handler
// needs `pathname` and a parsed `query`; the remaining fields mirror what
// `url.parse(req.url, true)` returned so request handling is unchanged.
const parseRequestUrl = (requestUrl) => {
  const target = requestUrl ? requestUrl : "/";

  let url;
  try {
    // Origin-form targets are appended to a base that already carries the host, so
    // a target starting with "//" stays part of the path rather than being read as
    // protocol-relative (which would silently replace the host).
    url = target.startsWith("/")
      ? new URL(`${REQUEST_URL_BASE}${target}`)
      : new URL(target, REQUEST_URL_BASE);
  } catch {
    return { pathname: target, query: {}, search: null, path: target, href: target };
  }

  // `url.parse(..., true)` used querystring semantics, where a repeated key
  // collapses into an array. `searchParams` iterates duplicates separately.
  const query = {};
  for (const [key, value] of url.searchParams) {
    const existing = query[key];
    if (existing === undefined) {
      query[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      query[key] = [existing, value];
    }
  }

  return {
    pathname: url.pathname,
    query,
    search: url.search === "" ? null : url.search,
    path: `${url.pathname}${url.search}`,
    href: `${url.pathname}${url.search}${url.hash}`,
  };
};

const requiredEnv = (key) => {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(
      `HTTPS configuration error: ${key} is required. Set it in .env to a readable file path.`,
    );
  }
  return value;
};

const readTlsFile = (label, filePath) => {
  try {
    return readFileSync(filePath);
  } catch {
    throw new Error(
      `HTTPS configuration error: Unable to read ${label} at ${filePath}. Ensure the file exists and the process has read access.`,
    );
  }
};

const loadTlsConfigFromEnv = () => {
  const certPath = requiredEnv("TLS_CERT_PATH");
  const keyPath = requiredEnv("TLS_KEY_PATH");
  const caPath = process.env.TLS_CA_PATH?.trim();

  const cert = readTlsFile("TLS certificate", certPath);
  const key = readTlsFile("TLS key", keyPath);
  const ca = caPath ? readTlsFile("TLS CA bundle", caPath) : undefined;

  return { cert, key, ca };
};

const isHttpsEnabled = () => {
  const raw = process.env.HTTPS_ENABLED?.trim().toLowerCase();
  if (!raw) {
    return true;
  }
  return !["0", "false", "no", "off"].includes(raw);
};

const startHttpsServer = async () => {
  const port = Number.parseInt(process.env.PORT ?? "3000", 10);
  const hostname = process.env.HOSTNAME ?? "0.0.0.0";
  const app = next({ dev: false, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  // Backfill GPS data for existing entries on startup
  try {
    const { PrismaClient } = require("@prisma/client");
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
    const { backfillGpsData } = require("./src/utils/backfill-gps");
    const { backfillImageCompression } = require("./src/utils/backfill-image-compression");
    const { backfillCountryCodes } = require("./src/utils/backfill-country-codes");

    const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
    const databasePath = databaseUrl.replace(/^file:/, "");
    const adapter = new PrismaBetterSqlite3({ url: databasePath });
    const prisma = new PrismaClient({ adapter });

    await backfillGpsData(prisma);
    void backfillImageCompression(prisma)
      .catch((compressionError) => {
        console.error("Image compression backfill failed:", compressionError);
      })
      .then(() => backfillCountryCodes(prisma))
      .catch((countryError) => {
        console.error("Country code backfill failed:", countryError);
      })
      .finally(() => prisma.$disconnect());
  } catch (error) {
    console.error("GPS backfill failed:", error);
  }

  if (isHttpsEnabled()) {
    const tlsConfig = loadTlsConfigFromEnv();
    createServer(tlsConfig, (req, res) => {
      const parsedUrl = parseRequestUrl(req.url);
      handle(req, res, parsedUrl);
    }).listen(port, hostname, () => {
      console.log(`HTTPS server running at https://${hostname}:${port}`);
    });
    return;
  }

  console.warn("HTTPS is disabled; starting HTTP server.");
  createHttpServer((req, res) => {
    const parsedUrl = parseRequestUrl(req.url);
    handle(req, res, parsedUrl);
  }).listen(port, hostname, () => {
    console.log(`HTTP server running at http://${hostname}:${port}`);
  });
};

module.exports = { loadTlsConfigFromEnv, parseRequestUrl, startHttpsServer };

if (require.main === module) {
  startHttpsServer().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
