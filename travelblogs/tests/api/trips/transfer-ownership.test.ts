import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-transfer-ownership.db";

describe("/api/trips/[id]/transfer-ownership", () => {
  let get: (
    request: Request,
    context: { params: { id: string } },
  ) => Promise<Response>;
  let post: (
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

    const routeModule = await import(
      "../../../src/app/api/trips/[id]/transfer-ownership/route"
    );
    get = routeModule.GET;
    post = routeModule.POST;
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

  it("allows the trip owner to transfer ownership", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Transfer",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    const newOwner = await prisma.user.create({
      data: {
        email: "new-owner@example.com",
        name: "New Owner",
        role: "creator",
        passwordHash: "hash",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/transfer-ownership`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: newOwner.id }),
      },
    );

    const response = await post(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.ownerId).toBe(newOwner.id);

    const updated = await prisma.trip.findUnique({
      where: { id: trip.id },
      select: { ownerId: true },
    });

    expect(updated?.ownerId).toBe(newOwner.id);
  });

  it("allows an administrator to transfer ownership", async () => {
    getToken.mockResolvedValue({ sub: "admin-1", role: "administrator" });

    await prisma.user.create({
      data: {
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "administrator",
        passwordHash: "hash",
      },
    });

    const trip = await prisma.trip.create({
      data: {
        title: "Admin Transfer",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    const newOwner = await prisma.user.create({
      data: {
        email: "creator-owner@example.com",
        name: "Creator Owner",
        role: "creator",
        passwordHash: "hash",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/transfer-ownership`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: newOwner.id }),
      },
    );

    const response = await post(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.ownerId).toBe(newOwner.id);
  });

  it("rejects transfers from non-owner creators", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Forbidden",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "someone-else",
      },
    });

    const target = await prisma.user.create({
      data: {
        email: "target@example.com",
        name: "Target",
        role: "creator",
        passwordHash: "hash",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/transfer-ownership`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: target.id }),
      },
    );

    const response = await post(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("rejects inactive targets", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Inactive",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    const target = await prisma.user.create({
      data: {
        email: "inactive@example.com",
        name: "Inactive",
        role: "creator",
        passwordHash: "hash",
        isActive: false,
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/transfer-ownership`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: target.id }),
      },
    );

    const response = await post(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects non-creator targets", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Viewer",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    const target = await prisma.user.create({
      data: {
        email: "viewer@example.com",
        name: "Viewer",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/transfer-ownership`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: target.id }),
      },
    );

    const response = await post(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("lists eligible owners for transfer", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Eligible",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    const admin = await prisma.user.create({
      data: {
        email: "admin@example.com",
        name: "Admin",
        role: "administrator",
        passwordHash: "hash",
      },
    });

    await prisma.user.create({
      data: {
        email: "viewer@example.com",
        name: "Viewer",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/transfer-ownership`,
      { method: "GET" },
    );

    const response = await get(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(admin.id);
    expect(body.data[0].role).toBe("administrator");
  });
});
