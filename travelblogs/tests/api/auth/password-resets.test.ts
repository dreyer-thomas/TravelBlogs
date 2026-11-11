import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";

const testDatabaseUrl = "file:./prisma/test-password-resets-route.db";

describe("POST /api/password-resets", () => {
  let prisma: PrismaClient;
  let post: (request: Request) => Promise<Response>;
  let getEmailOutbox: typeof import("../../../src/utils/email").getEmailOutbox;
  let clearEmailOutbox: typeof import("../../../src/utils/email").clearEmailOutbox;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    execSync("npx prisma migrate deploy", {
      stdio: "ignore",
      env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    });
    ({ prisma } = await import("../../../src/utils/db"));
    ({ POST: post } = await import("../../../src/app/api/password-resets/route"));
    ({ getEmailOutbox, clearEmailOutbox } = await import("../../../src/utils/email"));
  });

  beforeEach(async () => {
    vi.stubEnv("NEXTAUTH_URL", "https://blogs.example.test");
    clearEmailOutbox();
    await prisma.accountToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.user.create({
      data: { email: "viewer@example.com", name: "Viewer", role: "viewer", passwordHash: "hash" },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const send = (body: string) =>
    post(
      new Request("http://localhost/api/password-resets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }),
    );

  it("answers known and unknown addresses identically, then mails the known one", async () => {
    const known = await send(JSON.stringify({ email: "viewer@example.com" }));
    const unknown = await send(JSON.stringify({ email: "nobody@example.com" }));

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    const knownText = await known.text();
    expect(knownText).toBe(await unknown.text());
    expect(JSON.parse(knownText)).toEqual({ data: { accepted: true }, error: null });

    await vi.waitFor(() => expect(getEmailOutbox()).toHaveLength(1));
    expect(getEmailOutbox()[0].to).toBe("viewer@example.com");
  });

  it("rejects an invalid address", async () => {
    const response = await send(JSON.stringify({ email: "not-an-address" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects invalid JSON", async () => {
    const response = await send("{");
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_JSON");
  });
});

describe("POST /api/password-resets when the mail fails", () => {
  const testDatabaseUrlFailing = "file:./prisma/test-password-resets-failing.db";
  let prisma: PrismaClient;
  let post: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    vi.resetModules();
    vi.doMock("../../../src/utils/email", async (importOriginal) => {
      const original = await importOriginal<typeof import("../../../src/utils/email")>();
      return {
        ...original,
        sendEmail: vi.fn().mockRejectedValue(
          Object.assign(new Error("550 5.1.1 <viewer@example.com> unknown"), {
            code: "EENVELOPE",
            responseCode: 550,
          }),
        ),
      };
    });
    process.env.DATABASE_URL = testDatabaseUrlFailing;
    execSync("npx prisma migrate deploy", {
      stdio: "ignore",
      env: { ...process.env, DATABASE_URL: testDatabaseUrlFailing },
    });
    ({ prisma } = await import("../../../src/utils/db"));
    ({ POST: post } = await import("../../../src/app/api/password-resets/route"));
  });

  afterAll(async () => {
    vi.doUnmock("../../../src/utils/email");
    vi.unstubAllEnvs();
    await prisma.$disconnect();
  });

  it("still answers success and logs one line without address, token or link", async () => {
    vi.stubEnv("NEXTAUTH_URL", "https://blogs.example.test");
    await prisma.accountToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.user.create({
      data: { email: "viewer@example.com", name: "Viewer", role: "viewer", passwordHash: "hash" },
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await post(
      new Request("http://localhost/api/password-resets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "viewer@example.com" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { accepted: true }, error: null });

    await vi.waitFor(() => expect(consoleError).toHaveBeenCalledTimes(1));
    const logged = JSON.stringify(consoleError.mock.calls);
    expect(logged).toContain("password-reset: reset mail not sent");
    expect(logged).toContain("EENVELOPE");
    expect(logged).not.toContain("viewer@example.com");
    expect(logged).not.toContain("set-password");
    expect(logged).not.toContain("token=");
    expect(logged).not.toMatch(/[A-Za-z0-9_-]{43}/);
    // The token of a mail that never left is dropped, so it cannot throttle the next attempt.
    expect(await prisma.accountToken.count()).toBe(0);
    consoleError.mockRestore();
  });
});
