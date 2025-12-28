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
    await prisma.trip.deleteMany();
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
});
