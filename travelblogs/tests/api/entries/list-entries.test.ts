import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-entries-list.db";

describe("GET /api/entries", () => {
  let get: (request: Request) => Promise<Response>;
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

    const routeModule = await import("../../../src/app/api/entries/route");
    get = routeModule.GET;
  });

  beforeEach(async () => {
    getToken.mockReset();
    getToken.mockResolvedValue({ sub: "creator" });
    await prisma.entryMedia.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.tripAccess.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns entries in chronological order", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Chronology",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-10"),
        ownerId: "creator",
      },
    });

    const olderEntry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Day one",
        text: "First day",
        createdAt: new Date("2025-06-02T10:00:00Z"),
        updatedAt: new Date("2025-06-02T10:00:00Z"),
        latitude: 35.6762,
        longitude: 139.6503,
        media: {
          create: [{ url: "/uploads/entries/first.jpg" }],
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
        text: "Second day",
        createdAt: new Date("2025-06-03T10:00:00Z"),
        updatedAt: new Date("2025-06-03T10:00:00Z"),
        media: {
          create: [{ url: "/uploads/entries/second.jpg" }],
        },
      },
      include: {
        media: true,
      },
    });

    const request = new Request(
      `http://localhost/api/entries?tripId=${trip.id}`,
      {
        method: "GET",
      },
    );

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data[0].id).toBe(olderEntry.id);
    expect(body.data[1].id).toBe(newerEntry.id);
    expect(body.data[0].location).toEqual({
      latitude: 35.6762,
      longitude: 139.6503,
      label: null,
    });
    expect(body.data[1].location).toBeNull();
  });

  it("returns sorted tags for entries", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Tagged Entries",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-10"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Tag day",
        text: "Notes",
      },
    });

    const beachTag = await prisma.tag.create({
      data: {
        tripId: trip.id,
        name: "Beach",
        normalizedName: "beach",
      },
    });

    const cityTag = await prisma.tag.create({
      data: {
        tripId: trip.id,
        name: "city",
        normalizedName: "city",
      },
    });

    const adventureTag = await prisma.tag.create({
      data: {
        tripId: trip.id,
        name: "Adventure",
        normalizedName: "adventure",
      },
    });

    await prisma.entryTag.create({
      data: {
        entryId: entry.id,
        tagId: beachTag.id,
      },
    });

    await prisma.entryTag.create({
      data: {
        entryId: entry.id,
        tagId: cityTag.id,
      },
    });

    await prisma.entryTag.create({
      data: {
        entryId: entry.id,
        tagId: adventureTag.id,
      },
    });

    const request = new Request(
      `http://localhost/api/entries?tripId=${trip.id}`,
      {
        method: "GET",
      },
    );

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].tags).toEqual(["Adventure", "Beach", "city"]);
  });

  it("rejects requests for trips not owned by the creator", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Not Yours",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-10"),
        ownerId: "someone-else",
      },
    });

    const request = new Request(
      `http://localhost/api/entries?tripId=${trip.id}`,
      {
        method: "GET",
      },
    );

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("allows invited viewers to list entries", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Viewer trip",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-10"),
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

    await prisma.tripAccess.create({
      data: {
        tripId: trip.id,
        userId: viewer.id,
      },
    });

    await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Viewer entry",
        text: "Viewer can read",
        media: {
          create: [{ url: "/uploads/entries/viewer-list.jpg" }],
        },
      },
    });

    getToken.mockResolvedValue({ sub: viewer.id });

    const request = new Request(
      `http://localhost/api/entries?tripId=${trip.id}`,
      {
        method: "GET",
      },
    );

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toHaveLength(1);
  });

  it("rejects non-invited viewers from listing entries", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Locked trip",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-10"),
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

    getToken.mockResolvedValue({ sub: viewer.id });

    const request = new Request(
      `http://localhost/api/entries?tripId=${trip.id}`,
      {
        method: "GET",
      },
    );

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
