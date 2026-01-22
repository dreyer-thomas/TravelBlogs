import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const testDatabaseUrl = "file:./prisma/test-trip-share-entry.db";

describe("GET /api/trips/share/[token]/entries/[entryId]", () => {
  let get: (
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
      "../../../src/app/api/trips/share/[token]/entries/[entryId]/route"
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

  it("returns the shared entry when the token is valid", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Shared Entry Trip",
        startDate: new Date("2025-09-01T00:00:00.000Z"),
        endDate: new Date("2025-09-03T00:00:00.000Z"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry one",
        text: "Shared content",
        createdAt: new Date("2025-09-02T08:00:00.000Z"),
        latitude: 59.3293,
        longitude: 18.0686,
        locationName: "Stockholm",
        countryCode: "SE",
        media: {
          create: [{ url: "/uploads/entries/shared-entry.jpg" }],
        },
        tags: {
          create: [
            {
              tag: {
                create: {
                  tripId: trip.id,
                  name: "Culture",
                  normalizedName: "culture",
                },
              },
            },
          ],
        },
      },
      include: { media: true },
    });

    await prisma.tripShareLink.create({
      data: {
        tripId: trip.id,
        token: "shared-token",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/share/shared-token/entries/${entry.id}`,
      { method: "GET" },
    );

    const response = await get(request, {
      params: { token: "shared-token", entryId: entry.id },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.error).toBeNull();
    expect(body.data.id).toBe(entry.id);
    expect(body.data.tripId).toBe(trip.id);
    expect(body.data.media[0].url).toBe(entry.media[0].url);
    expect(body.data.tags).toEqual(["Culture"]);
    expect(body.data.location).toEqual({
      latitude: 59.3293,
      longitude: 18.0686,
      label: "Stockholm",
      countryCode: "SE",
    });
  });

  it("returns empty tags array when shared entry has no tags", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Shared No Tags Trip",
        startDate: new Date("2025-09-05T00:00:00.000Z"),
        endDate: new Date("2025-09-07T00:00:00.000Z"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry no tags",
        text: "No tags content",
        createdAt: new Date("2025-09-06T08:00:00.000Z"),
        media: {
          create: [{ url: "/uploads/entries/shared-no-tags.jpg" }],
        },
      },
    });

    await prisma.tripShareLink.create({
      data: {
        tripId: trip.id,
        token: "no-tags-token",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/share/no-tags-token/entries/${entry.id}`,
      { method: "GET" },
    );

    const response = await get(request, {
      params: { token: "no-tags-token", entryId: entry.id },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.tags).toEqual([]);
  });

  it("returns 404 for an invalid share token", async () => {
    const request = new Request(
      "http://localhost/api/trips/share/invalid/entries/entry-1",
      { method: "GET" },
    );

    const response = await get(request, {
      params: { token: "invalid", entryId: "entry-1" },
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 when the entry does not belong to the shared trip", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Trip A",
        startDate: new Date("2025-09-10T00:00:00.000Z"),
        endDate: new Date("2025-09-12T00:00:00.000Z"),
        ownerId: "creator",
      },
    });

    const otherTrip = await prisma.trip.create({
      data: {
        title: "Trip B",
        startDate: new Date("2025-10-01T00:00:00.000Z"),
        endDate: new Date("2025-10-02T00:00:00.000Z"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: otherTrip.id,
        title: "Other entry",
        text: "Not shared",
        createdAt: new Date("2025-10-01T08:00:00.000Z"),
      },
    });

    await prisma.tripShareLink.create({
      data: {
        tripId: trip.id,
        token: "shared-token",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/share/shared-token/entries/${entry.id}`,
      { method: "GET" },
    );

    const response = await get(request, {
      params: { token: "shared-token", entryId: entry.id },
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for a revoked share token", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Revoked entry trip",
        startDate: new Date("2025-09-15T00:00:00.000Z"),
        endDate: new Date("2025-09-18T00:00:00.000Z"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Revoked entry",
        text: "Revoked content",
        createdAt: new Date("2025-09-16T08:00:00.000Z"),
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
      `http://localhost/api/trips/share/revoked-token/entries/${entry.id}`,
      { method: "GET" },
    );

    const response = await get(request, {
      params: { token: "revoked-token", entryId: entry.id },
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for a rotated share token", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Rotated entry trip",
        startDate: new Date("2025-09-20T00:00:00.000Z"),
        endDate: new Date("2025-09-22T00:00:00.000Z"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Rotated entry",
        text: "Rotated content",
        createdAt: new Date("2025-09-21T08:00:00.000Z"),
      },
    });

    const shareLink = await prisma.tripShareLink.create({
      data: {
        tripId: trip.id,
        token: "old-entry-token",
      },
    });

    await prisma.tripShareLink.update({
      where: { tripId: trip.id },
      data: { token: "new-entry-token" },
    });

    const request = new Request(
      `http://localhost/api/trips/share/${shareLink.token}/entries/${entry.id}`,
      { method: "GET" },
    );

    const response = await get(request, {
      params: { token: shareLink.token, entryId: entry.id },
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
