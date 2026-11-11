import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-user-roles.db";

describe("PATCH /api/users/[id]", () => {
  let patch: (
    request: Request,
    context: { params: { id: string } },
  ) => Promise<Response>;
  let prisma: PrismaClient;

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

    const routeModule = await import("../../../src/app/api/users/[id]/route");
    patch = routeModule.PATCH;
  });

  beforeEach(async () => {
    getToken.mockReset();
    await prisma.user.deleteMany();
    process.env.CREATOR_EMAIL = "";
    process.env.CREATOR_PASSWORD = "";
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("updates a user's role for admins", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const user = await prisma.user.create({
      data: {
        email: "role.viewer@example.com",
        name: "Role Viewer",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const request = new Request(`http://localhost/api/users/${user.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "creator",
      }),
    });

    const response = await patch(request, { params: { id: user.id } });
    const body = await response.json();
    const updated = await prisma.user.findUnique({ where: { id: user.id } });

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.role).toBe("creator");
    expect(updated?.role).toBe("creator");
  });

  it("rejects invalid role payloads", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const user = await prisma.user.create({
      data: {
        email: "invalid.role@example.com",
        name: "Invalid Role",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const request = new Request(`http://localhost/api/users/${user.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "admin",
      }),
    });

    const response = await patch(request, { params: { id: user.id } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("allows administrators to update roles", async () => {
    getToken.mockResolvedValue({ sub: "admin-user", role: "administrator" });

    const user = await prisma.user.create({
      data: {
        email: "admin.updates@example.com",
        name: "Admin Updates",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const request = new Request(`http://localhost/api/users/${user.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "creator",
      }),
    });

    const response = await patch(request, { params: { id: user.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
  });

  it("sets a user's role to administrator", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const user = await prisma.user.create({
      data: {
        email: "promote.admin@example.com",
        name: "Promote Admin",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const request = new Request(`http://localhost/api/users/${user.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "administrator",
      }),
    });

    const response = await patch(request, { params: { id: user.id } });
    const body = await response.json();
    const updated = await prisma.user.findUnique({ where: { id: user.id } });

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(updated?.role).toBe("administrator");
  });

  it("blocks demoting the last active admin", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const admin = await prisma.user.create({
      data: {
        email: "sole.admin@example.com",
        name: "Sole Admin",
        role: "administrator",
        passwordHash: "hash",
      },
    });

    const request = new Request(`http://localhost/api/users/${admin.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "viewer",
      }),
    });

    const response = await patch(request, { params: { id: admin.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("does not count a pending administrator when demoting the last active admin", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const admin = await prisma.user.create({
      data: {
        email: "active.admin@example.com",
        name: "Active Admin",
        role: "administrator",
        passwordHash: "hash",
      },
    });
    await prisma.user.create({
      data: {
        email: "pending.admin@example.com",
        name: "Pending Admin",
        role: "administrator",
        passwordHash: "hash",
        invitationPending: true,
      },
    });

    const response = await patchUser(admin.id, { role: "viewer" });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.message).toBe("Cannot remove the last active admin.");
  });

  it("requires authentication", async () => {
    getToken.mockResolvedValue(null);

    const user = await prisma.user.create({
      data: {
        email: "auth.required@example.com",
        name: "Auth Required",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const request = new Request(`http://localhost/api/users/${user.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "creator",
      }),
    });

    const response = await patch(request, { params: { id: user.id } });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects invalid JSON payloads", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const user = await prisma.user.create({
      data: {
        email: "invalid.json@example.com",
        name: "Invalid Json",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const request = new Request(`http://localhost/api/users/${user.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{",
    });

    const response = await patch(request, { params: { id: user.id } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_JSON");
  });

  it("prevents admins from changing their own role", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const user = await prisma.user.create({
      data: {
        id: "creator",
        email: "creator@example.com",
        name: "Creator Admin",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const request = new Request(`http://localhost/api/users/${user.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "creator",
      }),
    });

    const response = await patch(request, { params: { id: user.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("blocks non-admin users from changing roles", async () => {
    getToken.mockResolvedValue({ sub: "viewer" });

    const user = await prisma.user.create({
      data: {
        email: "blocked.role@example.com",
        name: "Blocked Role",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const request = new Request(`http://localhost/api/users/${user.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "creator",
      }),
    });

    const response = await patch(request, { params: { id: user.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  const patchUser = (id: string, payload: unknown) =>
    patch(
      new Request(`http://localhost/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      { params: { id } },
    );

  it("lets an administrator change another user's language only", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const user = await prisma.user.create({
      data: {
        email: "language.other@example.com",
        name: "Language Other",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const response = await patchUser(user.id, { preferredLanguage: "en" });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.preferredLanguage).toBe("en");
    expect(body.data.role).toBe("viewer");
    const reloaded = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(reloaded.preferredLanguage).toBe("en");
    expect(reloaded.role).toBe("viewer");
  });

  it("lets an administrator change their own language", async () => {
    const admin = await prisma.user.create({
      data: {
        email: "self.admin@example.com",
        name: "Self Admin",
        role: "administrator",
        passwordHash: "hash",
      },
    });
    getToken.mockResolvedValue({ sub: admin.id, role: "administrator" });

    const response = await patchUser(admin.id, { preferredLanguage: "en" });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.preferredLanguage).toBe("en");
    expect(body.data.role).toBe("administrator");
  });

  it("lets the language of the env-managed creator change", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    await prisma.user.create({
      data: {
        id: "creator",
        email: "creator@example.com",
        name: "Default creator",
        role: "creator",
        passwordHash: "hash",
      },
    });

    const response = await patchUser("creator", { preferredLanguage: "en" });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.preferredLanguage).toBe("en");
    expect(body.data.role).toBe("creator");
  });

  it("still forbids an administrator changing their own role", async () => {
    const admin = await prisma.user.create({
      data: {
        email: "self.role@example.com",
        name: "Self Role",
        role: "administrator",
        passwordHash: "hash",
      },
    });
    getToken.mockResolvedValue({ sub: admin.id, role: "administrator" });

    const response = await patchUser(admin.id, { role: "viewer", preferredLanguage: "en" });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
    expect(body.error.message).toBe("Cannot change your own role.");
    const reloaded = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
    expect(reloaded.preferredLanguage).toBe("de");
  });

  it("still forbids changing the creator's role", async () => {
    getToken.mockResolvedValue({ sub: "admin-other", role: "administrator" });
    await prisma.user.create({
      data: {
        id: "creator",
        email: "creator@example.com",
        name: "Default creator",
        role: "creator",
        passwordHash: "hash",
      },
    });

    const response = await patchUser("creator", { role: "viewer" });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.message).toBe("Cannot change creator role.");
  });

  it("rejects an empty body", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const user = await prisma.user.create({
      data: {
        email: "empty.body@example.com",
        name: "Empty Body",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const response = await patchUser(user.id, {});
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an unknown language", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const user = await prisma.user.create({
      data: {
        email: "bad.language@example.com",
        name: "Bad Language",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const response = await patchUser(user.id, { preferredLanguage: "fr" });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
  it("changes role and language together for another user", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const user = await prisma.user.create({
      data: {
        email: "both.fields@example.com",
        name: "Both Fields",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const response = await patchUser(user.id, {
      role: "creator",
      preferredLanguage: "en",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.role).toBe("creator");
    expect(body.data.preferredLanguage).toBe("en");
    const reloaded = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(reloaded.role).toBe("creator");
    expect(reloaded.preferredLanguage).toBe("en");
  });

  it("lets the language of the last active admin change", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const admin = await prisma.user.create({
      data: {
        email: "last.admin.language@example.com",
        name: "Last Admin",
        role: "administrator",
        passwordHash: "hash",
      },
    });

    const response = await patchUser(admin.id, { preferredLanguage: "en" });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.role).toBe("administrator");
    expect(body.data.preferredLanguage).toBe("en");
  });
});
