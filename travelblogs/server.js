/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv/config");
const { createServer } = require("https");
const { createServer: createHttpServer } = require("http");
const { readFileSync } = require("fs");
const { parse } = require("url");
const next = require("next");

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
      const parsedUrl = parse(req.url ?? "", true);
      handle(req, res, parsedUrl);
    }).listen(port, hostname, () => {
      console.log(`HTTPS server running at https://${hostname}:${port}`);
    });
    return;
  }

  console.warn("HTTPS is disabled; starting HTTP server.");
  createHttpServer((req, res) => {
    const parsedUrl = parse(req.url ?? "", true);
    handle(req, res, parsedUrl);
  }).listen(port, hostname, () => {
    console.log(`HTTP server running at http://${hostname}:${port}`);
  });
};

module.exports = { loadTlsConfigFromEnv, startHttpsServer };

if (require.main === module) {
  startHttpsServer().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
