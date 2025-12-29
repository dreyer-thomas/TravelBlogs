import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-trip-share-link.db";

describe("POST /api/trips/[id]/share-link", () => {
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
      "../../../src/app/api/trips/[id]/share-link/route"
    );
    post = routeModule.POST;
  });

  beforeEach(async () => {
    getToken.mockReset();
    await prisma.tripShareLink.deleteMany();
    await prisma.trip.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a share link for an owned trip", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Shareable",
        startDate: new Date("2025-07-01"),
        endDate: new Date("2025-07-02"),
        ownerId: "creator",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/share-link`,
      { method: "POST" },
    );

    const response = await post(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.tripId).toBe(trip.id);
    expect(body.data.token).toEqual(expect.any(String));
    expect(body.data.shareUrl).toBe(
      `http://localhost/trips/share/${body.data.token}`,
    );

    const shareLink = await prisma.tripShareLink.findUnique({
      where: { tripId: trip.id },
    });

    expect(shareLink?.token).toBe(body.data.token);
  });

  it("returns the existing share link on subsequent requests", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Share again",
        startDate: new Date("2025-08-01"),
        endDate: new Date("2025-08-03"),
        ownerId: "creator",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/share-link`,
      { method: "POST" },
    );

    const firstResponse = await post(request, { params: { id: trip.id } });
    const firstBody = await firstResponse.json();

    const secondResponse = await post(request, { params: { id: trip.id } });
    const secondBody = await secondResponse.json();

    expect(firstBody.data.token).toBe(secondBody.data.token);
    expect(secondBody.data.shareUrl).toBe(
      `http://localhost/trips/share/${secondBody.data.token}`,
    );

    const shareLinks = await prisma.tripShareLink.findMany({
      where: { tripId: trip.id },
    });
    expect(shareLinks).toHaveLength(1);
  });

  it("rejects unauthenticated requests", async () => {
    getToken.mockResolvedValue(null);

    const trip = await prisma.trip.create({
      data: {
        title: "Private",
        startDate: new Date("2025-07-01"),
        endDate: new Date("2025-07-02"),
        ownerId: "creator",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/share-link`,
      { method: "POST" },
    );

    const response = await post(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects non-creator tokens", async () => {
    getToken.mockResolvedValue({ sub: "someone-else" });

    const trip = await prisma.trip.create({
      data: {
        title: "Wrong user",
        startDate: new Date("2025-07-01"),
        endDate: new Date("2025-07-02"),
        ownerId: "creator",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/share-link`,
      { method: "POST" },
    );

    const response = await post(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("rejects creator access for trips they do not own", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Not owned",
        startDate: new Date("2025-07-01"),
        endDate: new Date("2025-07-02"),
        ownerId: "someone-else",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/share-link`,
      { method: "POST" },
    );

    const response = await post(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});

describe("GET /api/trips/[id]/share-link", () => {
  let get: (
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
      "../../../src/app/api/trips/[id]/share-link/route"
    );
    get = routeModule.GET;
  });

  beforeEach(async () => {
    getToken.mockReset();
    await prisma.tripShareLink.deleteMany();
    await prisma.trip.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns the existing share link for an owned trip", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Shared",
        startDate: new Date("2025-10-01"),
        endDate: new Date("2025-10-02"),
        ownerId: "creator",
      },
    });

    const shareLink = await prisma.tripShareLink.create({
      data: {
        tripId: trip.id,
        token: "existing-token",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/share-link`,
      { method: "GET" },
    );

    const response = await get(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.shareUrl).toBe(
      `http://localhost/trips/share/${shareLink.token}`,
    );
    expect(body.data.token).toBe(shareLink.token);
    expect(body.data.tripId).toBe(trip.id);
  });

  it("returns 404 when no share link exists", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Not shared",
        startDate: new Date("2025-10-05"),
        endDate: new Date("2025-10-06"),
        ownerId: "creator",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/share-link`,
      { method: "GET" },
    );

    const response = await get(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("PATCH /api/trips/[id]/share-link", () => {
  let patch: (
    request: Request,
    context: { params: { id: string } },
  ) => Promise<Response>;
  let publicGet: (
    request: Request,
    context: { params: { token: string } },
  ) => Promise<Response>;
  let publicEntryGet: (
    request: Request,
    context: { params: { token: string; entryId: string } },
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
      "../../../src/app/api/trips/[id]/share-link/route"
    );
    patch = routeModule.PATCH;

    const publicRouteModule = await import(
      "../../../src/app/api/trips/share/[token]/route"
    );
    publicGet = publicRouteModule.GET;

    const publicEntryRouteModule = await import(
      "../../../src/app/api/trips/share/[token]/entries/[entryId]/route"
    );
    publicEntryGet = publicEntryRouteModule.GET;
  });

  beforeEach(async () => {
    getToken.mockReset();
    await prisma.entryMedia.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.tripShareLink.deleteMany();
    await prisma.trip.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rotates the share token for an owned trip", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Rotate link",
        startDate: new Date("2025-09-01"),
        endDate: new Date("2025-09-02"),
        ownerId: "creator",
      },
    });

    const existing = await prisma.tripShareLink.create({
      data: {
        tripId: trip.id,
        token: "old-token",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/share-link`,
      { method: "PATCH" },
    );

    const response = await patch(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.token).not.toBe(existing.token);
    expect(body.data.shareUrl).toBe(
      `http://localhost/trips/share/${body.data.token}`,
    );

    const updated = await prisma.tripShareLink.findUnique({
      where: { tripId: trip.id },
    });
    expect(updated?.token).toBe(body.data.token);
  });

  it("returns 404 for old tokens after regeneration", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Invalidate link",
        startDate: new Date("2025-09-10"),
        endDate: new Date("2025-09-11"),
        ownerId: "creator",
      },
    });

    const existing = await prisma.tripShareLink.create({
      data: {
        tripId: trip.id,
        token: "stale-token",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/share-link`,
      { method: "PATCH" },
    );

    const response = await patch(request, { params: { id: trip.id } });
    expect(response.status).toBe(200);

    const staleRequest = new Request(
      `http://localhost/api/trips/share/${existing.token}`,
      { method: "GET" },
    );

    const staleResponse = await publicGet(staleRequest, {
      params: { token: existing.token },
    });
    const staleBody = await staleResponse.json();

    expect(staleResponse.status).toBe(404);
    expect(staleBody.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for old tokens on shared entry routes after regeneration", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Invalidate entry link",
        startDate: new Date("2025-09-20"),
        endDate: new Date("2025-09-21"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Shared entry",
        text: "Entry content",
        createdAt: new Date("2025-09-20T08:00:00.000Z"),
        media: {
          create: [{ url: "/uploads/entries/shared-entry.jpg" }],
        },
      },
    });

    const existing = await prisma.tripShareLink.create({
      data: {
        tripId: trip.id,
        token: "entry-stale-token",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/share-link`,
      { method: "PATCH" },
    );

    const response = await patch(request, { params: { id: trip.id } });
    expect(response.status).toBe(200);

    const staleRequest = new Request(
      `http://localhost/api/trips/share/${existing.token}/entries/${entry.id}`,
      { method: "GET" },
    );

    const staleResponse = await publicEntryGet(staleRequest, {
      params: { token: existing.token, entryId: entry.id },
    });
    const staleBody = await staleResponse.json();

    expect(staleResponse.status).toBe(404);
    expect(staleBody.error.code).toBe("NOT_FOUND");
  });
});

describe("DELETE /api/trips/[id]/share-link", () => {
  let del: (
    request: Request,
    context: { params: { id: string } },
  ) => Promise<Response>;
  let publicGet: (
    request: Request,
    context: { params: { token: string } },
  ) => Promise<Response>;
  let publicEntryGet: (
    request: Request,
    context: { params: { token: string; entryId: string } },
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
      "../../../src/app/api/trips/[id]/share-link/route"
    );
    del = routeModule.DELETE;

    const publicRouteModule = await import(
      "../../../src/app/api/trips/share/[token]/route"
    );
    publicGet = publicRouteModule.GET;

    const publicEntryRouteModule = await import(
      "../../../src/app/api/trips/share/[token]/entries/[entryId]/route"
    );
    publicEntryGet = publicEntryRouteModule.GET;
  });

  beforeEach(async () => {
    getToken.mockReset();
    await prisma.entryMedia.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.tripShareLink.deleteMany();
    await prisma.trip.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("revokes a share link for an owned trip", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Revoke share",
        startDate: new Date("2025-10-12"),
        endDate: new Date("2025-10-13"),
        ownerId: "creator",
      },
    });

    await prisma.tripShareLink.create({
      data: {
        tripId: trip.id,
        token: "revokable-token",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/share-link`,
      { method: "DELETE" },
    );

    const response = await del(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual({ revoked: true, tripId: trip.id });

    const existing = await prisma.tripShareLink.findUnique({
      where: { tripId: trip.id },
    });
    expect(existing).toBeNull();
  });

  it("rejects public access after revocation", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Revoked entry",
        startDate: new Date("2025-10-20"),
        endDate: new Date("2025-10-21"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Revoked entry view",
        text: "Entry content",
        createdAt: new Date("2025-10-20T08:00:00.000Z"),
        media: {
          create: [{ url: "/uploads/entries/revoked-entry.jpg" }],
        },
      },
    });

    await prisma.tripShareLink.create({
      data: {
        tripId: trip.id,
        token: "revoked-token",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/share-link`,
      { method: "DELETE" },
    );

    const response = await del(request, { params: { id: trip.id } });
    expect(response.status).toBe(200);

    const shareRequest = new Request(
      "http://localhost/api/trips/share/revoked-token",
      { method: "GET" },
    );
    const shareResponse = await publicGet(shareRequest, {
      params: { token: "revoked-token" },
    });
    const shareBody = await shareResponse.json();

    expect(shareResponse.status).toBe(404);
    expect(shareBody.error.code).toBe("NOT_FOUND");

    const entryRequest = new Request(
      `http://localhost/api/trips/share/revoked-token/entries/${entry.id}`,
      { method: "GET" },
    );
    const entryResponse = await publicEntryGet(entryRequest, {
      params: { token: "revoked-token", entryId: entry.id },
    });
    const entryBody = await entryResponse.json();

    expect(entryResponse.status).toBe(404);
    expect(entryBody.error.code).toBe("NOT_FOUND");
  });
});
