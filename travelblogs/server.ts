import "dotenv/config";
import { createServer } from "https";
import { createServer as createHttpServer } from "http";
import { readFileSync } from "fs";
import { parse } from "url";
import { pathToFileURL } from "url";
import next from "next";

type TlsConfig = {
  key: Buffer;
  cert: Buffer;
  ca?: Buffer;
};

const requiredEnv = (key: string): string => {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(
      `HTTPS configuration error: ${key} is required. Set it in .env to a readable file path.`,
    );
  }
  return value;
};

const readTlsFile = (label: string, filePath: string): Buffer => {
  try {
    return readFileSync(filePath);
  } catch {
    throw new Error(
      `HTTPS configuration error: Unable to read ${label} at ${filePath}. Ensure the file exists and the process has read access.`,
    );
  }
};

export const loadTlsConfigFromEnv = (): TlsConfig => {
  const certPath = requiredEnv("TLS_CERT_PATH");
  const keyPath = requiredEnv("TLS_KEY_PATH");
  const caPath = process.env.TLS_CA_PATH?.trim();

  const cert = readTlsFile("TLS certificate", certPath);
  const key = readTlsFile("TLS key", keyPath);
  const ca = caPath ? readTlsFile("TLS CA bundle", caPath) : undefined;

  return { cert, key, ca };
};

const isHttpsEnabled = (): boolean => {
  const raw = process.env.HTTPS_ENABLED?.trim().toLowerCase();
  if (!raw) {
    return true;
  }
  return !["0", "false", "no", "off"].includes(raw);
};

export const startHttpsServer = async (): Promise<void> => {
  const port = Number.parseInt(process.env.PORT ?? "3000", 10);
  const hostname = process.env.HOSTNAME ?? "0.0.0.0";
  const app = next({ dev: false, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

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

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  startHttpsServer().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
