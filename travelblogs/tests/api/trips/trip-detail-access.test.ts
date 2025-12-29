import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-trip-detail-access.db";

describe("GET /api/trips/[id] access", () => {
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

    const routeModule = await import("../../../src/app/api/trips/[id]/route");
    get = routeModule.GET;
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

  it("allows invited viewers to read trip details", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Viewer Trip",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
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

    getToken.mockResolvedValue({ sub: viewer.id });

    const request = new Request(`http://localhost/api/trips/${trip.id}`, {
      method: "GET",
    });

    const response = await get(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.id).toBe(trip.id);
  });

  it("rejects non-invited viewers", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Private Trip",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
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

    const request = new Request(`http://localhost/api/trips/${trip.id}`, {
      method: "GET",
    });

    const response = await get(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
