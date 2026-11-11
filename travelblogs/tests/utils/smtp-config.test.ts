import { afterEach, describe, expect, it, vi } from "vitest";

import {
  assertSmtpConfigured,
  readSmtpConfig,
  SMTP_VARIABLES,
  usesSmtp,
} from "../../src/utils/smtp-config";

const PASS_SENTINEL = "pw-sentinel-8c1f";

const COMPLETE = {
  SMTP_HOST: "smtp.strato.de",
  SMTP_PORT: "465",
  SMTP_USER: "webmaster@dreyer-travels.de",
  SMTP_PASS: PASS_SENTINEL,
  MAIL_FROM: "TravelBlogs <system@blogs.dreyer-travels.de>",
};

const ALL_UNSET = Object.fromEntries(SMTP_VARIABLES.map((name) => [name, undefined]));

const PORT_MESSAGE =
  "SMTP_PORT must be a whole number from 1 to 65535 (465 for implicit TLS, 587 for STARTTLS).";

/**
 * Every case sets all five variables (and `NODE_ENV` / `NEXT_PHASE`) explicitly, so a developer's own
 * `.env` can neither satisfy nor break an assertion here.
 */
const withEnv = (env: Record<string, string | undefined>) => {
  for (const [key, value] of Object.entries({ NEXT_PHASE: undefined, ...COMPLETE, ...env })) {
    vi.stubEnv(key, value);
  }
};

afterEach(() => {
  vi.unstubAllEnvs();
});

const messageOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("expected a throw");
};

describe("usesSmtp", () => {
  it("is true only for NODE_ENV=production", () => {
    for (const [nodeEnv, expected] of [
      ["production", true],
      ["development", false],
      ["test", false],
      ["staging", false],
      [undefined, false],
    ] as const) {
      withEnv({ NODE_ENV: nodeEnv });
      expect(usesSmtp(), String(nodeEnv)).toBe(expected);
    }
  });
});

describe("readSmtpConfig", () => {
  it("returns the settings, with implicit TLS on 465", () => {
    withEnv({ NODE_ENV: "production" });
    expect(readSmtpConfig()).toEqual({
      host: "smtp.strato.de",
      port: 465,
      secure: true,
      user: "webmaster@dreyer-travels.de",
      pass: PASS_SENTINEL,
      from: "TravelBlogs <system@blogs.dreyer-travels.de>",
    });
  });

  it("is not secure (STARTTLS) on any other port", () => {
    withEnv({ NODE_ENV: "production", SMTP_PORT: "587" });
    expect(readSmtpConfig()).toMatchObject({ port: 587, secure: false });
  });

  it.each(SMTP_VARIABLES)("names %s when it is missing", (name) => {
    withEnv({ NODE_ENV: "production", [name]: undefined });
    expect(messageOf(() => readSmtpConfig())).toContain(`missing or empty: ${name}.`);
  });

  it.each(SMTP_VARIABLES)("treats a whitespace-only %s as missing", (name) => {
    withEnv({ NODE_ENV: "production", [name]: "   " });
    expect(messageOf(() => readSmtpConfig())).toContain(`missing or empty: ${name}.`);
  });

  it("names every missing variable at once, in a fixed order", () => {
    withEnv({
      NODE_ENV: "production",
      SMTP_PASS: undefined,
      SMTP_HOST: "",
      MAIL_FROM: undefined,
    });
    expect(messageOf(() => readSmtpConfig())).toContain(
      "missing or empty: SMTP_HOST, SMTP_PASS, MAIL_FROM.",
    );
  });

  it("points the operator to the README", () => {
    withEnv({ NODE_ENV: "production", SMTP_HOST: undefined });
    expect(messageOf(() => readSmtpConfig())).toContain('README.md, "Outgoing email"');
  });

  it.each(["abc", "0", "65536", "46 5", "465x", "46.5", "-1"])(
    "refuses the port %j with an exact message that names the variable, not the value",
    (port) => {
      withEnv({ NODE_ENV: "production", SMTP_PORT: port });
      expect(messageOf(() => readSmtpConfig())).toBe(PORT_MESSAGE);
    },
  );

  it("passes the password through untrimmed", () => {
    withEnv({ NODE_ENV: "production", SMTP_PASS: " pw " });
    expect(readSmtpConfig().pass).toBe(" pw ");
  });

  it("never prints a value, the password above all", () => {
    for (const env of [
      { SMTP_HOST: undefined },
      { SMTP_PORT: "nope" },
      { SMTP_USER: "", MAIL_FROM: undefined },
    ]) {
      withEnv({ NODE_ENV: "production", ...env });
      const message = messageOf(() => readSmtpConfig());
      expect(message).not.toContain(PASS_SENTINEL);
      expect(message).not.toContain("webmaster@dreyer-travels.de");
      expect(message).not.toContain("system@blogs.dreyer-travels.de");
      expect(message).not.toContain("smtp.strato.de");
    }
  });
});

describe("assertSmtpConfigured", () => {
  it("throws in production with a variable missing", () => {
    withEnv({ NODE_ENV: "production", SMTP_USER: undefined });
    expect(() => assertSmtpConfigured()).toThrow(/SMTP_USER/);
  });

  it("throws in production with a bad port", () => {
    withEnv({ NODE_ENV: "production", SMTP_PORT: "70000" });
    expect(() => assertSmtpConfigured()).toThrow(PORT_MESSAGE);
  });

  it("passes in production when all five are set", () => {
    withEnv({ NODE_ENV: "production" });
    expect(() => assertSmtpConfigured()).not.toThrow();
  });

  it("does not ask for SMTP outside production, where mail goes to the outbox", () => {
    for (const nodeEnv of ["development", "test", "staging", undefined]) {
      withEnv({ NODE_ENV: nodeEnv, ...ALL_UNSET });
      expect(() => assertSmtpConfigured(), String(nodeEnv)).not.toThrow();
    }
  });

  it("skips `next build`, which runs with NODE_ENV=production and sends no mail", () => {
    withEnv({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build", ...ALL_UNSET });
    expect(() => assertSmtpConfigured()).not.toThrow();
  });
});
