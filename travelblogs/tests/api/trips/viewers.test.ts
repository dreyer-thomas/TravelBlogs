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
  let eligibleGet: (
    request: Request,
    context: { params: { id: string } },
  ) => Promise<Response>;
  let del: (
    request: Request,
    context: { params: { id: string; userId: string } },
  ) => Promise<Response>;
  let patch: (
    request: Request,
    context: { params: { id: string; userId: string } },
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
    const eligibleModule = await import(
      "../../../src/app/api/trips/[id]/viewers/eligible/route"
    );
    const deleteModule = await import(
      "../../../src/app/api/trips/[id]/viewers/[userId]/route"
    );
    get = routeModule.GET;
    post = routeModule.POST;
    eligibleGet = eligibleModule.GET;
    del = deleteModule.DELETE;
    patch = deleteModule.PATCH;
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
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

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
    getToken.mockResolvedValue({ sub: "viewer-1", role: "viewer" });

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
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

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
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

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
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

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
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

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

  it("invites an active creator by email", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Invite Trip",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    const creator = await prisma.user.create({
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

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.user.id).toBe(creator.id);
  });

  it("invites a user by userId", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Invite by id",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    const viewer = await prisma.user.create({
      data: {
        email: "viewer-2@example.com",
        name: "Viewer Two",
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
          userId: viewer.id,
        }),
      },
    );

    const response = await post(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.user.id).toBe(viewer.id);
  });

  it("returns 404 when inviting a missing userId", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Invite by id",
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
          userId: "missing-user",
        }),
      },
    );

    const response = await post(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 when inviting an inactive userId", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Invite by id",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    await prisma.user.create({
      data: {
        id: "inactive-user",
        email: "inactive-id@example.com",
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
          userId: "inactive-user",
        }),
      },
    );

    const response = await post(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("is idempotent when the viewer is already invited", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

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

  it("lists eligible invitees excluding the owner, inactive users, and existing invites", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Eligible list",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    await prisma.user.create({
      data: {
        id: "creator",
        email: "owner@example.com",
        name: "Owner",
        role: "creator",
        passwordHash: "hash",
      },
    });

    const invitedViewer = await prisma.user.create({
      data: {
        email: "invited@example.com",
        name: "Invited Viewer",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    await prisma.tripAccess.create({
      data: {
        tripId: trip.id,
        userId: invitedViewer.id,
      },
    });

    await prisma.user.create({
      data: {
        email: "inactive@example.com",
        name: "Inactive Viewer",
        role: "viewer",
        passwordHash: "hash",
        isActive: false,
      },
    });

    const eligibleCreator = await prisma.user.create({
      data: {
        email: "creator2@example.com",
        name: "Alex Creator",
        role: "creator",
        passwordHash: "hash",
      },
    });

    const eligibleViewer = await prisma.user.create({
      data: {
        email: "viewer2@example.com",
        name: "Zoe Viewer",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/viewers/eligible`,
      { method: "GET" },
    );

    const response = await eligibleGet(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual([
      {
        id: eligibleCreator.id,
        name: eligibleCreator.name,
        email: eligibleCreator.email,
        role: eligibleCreator.role,
        createdAt: eligibleCreator.createdAt.toISOString(),
        updatedAt: eligibleCreator.updatedAt.toISOString(),
      },
      {
        id: eligibleViewer.id,
        name: eligibleViewer.name,
        email: eligibleViewer.email,
        role: eligibleViewer.role,
        createdAt: eligibleViewer.createdAt.toISOString(),
        updatedAt: eligibleViewer.updatedAt.toISOString(),
      },
    ]);
  });

  it("rejects eligible invitee access when unauthenticated", async () => {
    getToken.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/trips/trip-1/viewers/eligible",
      { method: "GET" },
    );

    const response = await eligibleGet(request, { params: { id: "trip-1" } });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects eligible invitee access for non-creators", async () => {
    getToken.mockResolvedValue({ sub: "viewer-1", role: "viewer" });

    const request = new Request(
      "http://localhost/api/trips/trip-1/viewers/eligible",
      { method: "GET" },
    );

    const response = await eligibleGet(request, { params: { id: "trip-1" } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("removes an invited user for the trip owner", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Remove access",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    const viewer = await prisma.user.create({
      data: {
        email: "remove@example.com",
        name: "Remove Viewer",
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
      `http://localhost/api/trips/${trip.id}/viewers/${viewer.id}`,
      { method: "DELETE" },
    );

    const response = await del(request, {
      params: { id: trip.id, userId: viewer.id },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual({
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

    const remaining = await prisma.tripAccess.findUnique({
      where: {
        tripId_userId: {
          tripId: trip.id,
          userId: viewer.id,
        },
      },
    });

    expect(remaining).toBeNull();
  });

  it("returns 404 when removing a missing invite", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Missing access",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    const viewer = await prisma.user.create({
      data: {
        email: "missing-access@example.com",
        name: "Missing Viewer",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/viewers/${viewer.id}`,
      { method: "DELETE" },
    );

    const response = await del(request, {
      params: { id: trip.id, userId: viewer.id },
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("toggles contributor access for an invited viewer", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Contributor toggle",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    const viewer = await prisma.user.create({
      data: {
        email: "contributor@example.com",
        name: "Contributor Viewer",
        role: "viewer",
        passwordHash: "hash",
        isActive: true,
      },
    });
    const access = await prisma.tripAccess.create({
      data: {
        tripId: trip.id,
        userId: viewer.id,
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/viewers/${viewer.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ canContribute: true }),
      },
    );

    const response = await patch(request, {
      params: { id: trip.id, userId: viewer.id },
    });
    const body = await response.json();
    // Ensure we read the response body for assertions below.

    const updated = await prisma.tripAccess.findUnique({
      where: {
        tripId_userId: {
          tripId: trip.id,
          userId: viewer.id,
        },
      },
    });

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual({
      id: access.id,
      tripId: trip.id,
      userId: viewer.id,
      canContribute: true,
      createdAt: access.createdAt.toISOString(),
      user: {
        id: viewer.id,
        name: viewer.name,
        email: viewer.email,
      },
    });
    expect(updated?.canContribute).toBe(true);
  });

  it("returns 400 when contributor payload is invalid", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Contributor toggle",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    const viewer = await prisma.user.create({
      data: {
        email: "invalid-contrib@example.com",
        name: "Invalid Contributor",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    await prisma.tripAccess.create({
      data: {
        tripId: trip.id,
        userId: viewer.id,
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/viewers/${viewer.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ canContribute: "yes" }),
      },
    );

    const response = await patch(request, {
      params: { id: trip.id, userId: viewer.id },
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects contributor toggles for inactive viewers", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Contributor toggle",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    const viewer = await prisma.user.create({
      data: {
        email: "inactive-toggle@example.com",
        name: "Inactive Viewer",
        role: "viewer",
        passwordHash: "hash",
        isActive: false,
      },
    });

    await prisma.tripAccess.create({
      data: {
        tripId: trip.id,
        userId: viewer.id,
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/viewers/${viewer.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ canContribute: true }),
      },
    );

    const response = await patch(request, {
      params: { id: trip.id, userId: viewer.id },
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when toggling a missing invite", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Contributor toggle",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    const viewer = await prisma.user.create({
      data: {
        email: "missing-invite@example.com",
        name: "Missing Invite",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/viewers/${viewer.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ canContribute: true }),
      },
    );

    const response = await patch(request, {
      params: { id: trip.id, userId: viewer.id },
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("rejects removal for non-creator users", async () => {
    getToken.mockResolvedValue({ sub: "viewer-1", role: "viewer" });

    const trip = await prisma.trip.create({
      data: {
        title: "Reject removal",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/viewers/viewer-2`,
      { method: "DELETE" },
    );

    const response = await del(request, {
      params: { id: trip.id, userId: "viewer-2" },
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

});
