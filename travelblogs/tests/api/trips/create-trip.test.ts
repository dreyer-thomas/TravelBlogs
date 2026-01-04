import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test.db";

describe("POST /api/trips", () => {
  let post: (request: Request) => Promise<Response>;
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
    post = routeModule.POST;
  });

  beforeEach(async () => {
    getToken.mockReset();
    await prisma.trip.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a trip with valid data", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const request = new Request("http://localhost/api/trips", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Spring in Kyoto",
        startDate: "2025-03-10",
        endDate: "2025-03-22",
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.title).toBe("Spring in Kyoto");
    expect(body.data.startDate).toBe("2025-03-10T00:00:00.000Z");
    expect(body.data.endDate).toBe("2025-03-22T00:00:00.000Z");
    expect(body.data.ownerId).toBe("creator");
  });

  it("allows administrators to create trips", async () => {
    getToken.mockResolvedValue({ sub: "admin-creator", role: "administrator" });

    const request = new Request("http://localhost/api/trips", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Admin Trip",
        startDate: "2025-03-10",
        endDate: "2025-03-22",
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.ownerId).toBe("admin-creator");
  });

  it("returns validation errors for missing fields", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const request = new Request("http://localhost/api/trips", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "",
        startDate: "2025-03-10",
        endDate: "2025-03-22",
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns validation errors for invalid date strings", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const request = new Request("http://localhost/api/trips", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Bad Dates",
        startDate: "not-a-date",
        endDate: "2025-03-22",
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns validation errors for invalid cover image URLs", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const request = new Request("http://localhost/api/trips", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Invalid URL",
        startDate: "2025-03-10",
        endDate: "2025-03-22",
        coverImageUrl: "javascript:alert(1)",
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects cover images that are not from the upload endpoint", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const request = new Request("http://localhost/api/trips", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "External Cover",
        startDate: "2025-03-10",
        endDate: "2025-03-22",
        coverImageUrl: "https://example.com/cover.jpg",
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns validation errors when end date precedes start date", async () => {
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const request = new Request("http://localhost/api/trips", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Backwards",
        startDate: "2025-03-22",
        endDate: "2025-03-10",
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects unauthenticated requests", async () => {
    getToken.mockResolvedValue(null);

    const request = new Request("http://localhost/api/trips", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "No Access",
        startDate: "2025-03-10",
        endDate: "2025-03-22",
      }),
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
