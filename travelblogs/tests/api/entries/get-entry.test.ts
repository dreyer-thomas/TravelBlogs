import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-entry-detail.db";

describe("GET /api/entries/[id]", () => {
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

    const routeModule = await import("../../../src/app/api/entries/[id]/route");
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

  it("returns entry details for an owned trip", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Details",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-10"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Detail day",
        text: "Full day recap",
        media: {
          create: [{ url: "/uploads/entries/detail.jpg" }],
        },
      },
      include: {
        media: true,
      },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "GET",
    });

    const response = await get(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.id).toBe(entry.id);
    expect(body.data.media).toHaveLength(1);
  });

  it("allows unauthenticated viewers to read entry details", async () => {
    getToken.mockResolvedValue(null);
    const trip = await prisma.trip.create({
      data: {
        title: "Public view",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-10"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Shared day",
        text: "Shared entry",
        media: {
          create: [{ url: "/uploads/entries/shared.jpg" }],
        },
      },
      include: {
        media: true,
      },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "GET",
    });

    const response = await get(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.id).toBe(entry.id);
  });

  it("rejects entry access for trips not owned by the creator", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Other Owner",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-10"),
        ownerId: "someone-else",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Not yours",
        text: "Not yours",
        media: {
          create: [{ url: "/uploads/entries/other.jpg" }],
        },
      },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "GET",
    });

    const response = await get(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
