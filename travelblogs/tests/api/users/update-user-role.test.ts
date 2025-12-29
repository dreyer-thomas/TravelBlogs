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
});
