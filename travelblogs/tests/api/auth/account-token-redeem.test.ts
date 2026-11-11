import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";

const testDatabaseUrl = "file:./prisma/test-account-token-redeem.db";

describe("POST /api/account-tokens/redeem", () => {
  let prisma: PrismaClient;
  let post: (request: Request) => Promise<Response>;
  let createAccountToken: typeof import("../../../src/utils/account-token").createAccountToken;
  let hashAccountToken: typeof import("../../../src/utils/account-token").hashAccountToken;
  let findUsableAccountToken: typeof import("../../../src/utils/account-token").findUsableAccountToken;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    execSync("npx prisma migrate deploy", {
      stdio: "ignore",
      env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    });
    ({ prisma } = await import("../../../src/utils/db"));
    ({ POST: post } = await import("../../../src/app/api/account-tokens/redeem/route"));
    ({ createAccountToken, hashAccountToken, findUsableAccountToken } = await import(
      "../../../src/utils/account-token"
    ));
  });

  beforeEach(async () => {
    await prisma.accountToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const createUser = (
    email: string,
    data: { isActive?: boolean; invitationPending?: boolean } = {},
  ) =>
    prisma.user.create({
      data: {
        email,
        name: "User",
        role: "viewer",
        passwordHash: "old-hash",
        mustChangePassword: true,
        ...data,
      },
    });

  const redeem = (token: string, password = "NewPass456!") =>
    post(
      new Request("http://localhost/api/account-tokens/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      }),
    );

  const tokenRow = (raw: string) =>
    prisma.accountToken.findUniqueOrThrow({ where: { tokenHash: hashAccountToken(raw) } });

  it("sets the password, clears mustChangePassword and invalidates the account's other tokens", async () => {
    const user = await createUser("viewer@example.com");
    const other = await createUser("other@example.com");
    const raw = await createAccountToken(user.id, "reset");
    const sibling = await createAccountToken(user.id, "invite");
    const othersToken = await createAccountToken(other.id, "reset");

    const response = await redeem(raw);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { type: "reset" }, error: null });
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await compare("NewPass456!", updated.passwordHash)).toBe(true);
    expect(updated.mustChangePassword).toBe(false);
    expect((await tokenRow(raw)).usedAt).not.toBeNull();
    expect((await tokenRow(sibling)).usedAt).not.toBeNull();
    expect((await tokenRow(othersToken)).usedAt).toBeNull();
    expect(await findUsableAccountToken(raw)).toBeNull();
  });

  it("rejects a token that was already used", async () => {
    const user = await createUser("viewer@example.com");
    const raw = await createAccountToken(user.id, "reset");
    expect((await redeem(raw)).status).toBe(200);

    const again = await redeem(raw, "Another789!");

    expect(again.status).toBe(400);
    expect((await again.json()).error.code).toBe("TOKEN_INVALID");
  });

  it("rejects an expired token", async () => {
    const user = await createUser("viewer@example.com");
    const raw = await createAccountToken(user.id, "reset");
    await prisma.accountToken.update({
      where: { tokenHash: hashAccountToken(raw) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect(await findUsableAccountToken(raw)).toBeNull();
    const response = await redeem(raw);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("TOKEN_INVALID");
  });

  it.each([
    ["unknown", "A".repeat(43)],
    ["malformed", "short"],
  ])("rejects an %s token", async (_label, raw) => {
    const response = await redeem(raw);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("TOKEN_INVALID");
  });

  it("rejects a tampered token", async () => {
    const user = await createUser("viewer@example.com");
    const raw = await createAccountToken(user.id, "reset");
    const tampered = `${raw.slice(0, -1)}${raw.endsWith("A") ? "B" : "A"}`;

    const response = await redeem(tampered);

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("TOKEN_INVALID");
    expect((await tokenRow(raw)).usedAt).toBeNull();
  });

  it("rejects a token owned by the creator row (id 'creator')", async () => {
    const creator = await prisma.user.create({
      data: { id: "creator", email: "owner@example.com", name: "Creator", role: "creator", passwordHash: "old-hash" },
    });
    const raw = await createAccountToken(creator.id, "reset");

    expect(await findUsableAccountToken(raw)).toBeNull();
    const response = await redeem(raw);

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("TOKEN_INVALID");
    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: creator.id } });
    expect(unchanged.passwordHash).toBe("old-hash");
    expect((await tokenRow(raw)).usedAt).toBeNull();
  });

  it("rejects a token owned by the CREATOR_EMAIL account", async () => {
    vi.stubEnv("CREATOR_EMAIL", " Owner@Example.com ");
    const user = await createUser("owner@example.com");
    const raw = await createAccountToken(user.id, "reset");

    expect(await findUsableAccountToken(raw)).toBeNull();
    const response = await redeem(raw);

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("TOKEN_INVALID");
    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(unchanged.passwordHash).toBe("old-hash");
    expect((await tokenRow(raw)).usedAt).toBeNull();
  });

  it("rejects a token whose user was deactivated and leaves the password alone", async () => {
    const user = await createUser("viewer@example.com");
    const raw = await createAccountToken(user.id, "reset");
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });

    expect(await findUsableAccountToken(raw)).toBeNull();
    const response = await redeem(raw);

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("TOKEN_INVALID");
    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(unchanged.passwordHash).toBe("old-hash");
    expect((await tokenRow(raw)).usedAt).toBeNull();
  });

  it("rejects a short password without consuming the token", async () => {
    const user = await createUser("viewer@example.com");
    const raw = await createAccountToken(user.id, "reset");

    const response = await redeem(raw, "  short  ");

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect((await tokenRow(raw)).usedAt).toBeNull();
  });

  it("lets exactly one of two concurrent redeems win", async () => {
    const user = await createUser("viewer@example.com");
    const raw = await createAccountToken(user.id, "reset");

    const responses = await Promise.all([redeem(raw, "FirstPass1!"), redeem(raw, "SecondPass2!")]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
  });
  it("accepts an invitation: sets the password and clears invitationPending", async () => {
    const user = await createUser("invitee@example.com", { invitationPending: true });
    const raw = await createAccountToken(user.id, "invite");

    const response = await redeem(raw, "Password123");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { type: "invite" }, error: null });
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.invitationPending).toBe(false);
    expect(await compare("Password123", updated.passwordHash)).toBe(true);
  });

  it("clears invitationPending when a pending user redeems a reset token", async () => {
    const user = await createUser("invitee@example.com", { invitationPending: true });
    const raw = await createAccountToken(user.id, "reset");

    const response = await redeem(raw);

    expect(response.status).toBe(200);
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.invitationPending).toBe(false);
  });
});
