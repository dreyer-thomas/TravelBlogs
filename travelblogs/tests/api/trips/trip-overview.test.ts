import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-trip-overview.db";

describe("GET /api/trips/[id]/overview", () => {
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
      "../../../src/app/api/trips/[id]/overview/route"
    );
    get = routeModule.GET;
  });

  beforeEach(async () => {
    getToken.mockReset();
    await prisma.entryMedia.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.trip.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns trip overview with newest-first entries and summary fields", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Pacific Coast",
        startDate: new Date("2025-06-01T00:00:00.000Z"),
        endDate: new Date("2025-06-07T00:00:00.000Z"),
        coverImageUrl: "https://example.com/trip-cover.jpg",
        ownerId: "creator",
      },
    });

    const olderEntry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Day one",
        text: "Old entry",
        coverImageUrl: "/uploads/entries/old-cover.jpg",
        createdAt: new Date("2025-06-02T08:00:00.000Z"),
        media: {
          create: [{ url: "/uploads/entries/old.jpg" }],
        },
      },
      include: {
        media: true,
      },
    });

    const newerEntry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Day two",
        text: "New entry",
        coverImageUrl: "/uploads/entries/new-cover.jpg",
        createdAt: new Date("2025-06-03T08:00:00.000Z"),
        media: {
          create: [{ url: "/uploads/entries/new.jpg" }],
        },
      },
      include: {
        media: true,
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/overview`,
      { method: "GET" },
    );

    const response = await get(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.trip).toEqual({
      id: trip.id,
      title: trip.title,
      startDate: trip.startDate.toISOString(),
      endDate: trip.endDate.toISOString(),
      coverImageUrl: trip.coverImageUrl,
    });
    expect(body.data.entries).toHaveLength(2);
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
    });
  });

  it("returns an empty entries array when a trip has no entries", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Empty trip",
        startDate: new Date("2025-06-01T00:00:00.000Z"),
        endDate: new Date("2025-06-07T00:00:00.000Z"),
        ownerId: "creator",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/overview`,
      { method: "GET" },
    );

    const response = await get(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.entries).toEqual([]);
  });

  it("rejects overview access for trips not owned by the creator", async () => {
    getToken.mockResolvedValue(null);
    const trip = await prisma.trip.create({
      data: {
        title: "Private trip",
        startDate: new Date("2025-06-01T00:00:00.000Z"),
        endDate: new Date("2025-06-07T00:00:00.000Z"),
        ownerId: "someone-else",
      },
    });

    const request = new Request(
      `http://localhost/api/trips/${trip.id}/overview`,
      { method: "GET" },
    );

    const response = await get(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
