import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-users.db";

describe("/api/users", () => {
  let post: (request: Request) => Promise<Response>;
  let get: (request: Request) => Promise<Response>;
  let prisma: PrismaClient;
  let getEmailOutbox: typeof import("../../../src/utils/email").getEmailOutbox;
  let clearEmailOutbox: typeof import("../../../src/utils/email").clearEmailOutbox;
  let hashAccountToken: typeof import("../../../src/utils/account-token").hashAccountToken;
  let validateCredentials: typeof import("../../../src/utils/auth").validateCredentials;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    execSync("npx prisma migrate deploy", {
      stdio: "ignore",
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl,
      },
    });

    const prismaModule = await import("@prisma/client");
    const adapter = new PrismaBetterSqlite3({
      url: testDatabaseUrl.replace(/^file:/, ""),
    });
    prisma = new prismaModule.PrismaClient({ adapter });

    const routeModule = await import("../../../src/app/api/users/route");
    post = routeModule.POST;
    get = routeModule.GET;
    ({ getEmailOutbox, clearEmailOutbox } = await import("../../../src/utils/email"));
    ({ hashAccountToken } = await import("../../../src/utils/account-token"));
    ({ validateCredentials } = await import("../../../src/utils/auth"));
  });

  beforeEach(async () => {
    getToken.mockReset();
    vi.stubEnv("NEXTAUTH_URL", "https://blogs.example.test");
    clearEmailOutbox();
    await prisma.accountToken.deleteMany();
    await prisma.user.deleteMany();
    process.env.CREATOR_EMAIL = "";
    process.env.CREATOR_PASSWORD = "";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a user with valid data", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const request = new Request("http://localhost/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "new.viewer@example.com",
        name: "New Viewer",
        role: "viewer",
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.email).toBe("new.viewer@example.com");
    expect(body.data.role).toBe("viewer");
    expect(body.data.isActive).toBe(true);

    const created = await prisma.user.findUnique({
      where: { email: "new.viewer@example.com" },
    });
    expect(created).not.toBeNull();
    expect(created).toMatchObject({ mustChangePassword: false, invitationPending: true });
    expect(body.data.invitationPending).toBe(true);
    expect(body.data.invitationSent).toBe(true);
  });

  it("allows administrators to create and list users", async () => {
    getToken.mockResolvedValue({ sub: "admin-1", role: "administrator" });

    const request = new Request("http://localhost/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "admin.created@example.com",
        name: "Admin Created",
        role: "viewer",
      }),
    });

    const createResponse = await post(request);
    const createdBody = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createdBody.error).toBeNull();

    const listResponse = await get(new Request("http://localhost/api/users", { method: "GET" }));
    const listBody = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listBody.error).toBeNull();
    expect(listBody.data.some((user: { email: string }) => user.email === "admin.created@example.com")).toBe(true);
  });

  it("lists users for admins", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    await prisma.user.create({
      data: {
        email: "creator@example.com",
        name: "Creator",
        role: "creator",
        passwordHash: "hash",
      },
    });

    const request = new Request("http://localhost/api/users", {
      method: "GET",
    });

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].email).toBe("creator@example.com");
    expect(body.data[0].createdAt).toMatch(/Z$/);
  });

  it("adds the default creator to the list when configured", async () => {
    getToken.mockResolvedValue({ sub: "admin-1", role: "administrator" });
    process.env.CREATOR_EMAIL = "default.creator@example.com";
    process.env.CREATOR_PASSWORD = "CreatorPassword123!";

    const request = new Request("http://localhost/api/users", {
      method: "GET",
    });

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();

    const creatorRow = body.data.find(
      (user: { id: string }) => user.id === "creator",
    );

    expect(creatorRow).toMatchObject({
      id: "creator",
      email: "default.creator@example.com",
      role: "creator",
      isActive: true,
      name: "Default creator",
    });

    const creatorRecord = await prisma.user.findUnique({
      where: { id: "creator" },
    });
    expect(creatorRecord).not.toBeNull();
  });

  it("rejects invalid payloads", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const request = new Request("http://localhost/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "not-an-email",
        name: "",
        role: "viewer",
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects duplicate email addresses", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    await prisma.user.create({
      data: {
        email: "duplicate@example.com",
        name: "Original",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const request = new Request("http://localhost/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "duplicate@example.com",
        name: "Duplicate",
        role: "viewer",
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("DUPLICATE_USER");
  });

  it("rejects non-admin requests", async () => {
    getToken.mockResolvedValue({ sub: "viewer" });

    const request = new Request("http://localhost/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "blocked@example.com",
        name: "Blocked",
        role: "viewer",
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("rejects unauthenticated requests", async () => {
    getToken.mockResolvedValue(null);

    const request = new Request("http://localhost/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "unauth@example.com",
        name: "Unauth",
        role: "viewer",
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  const postUser = (payload: Record<string, unknown>) =>
    post(
      new Request("http://localhost/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "language.user@example.com",
          name: "Language User",
          role: "viewer",
            ...payload,
        }),
      }),
    );

  it("defaults preferredLanguage to German when not sent", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const response = await postUser({});
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.preferredLanguage).toBe("de");
    const created = await prisma.user.findUnique({
      where: { email: "language.user@example.com" },
    });
    expect(created?.preferredLanguage).toBe("de");
  });

  it("stores an explicit English preferredLanguage", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const response = await postUser({ preferredLanguage: "en" });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.preferredLanguage).toBe("en");
    const created = await prisma.user.findUnique({
      where: { email: "language.user@example.com" },
    });
    expect(created?.preferredLanguage).toBe("en");
  });

  it("rejects an unknown preferredLanguage", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const response = await postUser({ preferredLanguage: "fr" });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(
      await prisma.user.count({ where: { email: "language.user@example.com" } }),
    ).toBe(0);
  });

  it("includes preferredLanguage in the user list", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    await prisma.user.create({
      data: {
        email: "listed.en@example.com",
        name: "Listed EN",
        role: "viewer",
        passwordHash: "hash",
        preferredLanguage: "en",
      },
    });
    await prisma.user.create({
      data: {
        email: "listed.de@example.com",
        name: "Listed DE",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const response = await get(new Request("http://localhost/api/users"));
    const body = await response.json();

    expect(response.status).toBe(200);
    const byEmail = Object.fromEntries(
      body.data.map((user: { email: string; preferredLanguage: string }) => [
        user.email,
        user.preferredLanguage,
      ]),
    );
    expect(byEmail["listed.en@example.com"]).toBe("en");
    expect(byEmail["listed.de@example.com"]).toBe("de");
  });

  it("keeps the default creator's preferredLanguage when it is re-synced", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    process.env.CREATOR_EMAIL = "env.creator@example.com";
    process.env.CREATOR_PASSWORD = "Password123!";
    await prisma.user.create({
      data: {
        id: "creator",
        email: "old.creator@example.com",
        name: "Old name",
        role: "creator",
        passwordHash: "hash",
        preferredLanguage: "en",
      },
    });

    const response = await get(new Request("http://localhost/api/users"));
    expect(response.status).toBe(200);

    const creator = await prisma.user.findUniqueOrThrow({ where: { id: "creator" } });
    expect(creator.email).toBe("env.creator@example.com");
    expect(creator.preferredLanguage).toBe("en");
  });

  const tokenFromMail = (text: string) => {
    const match = text.match(/https:\/\/blogs\.example\.test\/set-password\?token=([A-Za-z0-9_-]{43})(?![A-Za-z0-9_-])/);
    expect(match).not.toBeNull();
    return match![1];
  };

  it("invites a German user: pending account, one German mail with a 7-day invite link", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const response = await postUser({ email: "invitee@example.com", name: "Ida Invitee" });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data).toMatchObject({
      email: "invitee@example.com",
      invitationPending: true,
      invitationSent: true,
      preferredLanguage: "de",
    });
    const created = await prisma.user.findUniqueOrThrow({ where: { email: "invitee@example.com" } });
    expect(created.mustChangePassword).toBe(false);
    expect(created.invitationPending).toBe(true);

    const outbox = getEmailOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].to).toBe("invitee@example.com");
    expect(outbox[0].subject).toBe("Einladung zu TravelBlogs");
    expect(outbox[0].text).toContain("Hallo Ida Invitee,");
    const raw = tokenFromMail(outbox[0].text);

    const token = await prisma.accountToken.findUniqueOrThrow({
      where: { tokenHash: hashAccountToken(raw) },
    });
    expect(token.type).toBe("invite");
    expect(token.userId).toBe(created.id);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(token.expiresAt.getTime() - (Date.now() + sevenDays))).toBeLessThan(60_000);
  });

  it("sends the invitation in English when chosen", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const response = await postUser({ preferredLanguage: "en" });

    expect(response.status).toBe(201);
    const outbox = getEmailOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].subject).toBe("You're invited to TravelBlogs");
    expect(outbox[0].text).toContain("Hello Language User,");
    tokenFromMail(outbox[0].text);
  });

  it("stores the email trimmed and lowercased and catches a mixed-case duplicate", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const first = await postUser({ email: "  New.Viewer@Example.com " });
    expect(first.status).toBe(201);
    expect((await first.json()).data.email).toBe("new.viewer@example.com");
    expect(getEmailOutbox()[0].to).toBe("new.viewer@example.com");

    const second = await postUser({ email: "NEW.VIEWER@example.com" });
    expect(second.status).toBe(409);
    expect((await second.json()).error.code).toBe("DUPLICATE_USER");
    expect(await prisma.user.count()).toBe(1);
  });

  it("refuses to invite the CREATOR_EMAIL address in any letter case", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    vi.stubEnv("CREATOR_EMAIL", "Owner@Example.com");

    const response = await postUser({ email: "OWNER@example.com" });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("DUPLICATE_USER");
    expect(await prisma.user.count({ where: { email: "owner@example.com" } })).toBe(0);
    expect(getEmailOutbox()).toHaveLength(0);
  });

  it("rejects a body with a password key: no user, no mail", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const response = await postUser({ password: "Password123!" });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(await prisma.user.count()).toBe(0);
    expect(getEmailOutbox()).toHaveLength(0);
  });

  it("rejects any unknown key", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const response = await postUser({ isActive: false });

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect(await prisma.user.count()).toBe(0);
  });

  it("creates the user without a mail when NEXTAUTH_URL is missing", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    vi.stubEnv("NEXTAUTH_URL", "");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await postUser({});
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({ invitationPending: true, invitationSent: false });
    expect(await prisma.user.count({ where: { email: "language.user@example.com" } })).toBe(1);
    expect(await prisma.accountToken.count()).toBe(0);
    expect(getEmailOutbox()).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it("lets nobody sign in to the new account before the invitation is accepted", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    await postUser({});

    for (const password of ["", "Password123!", "anything at all"]) {
      expect(await validateCredentials("language.user@example.com", password)).toMatchObject({
        success: false,
        errorCode: "INVALID_CREDENTIALS",
      });
    }
  });

  it("reports invitationPending in the user list", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    await postUser({ email: "pending@example.com" });
    await prisma.user.create({
      data: { email: "active@example.com", name: "Active", role: "viewer", passwordHash: "hash" },
    });

    const body = await (await get(new Request("http://localhost/api/users"))).json();
    const byEmail = Object.fromEntries(
      body.data.map((user: { email: string; invitationPending: boolean }) => [
        user.email,
        user.invitationPending,
      ]),
    );
    expect(byEmail).toEqual({ "pending@example.com": true, "active@example.com": false });
  });
});
