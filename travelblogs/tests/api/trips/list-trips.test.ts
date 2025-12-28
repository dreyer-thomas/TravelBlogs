import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-list.db";

describe("GET /api/trips", () => {
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

    const routeModule = await import("../../../src/app/api/trips/route");
    get = routeModule.GET;
  });

  beforeEach(async () => {
    getToken.mockReset();
    await prisma.trip.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns creator-owned trips with list fields", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Desert Escape",
        startDate: new Date("2025-05-01T00:00:00.000Z"),
        endDate: new Date("2025-05-04T00:00:00.000Z"),
        coverImageUrl: "https://example.com/cover.jpg",
        ownerId: "creator",
      },
    });

    await prisma.trip.create({
      data: {
        title: "Not Yours",
        startDate: new Date("2025-06-01T00:00:00.000Z"),
        endDate: new Date("2025-06-04T00:00:00.000Z"),
        ownerId: "someone-else",
      },
    });

    const request = new Request("http://localhost/api/trips", {
      method: "GET",
    });

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toEqual({
      id: trip.id,
      title: "Desert Escape",
      startDate: "2025-05-01T00:00:00.000Z",
      endDate: "2025-05-04T00:00:00.000Z",
      coverImageUrl: "https://example.com/cover.jpg",
      updatedAt: trip.updatedAt.toISOString(),
    });
  });

  it("rejects unauthenticated requests", async () => {
    getToken.mockResolvedValue(null);

    const request = new Request("http://localhost/api/trips", {
      method: "GET",
    });

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects non-creator requests", async () => {
    getToken.mockResolvedValue({ sub: "viewer" });

    const request = new Request("http://localhost/api/trips", {
      method: "GET",
    });

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
