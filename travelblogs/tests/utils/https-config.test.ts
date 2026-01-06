import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { loadTlsConfigFromEnv } from "../../server.js";

const originalEnv = { ...process.env };

const setEnv = (env: Record<string, string | undefined>) => {
  process.env = { ...originalEnv, ...env };
};

describe("loadTlsConfigFromEnv", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("fails fast when TLS_CERT_PATH is missing", () => {
    setEnv({ TLS_CERT_PATH: "", TLS_KEY_PATH: "" });
    expect(() => loadTlsConfigFromEnv()).toThrow(/TLS_CERT_PATH/);
  });

  it("fails fast when TLS_KEY_PATH is missing", () => {
    setEnv({ TLS_CERT_PATH: "/tmp/cert.pem", TLS_KEY_PATH: "" });
    expect(() => loadTlsConfigFromEnv()).toThrow(/TLS_KEY_PATH/);
  });

  it("fails fast when a TLS file cannot be read", () => {
    setEnv({
      TLS_CERT_PATH: "/tmp/missing-cert.pem",
      TLS_KEY_PATH: "/tmp/missing-key.pem",
    });
    expect(() => loadTlsConfigFromEnv()).toThrow(/Unable to read/);
  });

  it("loads cert, key, and optional CA bundle when files exist", () => {
    const dir = mkdtempSync(join(tmpdir(), "tls-config-"));
    const certPath = join(dir, "cert.pem");
    const keyPath = join(dir, "key.pem");
    const caPath = join(dir, "ca.pem");

    try {
      writeFileSync(certPath, "cert");
      writeFileSync(keyPath, "key");
      writeFileSync(caPath, "ca");

      setEnv({
        TLS_CERT_PATH: certPath,
        TLS_KEY_PATH: keyPath,
        TLS_CA_PATH: caPath,
      });

      const config = loadTlsConfigFromEnv();
      expect(config.cert.toString()).toBe("cert");
      expect(config.key.toString()).toBe("key");
      expect(config.ca?.toString()).toBe("ca");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
