import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { compare, hash } from "bcryptjs";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-user-password.db";

describe("PATCH /api/users/[id]/password", () => {
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

    const routeModule = await import("../../../src/app/api/users/[id]/password/route");
    patch = routeModule.PATCH;
  });

  beforeEach(async () => {
    getToken.mockReset();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("updates the password and clears mustChangePassword", async () => {
    const passwordHash = await hash("OldPass123!", 12);
    const user = await prisma.user.create({
      data: {
        email: "viewer@example.com",
        name: "Viewer",
        role: "viewer",
        passwordHash,
        mustChangePassword: true,
      },
    });

    getToken.mockResolvedValue({ sub: user.id });

    const request = new Request(
      `http://localhost/api/users/${user.id}/password`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: "OldPass123!",
          newPassword: "NewPass456!",
        }),
      },
    );

    const response = await patch(request, { params: { id: user.id } });
    const body = await response.json();
    const updated = await prisma.user.findUnique({ where: { id: user.id } });

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(updated).not.toBeNull();
    expect(updated?.mustChangePassword).toBe(false);
    expect(updated?.passwordHash).not.toBe(passwordHash);
    expect(await compare("NewPass456!", updated?.passwordHash ?? "")).toBe(true);
  });

  it("rejects invalid current passwords", async () => {
    const passwordHash = await hash("OldPass123!", 12);
    const user = await prisma.user.create({
      data: {
        email: "blocked@example.com",
        name: "Blocked",
        role: "viewer",
        passwordHash,
        mustChangePassword: true,
      },
    });

    getToken.mockResolvedValue({ sub: user.id });

    const request = new Request(
      `http://localhost/api/users/${user.id}/password`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: "WrongPass!",
          newPassword: "NewPass456!",
        }),
      },
    );

    const response = await patch(request, { params: { id: user.id } });
    const body = await response.json();
    const updated = await prisma.user.findUnique({ where: { id: user.id } });

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
    expect(updated?.passwordHash).toBe(passwordHash);
    expect(updated?.mustChangePassword).toBe(true);
  });

  it("prevents users from changing another user's password", async () => {
    const passwordHash = await hash("OldPass123!", 12);
    const user = await prisma.user.create({
      data: {
        email: "owner@example.com",
        name: "Owner",
        role: "viewer",
        passwordHash,
      },
    });

    const other = await prisma.user.create({
      data: {
        email: "other@example.com",
        name: "Other",
        role: "viewer",
        passwordHash,
      },
    });

    getToken.mockResolvedValue({ sub: user.id });

    const request = new Request(
      `http://localhost/api/users/${other.id}/password`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: "OldPass123!",
          newPassword: "NewPass456!",
        }),
      },
    );

    const response = await patch(request, { params: { id: other.id } });
    const body = await response.json();
    const updated = await prisma.user.findUnique({ where: { id: other.id } });

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
    expect(updated?.passwordHash).toBe(passwordHash);
  });

  it("blocks legacy creator password changes", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const request = new Request("http://localhost/api/users/creator/password", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPassword: "OldPass123!",
        newPassword: "NewPass456!",
      }),
    });

    const response = await patch(request, { params: { id: "creator" } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("rejects invalid payloads", async () => {
    const passwordHash = await hash("OldPass123!", 12);
    const user = await prisma.user.create({
      data: {
        email: "invalid@example.com",
        name: "Invalid",
        role: "viewer",
        passwordHash,
      },
    });

    getToken.mockResolvedValue({ sub: user.id });

    const request = new Request(
      `http://localhost/api/users/${user.id}/password`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: "",
          newPassword: "short",
        }),
      },
    );

    const response = await patch(request, { params: { id: user.id } });
    const body = await response.json();
    const updated = await prisma.user.findUnique({ where: { id: user.id } });

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(updated?.passwordHash).toBe(passwordHash);
  });
});
