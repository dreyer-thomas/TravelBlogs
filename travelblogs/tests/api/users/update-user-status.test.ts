import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-user-status.db";

describe("PATCH /api/users/[id]/status", () => {
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

    const routeModule = await import("../../../src/app/api/users/[id]/status/route");
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

  it("allows admins to toggle user active status", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const user = await prisma.user.create({
      data: {
        email: "status.viewer@example.com",
        name: "Status Viewer",
        role: "viewer",
        isActive: true,
        passwordHash: "hash",
      },
    });

    const deactivateRequest = new Request(
      `http://localhost/api/users/${user.id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: false,
        }),
      },
    );

    const deactivateResponse = await patch(deactivateRequest, {
      params: { id: user.id },
    });
    const deactivated = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(deactivateResponse.status).toBe(200);
    expect(deactivated?.isActive).toBe(false);

    const activateRequest = new Request(
      `http://localhost/api/users/${user.id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: true,
        }),
      },
    );

    const activateResponse = await patch(activateRequest, {
      params: { id: user.id },
    });
    const reactivated = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(activateResponse.status).toBe(200);
    expect(reactivated?.isActive).toBe(true);
  });

  it("rejects invalid payloads", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const user = await prisma.user.create({
      data: {
        email: "status.invalid@example.com",
        name: "Status Invalid",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const request = new Request(
      `http://localhost/api/users/${user.id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: "no",
        }),
      },
    );

    const response = await patch(request, { params: { id: user.id } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns not found for missing users", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const request = new Request("http://localhost/api/users/missing/status", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        isActive: false,
      }),
    });

    const response = await patch(request, { params: { id: "missing" } });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("requires authentication", async () => {
    getToken.mockResolvedValue(null);

    const user = await prisma.user.create({
      data: {
        email: "status.auth@example.com",
        name: "Status Auth",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const request = new Request(
      `http://localhost/api/users/${user.id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: false,
        }),
      },
    );

    const response = await patch(request, { params: { id: user.id } });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("blocks non-admin users", async () => {
    getToken.mockResolvedValue({ sub: "viewer" });

    const user = await prisma.user.create({
      data: {
        email: "status.forbidden@example.com",
        name: "Status Forbidden",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const request = new Request(
      `http://localhost/api/users/${user.id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: false,
        }),
      },
    );

    const response = await patch(request, { params: { id: user.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("blocks deactivating the last active admin", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const admin = await prisma.user.create({
      data: {
        email: "last.admin@example.com",
        name: "Last Admin",
        role: "administrator",
        isActive: true,
        passwordHash: "hash",
      },
    });

    const request = new Request(
      `http://localhost/api/users/${admin.id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: false,
        }),
      },
    );

    const response = await patch(request, { params: { id: admin.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("allows deactivating the default admin when another admin remains", async () => {
    getToken.mockResolvedValue({ sub: "admin-user", role: "administrator" });

    await prisma.user.create({
      data: {
        id: "creator",
        email: "creator@example.com",
        name: "Creator",
        role: "creator",
        isActive: true,
        passwordHash: "hash",
      },
    });

    await prisma.user.create({
      data: {
        email: "backup.admin@example.com",
        name: "Backup Admin",
        role: "administrator",
        isActive: true,
        passwordHash: "hash",
      },
    });

    const request = new Request(
      "http://localhost/api/users/creator/status",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: false,
        }),
      },
    );

    const response = await patch(request, { params: { id: "creator" } });
    const body = await response.json();
    const creator = await prisma.user.findUnique({ where: { id: "creator" } });

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(creator?.isActive).toBe(false);
  });

  it("allows administrators to toggle status", async () => {
    getToken.mockResolvedValue({ sub: "admin-user", role: "administrator" });

    const user = await prisma.user.create({
      data: {
        email: "admin.status@example.com",
        name: "Admin Status",
        role: "viewer",
        isActive: true,
        passwordHash: "hash",
      },
    });

    const request = new Request(
      `http://localhost/api/users/${user.id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: false,
        }),
      },
    );

    const response = await patch(request, { params: { id: user.id } });
    const updated = await prisma.user.findUnique({ where: { id: user.id } });

    expect(response.status).toBe(200);
    expect(updated?.isActive).toBe(false);
  });
});
