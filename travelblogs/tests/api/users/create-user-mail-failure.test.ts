import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-invitation-mail-failure.db";

/** What no log line may contain: the address, the name, the link or anything token-shaped. */
const expectSafeLog = (calls: unknown[][]) => {
  const logged = JSON.stringify(calls);
  expect(logged).not.toContain("new.viewer@example.com");
  expect(logged).not.toContain("Nora Viewer");
  expect(logged).not.toContain("set-password");
  expect(logged).not.toContain("token=");
  expect(logged).not.toMatch(/[A-Za-z0-9_-]{43}/);
  return logged;
};

describe("invitations when the mail transport fails", () => {
  let prisma: PrismaClient;
  let createUser: typeof import("../../../src/app/api/users/route").POST;
  let resend: typeof import("../../../src/app/api/users/[id]/invitations/route").POST;
  let accountToken: typeof import("../../../src/utils/account-token");

  beforeAll(async () => {
    vi.resetModules();
    vi.doMock("../../../src/utils/email", async (importOriginal) => {
      const original = await importOriginal<typeof import("../../../src/utils/email")>();
      return {
        ...original,
        sendEmail: vi.fn().mockRejectedValue(
          Object.assign(new Error("550 5.1.1 <new.viewer@example.com> unknown"), {
            code: "EENVELOPE",
            responseCode: 550,
          }),
        ),
      };
    });
    process.env.DATABASE_URL = testDatabaseUrl;
    execSync("npx prisma migrate deploy", {
      stdio: "ignore",
      env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    });
    ({ prisma } = await import("../../../src/utils/db"));
    ({ POST: createUser } = await import("../../../src/app/api/users/route"));
    ({ POST: resend } = await import("../../../src/app/api/users/[id]/invitations/route"));
    accountToken = await import("../../../src/utils/account-token");
  });

  beforeEach(async () => {
    getToken.mockReset();
    getToken.mockResolvedValue({ sub: "creator" });
    vi.stubEnv("NEXTAUTH_URL", "https://blogs.example.test");
    vi.stubEnv("CREATOR_EMAIL", "");
    vi.stubEnv("CREATOR_PASSWORD", "");
    await prisma.accountToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    vi.doUnmock("../../../src/utils/email");
    await prisma.$disconnect();
  });

  it("create still answers 201 with invitationSent false, keeps the pending user, drops the token", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await createUser(
      new Request("http://localhost/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "new.viewer@example.com", name: "Nora Viewer", role: "viewer" }),
      }) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({ invitationPending: true, invitationSent: false });
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "new.viewer@example.com" } });
    expect(user.invitationPending).toBe(true);
    expect(await prisma.accountToken.count()).toBe(0);

    expect(consoleError).toHaveBeenCalledTimes(1);
    const logged = expectSafeLog(consoleError.mock.calls);
    expect(logged).toContain("invitation: invitation mail not sent");
    expect(logged).toContain("EENVELOPE");
  });

  it("a failed resend answers 502 and leaves the earlier link usable", async () => {
    const user = await prisma.user.create({
      data: {
        email: "new.viewer@example.com",
        name: "Nora Viewer",
        role: "viewer",
        passwordHash: "unusable",
        invitationPending: true,
      },
    });
    const oldInvite = await accountToken.createAccountToken(user.id, "invite");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await resend(
      new Request(`http://localhost/api/users/${user.id}/invitations`, { method: "POST" }) as never,
      { params: Promise.resolve({ id: user.id }) },
    );

    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("INVITATION_NOT_SENT");
    const old = await prisma.accountToken.findUniqueOrThrow({
      where: { tokenHash: accountToken.hashAccountToken(oldInvite) },
    });
    expect(old.usedAt).toBeNull();
    expect(old.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(await prisma.accountToken.count()).toBe(1);
    expect(await accountToken.findUsableAccountToken(oldInvite)).toMatchObject({ type: "invite" });

    expect(consoleError).toHaveBeenCalledTimes(1);
    expectSafeLog(consoleError.mock.calls);
  });
});
