import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const testDatabaseUrl = "file:./prisma/test-trip-share-overview.db";

describe("GET /api/trips/share/[token]", () => {
  let get: (
    request: Request,
    context: { params: { token: string } },
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
      "../../../src/app/api/trips/share/[token]/route"
    );
    get = routeModule.GET;
  });

  beforeEach(async () => {
    await prisma.entryMedia.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.tripShareLink.deleteMany();
    await prisma.trip.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns public trip overview by share token", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Public Trip",
        startDate: new Date("2025-09-01T00:00:00.000Z"),
        endDate: new Date("2025-09-05T00:00:00.000Z"),
        ownerId: "creator",
      },
    });

    const olderEntry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Day one",
        text: "Old entry",
        createdAt: new Date("2025-09-02T08:00:00.000Z"),
        media: {
          create: [{ url: "/uploads/entries/public-old.jpg" }],
        },
      },
      include: { media: true },
    });

    const newerEntry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Day two",
        text: "New entry",
        createdAt: new Date("2025-09-03T08:00:00.000Z"),
        latitude: 52.52,
        longitude: 13.405,
        locationName: "Berlin",
        media: {
          create: [{ url: "/uploads/entries/public-new.jpg" }],
        },
      },
      include: { media: true },
    });

    const shareLink = await prisma.tripShareLink.create({
      data: {
        tripId: trip.id,
        token: "public-token",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/share/${shareLink.token}`,
      { method: "GET" },
    );

    const response = await get(request, { params: { token: shareLink.token } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.error).toBeNull();
    expect(body.data.trip).toEqual({
      id: trip.id,
      title: trip.title,
      startDate: trip.startDate.toISOString(),
      endDate: trip.endDate.toISOString(),
      coverImageUrl: trip.coverImageUrl,
    });
    expect(body.data.entries.map((entry: { id: string }) => entry.id)).toEqual([
      newerEntry.id,
      olderEntry.id,
    ]);
    expect(body.data.entries[0]).toEqual({
      id: newerEntry.id,
      tripId: trip.id,
      title: newerEntry.title,
      createdAt: newerEntry.createdAt.toISOString(),
      coverImageUrl: newerEntry.coverImageUrl,
      media: [{ url: newerEntry.media[0].url }],
      location: {
        latitude: 52.52,
        longitude: 13.405,
        label: "Berlin",
      },
    });
    expect(body.data.entries[1].location).toBeNull();
  });

  it("returns 404 for an invalid share token", async () => {
    const request = new Request(
      "http://localhost/api/trips/share/missing",
      { method: "GET" },
    );

    const response = await get(request, { params: { token: "missing" } });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for a revoked share token", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Revoked trip",
        startDate: new Date("2025-09-10T00:00:00.000Z"),
        endDate: new Date("2025-09-12T00:00:00.000Z"),
        ownerId: "creator",
      },
    });

    await prisma.tripShareLink.create({
      data: {
        tripId: trip.id,
        token: "revoked-token",
      },
    });

    await prisma.tripShareLink.delete({
      where: { tripId: trip.id },
    });

    const request = new Request(
      "http://localhost/api/trips/share/revoked-token",
      { method: "GET" },
    );

    const response = await get(request, { params: { token: "revoked-token" } });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for a rotated share token", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Rotated trip",
        startDate: new Date("2025-10-01T00:00:00.000Z"),
        endDate: new Date("2025-10-04T00:00:00.000Z"),
        ownerId: "creator",
      },
    });

    const shareLink = await prisma.tripShareLink.create({
      data: {
        tripId: trip.id,
        token: "old-token",
      },
    });

    await prisma.tripShareLink.update({
      where: { tripId: trip.id },
      data: { token: "new-token" },
    });

    const request = new Request(
      `http://localhost/api/trips/share/${shareLink.token}`,
      { method: "GET" },
    );

    const response = await get(request, { params: { token: shareLink.token } });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
