import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-trip-viewers.db";

describe("/api/trips/[id]/viewers", () => {
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
      "../../../src/app/api/trips/[id]/viewers/route"
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

  it("lists invited viewers for the trip owner", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Viewer List",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    const viewer = await prisma.user.create({
      data: {
        email: "viewer@example.com",
        name: "Viewer",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const access = await prisma.tripAccess.create({
      data: {
        tripId: trip.id,
        userId: viewer.id,
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/viewers`,
      { method: "GET" },
    );

    const response = await get(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toEqual({
      id: access.id,
      tripId: trip.id,
      userId: viewer.id,
      canContribute: false,
      createdAt: access.createdAt.toISOString(),
      user: {
        id: viewer.id,
        name: viewer.name,
        email: viewer.email,
      },
    });
  });

  it("rejects list access for non-creator users", async () => {
    getToken.mockResolvedValue({ sub: "viewer-1" });

    const trip = await prisma.trip.create({
      data: {
        title: "Private list",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/viewers`,
      { method: "GET" },
    );

    const response = await get(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("rejects list access when the trip is not owned by the creator", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Other owner",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "someone-else",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/viewers`,
      { method: "GET" },
    );

    const response = await get(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("invites a viewer by email and normalizes case", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Invite Trip",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    const viewer = await prisma.user.create({
      data: {
        email: "viewer@example.com",
        name: "Viewer",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/viewers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "Viewer@Example.com",
        }),
      },
    );

    const response = await post(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.user.email).toBe("viewer@example.com");
    expect(body.data.user.id).toBe(viewer.id);

    const created = await prisma.tripAccess.findFirst({
      where: {
        tripId: trip.id,
        userId: viewer.id,
      },
    });

    expect(created).not.toBeNull();
    expect(created?.canContribute).toBe(false);
  });

  it("returns 404 when the invited user does not exist", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Invite Trip",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/viewers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "missing@example.com",
        }),
      },
    );

    const response = await post(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 when the invited user is inactive", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Invite Trip",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    await prisma.user.create({
      data: {
        email: "inactive@example.com",
        name: "Inactive",
        role: "viewer",
        passwordHash: "hash",
        isActive: false,
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/viewers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "inactive@example.com",
        }),
      },
    );

    const response = await post(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("rejects invites for non-viewer users", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Invite Trip",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    await prisma.user.create({
      data: {
        email: "creator@example.com",
        name: "Creator",
        role: "creator",
        passwordHash: "hash",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/viewers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "creator@example.com",
        }),
      },
    );

    const response = await post(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("is idempotent when the viewer is already invited", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Invite Trip",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    const viewer = await prisma.user.create({
      data: {
        email: "viewer@example.com",
        name: "Viewer",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const existing = await prisma.tripAccess.create({
      data: {
        tripId: trip.id,
        userId: viewer.id,
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/viewers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "viewer@example.com",
        }),
      },
    );

    const response = await post(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.id).toBe(existing.id);

    const accessCount = await prisma.tripAccess.count({
      where: {
        tripId: trip.id,
        userId: viewer.id,
      },
    });

    expect(accessCount).toBe(1);
  });

});
