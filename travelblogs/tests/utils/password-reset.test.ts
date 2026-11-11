import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";

const testDatabaseUrl = "file:./prisma/test-password-reset.db";
const TOKEN_IN_LINK = /https:\/\/blogs\.example\.test\/set-password\?token=([A-Za-z0-9_-]{43})(?![A-Za-z0-9_-])/;

describe("requestPasswordReset", () => {
  let prisma: PrismaClient;
  let requestPasswordReset: (email: string) => Promise<void>;
  let hashAccountToken: (raw: string) => string;
  let getEmailOutbox: typeof import("../../src/utils/email").getEmailOutbox;
  let clearEmailOutbox: typeof import("../../src/utils/email").clearEmailOutbox;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    execSync("npx prisma migrate deploy", {
      stdio: "ignore",
      env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    });
    ({ prisma } = await import("../../src/utils/db"));
    ({ requestPasswordReset } = await import("../../src/utils/password-reset"));
    ({ hashAccountToken } = await import("../../src/utils/account-token"));
    ({ getEmailOutbox, clearEmailOutbox } = await import("../../src/utils/email"));
  });

  beforeEach(async () => {
    vi.stubEnv("NEXTAUTH_URL", "https://blogs.example.test");
    vi.stubEnv("CREATOR_EMAIL", "owner@example.com");
    clearEmailOutbox();
    await prisma.accountToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const createUser = (data: {
    email: string;
    id?: string;
    isActive?: boolean;
    preferredLanguage?: "de" | "en";
  }) =>
    prisma.user.create({
      data: { name: "User", role: "viewer", passwordHash: "hash", ...data },
    });

  it("mails a German user a German link and stores only the token's hash", async () => {
    const user = await createUser({ email: "viewer@example.com", preferredLanguage: "de" });
    const before = Date.now();

    await requestPasswordReset("viewer@example.com");

    const outbox = getEmailOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].to).toBe("viewer@example.com");
    expect(outbox[0].subject).toBe("TravelBlogs-Passwort zurücksetzen");
    expect(outbox[0].text).toContain("Hallo,");
    const match = outbox[0].text.match(TOKEN_IN_LINK);
    expect(match).not.toBeNull();
    const raw = match![1];

    const tokens = await prisma.accountToken.findMany();
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ userId: user.id, type: "reset", usedAt: null });
    expect(tokens[0].tokenHash).toBe(hashAccountToken(raw));
    expect(tokens[0].tokenHash).not.toContain(raw);
    const ttl = tokens[0].expiresAt.getTime() - before;
    expect(ttl).toBeGreaterThanOrEqual(60 * 60 * 1000 - 1000);
    expect(ttl).toBeLessThanOrEqual(60 * 60 * 1000 + 5000);
  });

  it("mails an English user in English", async () => {
    await createUser({ email: "viewer@example.com", preferredLanguage: "en" });

    await requestPasswordReset("viewer@example.com");

    const [mail] = getEmailOutbox();
    expect(mail.subject).toBe("Reset your TravelBlogs password");
    expect(mail.text).toContain("Open this link within one hour");
    expect(mail.text).toMatch(TOKEN_IN_LINK);
  });

  it("normalizes the address like sign-in does", async () => {
    await createUser({ email: "viewer@example.com" });

    await requestPasswordReset("  Viewer@Example.com ");

    expect(getEmailOutbox()).toHaveLength(1);
  });

  it.each([
    ["an unknown address", "nobody@example.com"],
    ["a deactivated user", "inactive@example.com"],
    ["the creator row", "creator-row@example.com"],
    ["the CREATOR_EMAIL address", "Owner@Example.com"],
  ])("sends nothing and creates no token for %s", async (_label, email) => {
    await createUser({ email: "inactive@example.com", isActive: false });
    await createUser({ email: "creator-row@example.com", id: "creator" });
    await createUser({ email: "owner@example.com" });

    await requestPasswordReset(email);

    expect(getEmailOutbox()).toHaveLength(0);
    expect(await prisma.accountToken.count()).toBe(0);
  });

  it("sends at most one mail per account within five minutes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-10T10:00:00Z"));
    await createUser({ email: "viewer@example.com" });

    await requestPasswordReset("viewer@example.com");
    vi.setSystemTime(new Date("2026-11-10T10:04:00Z"));
    await requestPasswordReset("viewer@example.com");

    expect(getEmailOutbox()).toHaveLength(1);
    expect(await prisma.accountToken.count()).toBe(1);

    vi.setSystemTime(new Date("2026-11-10T10:05:01Z"));
    await requestPasswordReset("viewer@example.com");

    expect(getEmailOutbox()).toHaveLength(2);
    expect(await prisma.accountToken.count()).toBe(2);
  });

  it("sends nothing and creates no token when NEXTAUTH_URL is not a valid URL", async () => {
    vi.stubEnv("NEXTAUTH_URL", "not a url");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    await createUser({ email: "viewer@example.com" });

    await requestPasswordReset("viewer@example.com");

    expect(getEmailOutbox()).toHaveLength(0);
    expect(await prisma.accountToken.count()).toBe(0);
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("viewer@example.com");
  });

  it("sends nothing and logs a fixed line when NEXTAUTH_URL is unset", async () => {
    vi.stubEnv("NEXTAUTH_URL", "");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    await createUser({ email: "viewer@example.com" });

    await requestPasswordReset("viewer@example.com");

    expect(getEmailOutbox()).toHaveLength(0);
    expect(await prisma.accountToken.count()).toBe(0);
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("viewer@example.com");
  });
});
