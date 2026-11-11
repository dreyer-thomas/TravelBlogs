import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const disconnect = vi.fn(async () => undefined);
  return {
    disconnect,
    PrismaClient: vi.fn(function PrismaClient(this: Record<string, unknown>) {
      this.$disconnect = disconnect;
    }),
    PrismaBetterSqlite3: vi.fn(function PrismaBetterSqlite3() {}),
    backfillGpsData: vi.fn(async () => undefined),
    backfillImageCompression: vi.fn(async () => undefined),
    backfillCountryCodes: vi.fn(async () => undefined),
    backfillWeather: vi.fn(async () => undefined),
  };
});

vi.mock("@prisma/client", () => ({ PrismaClient: mocks.PrismaClient }));
vi.mock("@prisma/adapter-better-sqlite3", () => ({
  PrismaBetterSqlite3: mocks.PrismaBetterSqlite3,
}));
vi.mock("../../src/utils/backfill-gps", () => ({ backfillGpsData: mocks.backfillGpsData }));
vi.mock("../../src/utils/backfill-image-compression", () => ({
  backfillImageCompression: mocks.backfillImageCompression,
}));
vi.mock("../../src/utils/backfill-country-codes", () => ({
  backfillCountryCodes: mocks.backfillCountryCodes,
}));
vi.mock("../../src/utils/backfill-weather", () => ({ backfillWeather: mocks.backfillWeather }));

import { register } from "../../src/instrumentation";

const SMTP_UNSET = {
  SMTP_HOST: undefined,
  SMTP_PORT: undefined,
  SMTP_USER: undefined,
  SMTP_PASS: undefined,
  MAIL_FROM: undefined,
};

const SMTP_SET = {
  SMTP_HOST: "smtp.example.test",
  SMTP_PORT: "465",
  SMTP_USER: "user@example.test",
  SMTP_PASS: "secret",
  MAIL_FROM: "TravelBlogs <system@example.test>",
};

const stub = (env: Record<string, string | undefined>) => {
  for (const [key, value] of Object.entries({ NEXT_PHASE: undefined, ...env })) {
    vi.stubEnv(key, value);
  }
};

const backfills = () => [
  mocks.backfillGpsData,
  mocks.backfillImageCompression,
  mocks.backfillCountryCodes,
  mocks.backfillWeather,
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("instrumentation register", () => {
  it("rejects in production when SMTP settings are missing, naming them, before any backfill", async () => {
    stub({ NEXT_RUNTIME: "nodejs", NODE_ENV: "production", ...SMTP_UNSET });
    await expect(register()).rejects.toThrow(
      "SMTP is not configured, missing or empty: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM.",
    );
    expect(mocks.PrismaClient).not.toHaveBeenCalled();
    for (const backfill of backfills()) {
      expect(backfill).not.toHaveBeenCalled();
    }
  });

  it("runs the backfills in production when all five are set", async () => {
    stub({ NEXT_RUNTIME: "nodejs", NODE_ENV: "production", ...SMTP_SET });
    await expect(register()).resolves.toBeUndefined();
    expect(mocks.backfillGpsData).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => {
      expect(mocks.backfillWeather).toHaveBeenCalledTimes(1);
      expect(mocks.disconnect).toHaveBeenCalled();
    });
    expect(mocks.backfillImageCompression).toHaveBeenCalledTimes(1);
    expect(mocks.backfillCountryCodes).toHaveBeenCalledTimes(1);
  });

  it("does not demand SMTP outside production", async () => {
    stub({ NEXT_RUNTIME: "nodejs", NODE_ENV: "test", ...SMTP_UNSET });
    await expect(register()).resolves.toBeUndefined();
    expect(mocks.backfillGpsData).toHaveBeenCalledTimes(1);
  });

  it("does nothing outside the Node runtime", async () => {
    stub({ NEXT_RUNTIME: "edge", NODE_ENV: "production", ...SMTP_UNSET });
    await expect(register()).resolves.toBeUndefined();
    expect(mocks.PrismaClient).not.toHaveBeenCalled();
    for (const backfill of backfills()) {
      expect(backfill).not.toHaveBeenCalled();
    }
  });
});
