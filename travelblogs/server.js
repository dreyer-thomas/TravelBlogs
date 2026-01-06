const { createServer } = require("https");
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

const startHttpsServer = async () => {
  const port = Number.parseInt(process.env.PORT ?? "3000", 10);
  const hostname = process.env.HOSTNAME ?? "0.0.0.0";
  const app = next({ dev: false, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();
  const tlsConfig = loadTlsConfigFromEnv();

  createServer(tlsConfig, (req, res) => {
    const parsedUrl = parse(req.url ?? "", true);
    handle(req, res, parsedUrl);
  }).listen(port, hostname, () => {
    console.log(`HTTPS server running at https://${hostname}:${port}`);
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
