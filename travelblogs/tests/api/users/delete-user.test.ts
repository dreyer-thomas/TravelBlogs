import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-delete-user.db";

describe("DELETE /api/users/[id]", () => {
  let del: (
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
    del = routeModule.DELETE;
  });

  beforeEach(async () => {
    getToken.mockReset();
    await prisma.tripAccess.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("deletes a user without trips and cascades trip access", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const user = await prisma.user.create({
      data: {
        email: "delete.me@example.com",
        name: "Delete Me",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const trip = await prisma.trip.create({
      data: {
        title: "Shared Trip",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-05"),
        ownerId: "creator",
      },
    });

    await prisma.tripAccess.create({
      data: {
        tripId: trip.id,
        userId: user.id,
        canContribute: false,
      },
    });

    const request = new Request(`http://localhost/api/users/${user.id}`, {
      method: "DELETE",
    });

    const response = await del(request, { params: { id: user.id } });
    const body = await response.json();

    const remainingUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    const remainingAccess = await prisma.tripAccess.findMany({
      where: { userId: user.id },
    });

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.id).toBe(user.id);
    expect(remainingUser).toBeNull();
    expect(remainingAccess).toHaveLength(0);
  });

  it("blocks deleting the creator account", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const request = new Request("http://localhost/api/users/creator", {
      method: "DELETE",
    });

    const response = await del(request, { params: { id: "creator" } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("blocks deletion when the user owns trips", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const user = await prisma.user.create({
      data: {
        email: "owner@example.com",
        name: "Trip Owner",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    await prisma.trip.create({
      data: {
        title: "Owned Trip",
        startDate: new Date("2025-07-01"),
        endDate: new Date("2025-07-02"),
        ownerId: user.id,
      },
    });

    const request = new Request(`http://localhost/api/users/${user.id}`, {
      method: "DELETE",
    });

    const response = await del(request, { params: { id: user.id } });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("USER_HAS_TRIPS");
  });

  it("requires authentication", async () => {
    getToken.mockResolvedValue(null);

    const request = new Request("http://localhost/api/users/any", {
      method: "DELETE",
    });

    const response = await del(request, { params: { id: "any" } });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("blocks non-admin users", async () => {
    getToken.mockResolvedValue({ sub: "viewer" });

    const user = await prisma.user.create({
      data: {
        email: "blocked@example.com",
        name: "Blocked",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const request = new Request(`http://localhost/api/users/${user.id}`, {
      method: "DELETE",
    });

    const response = await del(request, { params: { id: user.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns not found for missing users", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const request = new Request("http://localhost/api/users/missing", {
      method: "DELETE",
    });

    const response = await del(request, { params: { id: "missing" } });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
