import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-resend-invitation.db";

const TOKEN_IN_MAIL = /\/set-password\?token=([A-Za-z0-9_-]{43})(?![A-Za-z0-9_-])/;

describe("POST /api/users/[id]/invitations", () => {
  let prisma: PrismaClient;
  let resend: typeof import("../../../src/app/api/users/[id]/invitations/route").POST;
  let createUser: typeof import("../../../src/app/api/users/route").POST;
  let getEmailOutbox: typeof import("../../../src/utils/email").getEmailOutbox;
  let clearEmailOutbox: typeof import("../../../src/utils/email").clearEmailOutbox;
  let accountToken: typeof import("../../../src/utils/account-token");
  let validateCredentials: typeof import("../../../src/utils/auth").validateCredentials;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    execSync("npx prisma migrate deploy", {
      stdio: "ignore",
      env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    });
    ({ prisma } = await import("../../../src/utils/db"));
    ({ POST: resend } = await import("../../../src/app/api/users/[id]/invitations/route"));
    ({ POST: createUser } = await import("../../../src/app/api/users/route"));
    ({ getEmailOutbox, clearEmailOutbox } = await import("../../../src/utils/email"));
    accountToken = await import("../../../src/utils/account-token");
    ({ validateCredentials } = await import("../../../src/utils/auth"));
  });

  beforeEach(async () => {
    getToken.mockReset();
    getToken.mockResolvedValue({ sub: "admin-1", role: "administrator" });
    vi.stubEnv("NEXTAUTH_URL", "https://blogs.example.test");
    vi.stubEnv("CREATOR_EMAIL", "");
    vi.stubEnv("CREATOR_PASSWORD", "");
    clearEmailOutbox();
    await prisma.accountToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const pendingUser = (
    data: { email?: string; isActive?: boolean; invitationPending?: boolean; id?: string } = {},
  ) =>
    prisma.user.create({
      data: {
        email: "invitee@example.com",
        name: "Ida Invitee",
        role: "viewer",
        passwordHash: "unusable",
        invitationPending: true,
        ...data,
      },
    });

  const post = (id: string) =>
    resend(
      new Request(`http://localhost/api/users/${id}/invitations`, { method: "POST" }) as never,
      { params: Promise.resolve({ id }) },
    );

  const tokenRow = (raw: string) =>
    prisma.accountToken.findUniqueOrThrow({
      where: { tokenHash: accountToken.hashAccountToken(raw) },
    });

  const lastMailToken = () => {
    const outbox = getEmailOutbox();
    const match = outbox[outbox.length - 1].text.match(TOKEN_IN_MAIL);
    expect(match).not.toBeNull();
    return match![1];
  };

  it("sends a new mail in the current language and invalidates only older invite links", async () => {
    const user = await pendingUser();
    const oldInvite = await accountToken.createAccountToken(user.id, "invite");
    const reset = await accountToken.createAccountToken(user.id, "reset");
    await prisma.user.update({ where: { id: user.id }, data: { preferredLanguage: "en" } });

    const response = await post(user.id);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: { invitationSent: true }, error: null });
    const outbox = getEmailOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].to).toBe("invitee@example.com");
    expect(outbox[0].subject).toBe("You're invited to TravelBlogs");

    const fresh = lastMailToken();
    expect((await tokenRow(oldInvite)).usedAt).not.toBeNull();
    expect((await tokenRow(reset)).usedAt).toBeNull();
    expect(await accountToken.findUsableAccountToken(fresh)).toMatchObject({ type: "invite" });

    expect(await accountToken.redeemAccountToken(oldInvite, "Password123")).toEqual({ ok: false });
  });

  it("refuses a user who already accepted", async () => {
    const user = await pendingUser({ invitationPending: false });
    const response = await post(user.id);
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("INVITATION_NOT_PENDING");
    expect(getEmailOutbox()).toHaveLength(0);
  });

  it("refuses an inactive user", async () => {
    const user = await pendingUser({ isActive: false });
    const response = await post(user.id);
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("USER_INACTIVE");
    expect(getEmailOutbox()).toHaveLength(0);
  });

  it("refuses the creator row and the CREATOR_EMAIL account", async () => {
    await pendingUser({ id: "creator", email: "creator-row@example.com" });
    expect((await post("creator")).status).toBe(403);

    vi.stubEnv("CREATOR_EMAIL", "Env.Creator@example.com");
    const envCreator = await pendingUser({ email: "env.creator@example.com" });
    const response = await post(envCreator.id);
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
    expect(getEmailOutbox()).toHaveLength(0);
  });

  it("answers 404 for an unknown id", async () => {
    const response = await post("missing");
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
  });

  it("requires an admin session", async () => {
    const user = await pendingUser();

    getToken.mockResolvedValue(null);
    expect((await post(user.id)).status).toBe(401);

    getToken.mockResolvedValue({ sub: "viewer-1", role: "viewer" });
    expect((await post(user.id)).status).toBe(403);
    expect(getEmailOutbox()).toHaveLength(0);
  });

  it("lets the creator resend", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const user = await pendingUser();
    expect((await post(user.id)).status).toBe(201);
  });

  it("answers 502 when NEXTAUTH_URL is missing and keeps the earlier link", async () => {
    const user = await pendingUser();
    const oldInvite = await accountToken.createAccountToken(user.id, "invite");
    vi.stubEnv("NEXTAUTH_URL", "");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await post(user.id);

    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("INVITATION_NOT_SENT");
    expect((await tokenRow(oldInvite)).usedAt).toBeNull();
    expect(await prisma.accountToken.count()).toBe(1);
    errorSpy.mockRestore();
  });

  it("rejects an expired invite token", async () => {
    const user = await pendingUser();
    const raw = await accountToken.createAccountToken(user.id, "invite");
    await prisma.accountToken.update({
      where: { tokenHash: accountToken.hashAccountToken(raw) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect(await accountToken.findUsableAccountToken(raw)).toBeNull();
    expect(await accountToken.redeemAccountToken(raw, "Password123")).toEqual({ ok: false });
  });

  it("keeps the newest link working when two resends overlap", async () => {
    const user = await pendingUser();

    const responses = await Promise.all([post(user.id), post(user.id)]);

    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    const outbox = getEmailOutbox();
    expect(outbox).toHaveLength(2);
    const usable = await Promise.all(
      outbox.map((mail) => accountToken.findUsableAccountToken(mail.text.match(TOKEN_IN_MAIL)![1])),
    );
    expect(usable.filter(Boolean)).toHaveLength(1);
  });

  it("orders invite tokens created in the same millisecond by id", async () => {
    const user = await pendingUser();
    const raws = [];
    for (let index = 0; index < 20; index += 1) {
      raws.push(await accountToken.createAccountToken(user.id, "invite"));
    }
    const rows = await Promise.all(raws.map(tokenRow));
    for (let index = 1; index < rows.length; index += 1) {
      const [earlier, later] = [rows[index - 1], rows[index]];
      expect(
        earlier.createdAt < later.createdAt ||
          (earlier.createdAt.getTime() === later.createdAt.getTime() && earlier.id < later.id),
      ).toBe(true);
    }
  });

  it("still answers 201 when invalidating older links fails after the mail went out", async () => {
    const user = await pendingUser();
    const oldInvite = await accountToken.createAccountToken(user.id, "invite");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const updateSpy = vi
      .spyOn(prisma.accountToken, "updateMany")
      .mockRejectedValueOnce(new Error("SQLITE_BUSY"));

    const response = await post(user.id);

    expect(response.status).toBe(201);
    expect(getEmailOutbox()).toHaveLength(1);
    expect((await tokenRow(oldInvite)).usedAt).toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    updateSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("does not let an invite link work once the invitation was accepted", async () => {
    const user = await pendingUser();
    const raw = await accountToken.createAccountToken(user.id, "invite");
    await prisma.user.update({ where: { id: user.id }, data: { invitationPending: false } });

    expect(await accountToken.findUsableAccountToken(raw)).toBeNull();
    expect(await accountToken.redeemAccountToken(raw, "Password123")).toEqual({ ok: false });
    const reset = await accountToken.createAccountToken(user.id, "reset");
    expect(await accountToken.findUsableAccountToken(reset)).toMatchObject({ type: "reset" });
  });

  it("reports a created but not invited user when creating the token fails", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const createSpy = vi
      .spyOn(prisma.accountToken, "create")
      .mockRejectedValueOnce(new Error("SQLITE_BUSY"));

    const response = await createUser(
      new Request("http://localhost/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "busy@example.com", name: "Busy", role: "viewer" }),
      }) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({ invitationPending: true, invitationSent: false });
    expect(await prisma.user.count({ where: { email: "busy@example.com" } })).toBe(1);
    expect(getEmailOutbox()).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    createSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("end to end: create, take the link from the mail, accept, sign in", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const created = await createUser(
      new Request("http://localhost/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "Flow@Example.com", name: "Flo", role: "viewer" }),
      }) as never,
    );
    expect(created.status).toBe(201);

    const raw = lastMailToken();
    expect(await accountToken.redeemAccountToken(raw, "Password123")).toEqual({
      ok: true,
      type: "invite",
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { email: "flow@example.com" } });
    expect(user.invitationPending).toBe(false);
    expect(await validateCredentials("flow@example.com", "Password123")).toMatchObject({
      success: true,
    });
  });
});
