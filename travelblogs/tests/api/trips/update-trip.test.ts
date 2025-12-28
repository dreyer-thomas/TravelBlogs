import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-update.db";

describe("PATCH /api/trips/[id]", () => {
  let patch: (
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
    patch = routeModule.PATCH;
  });

  beforeEach(async () => {
    getToken.mockReset();
    await prisma.trip.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("updates an owned trip", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const trip = await prisma.trip.create({
      data: {
        title: "Old Title",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-05"),
        ownerId: "creator",
      },
    });

    const request = new Request(`http://localhost/api/trips/${trip.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Updated Title",
        startDate: "2025-04-02",
        endDate: "2025-04-06",
        coverImageUrl: "/uploads/trips/cover.jpg",
      }),
    });

    const response = await patch(request, { params: { id: trip.id } });
    const body = await response.json();

    const updated = await prisma.trip.findUnique({ where: { id: trip.id } });

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.title).toBe("Updated Title");
    expect(body.data.startDate).toBe("2025-04-02T00:00:00.000Z");
    expect(body.data.endDate).toBe("2025-04-06T00:00:00.000Z");
    expect(body.data.coverImageUrl).toBe("/uploads/trips/cover.jpg");
    expect(updated?.title).toBe("Updated Title");
  });

  it("clears the cover image when an empty string is sent", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const trip = await prisma.trip.create({
      data: {
        title: "With Cover",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-05"),
        coverImageUrl: "https://example.com/cover.jpg",
        ownerId: "creator",
      },
    });

    const request = new Request(`http://localhost/api/trips/${trip.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "With Cover",
        startDate: "2025-04-01",
        endDate: "2025-04-05",
        coverImageUrl: "",
      }),
    });

    const response = await patch(request, { params: { id: trip.id } });
    const body = await response.json();
    const updated = await prisma.trip.findUnique({ where: { id: trip.id } });

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.coverImageUrl).toBeNull();
    expect(updated?.coverImageUrl).toBeNull();
  });

  it("rejects unauthenticated requests", async () => {
    getToken.mockResolvedValue(null);

    const request = new Request("http://localhost/api/trips/any", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "No Access",
        startDate: "2025-04-02",
        endDate: "2025-04-06",
      }),
    });

    const response = await patch(request, { params: { id: "any" } });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects updates for trips not owned by the creator", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const trip = await prisma.trip.create({
      data: {
        title: "Not Yours",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-05"),
        ownerId: "someone-else",
      },
    });

    const request = new Request(`http://localhost/api/trips/${trip.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Updated",
        startDate: "2025-04-02",
        endDate: "2025-04-06",
      }),
    });

    const response = await patch(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns not found when the trip does not exist", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const request = new Request("http://localhost/api/trips/missing", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Updated",
        startDate: "2025-04-02",
        endDate: "2025-04-06",
      }),
    });

    const response = await patch(request, { params: { id: "missing" } });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("rejects invalid cover image URLs", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const trip = await prisma.trip.create({
      data: {
        title: "Validation",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-05"),
        ownerId: "creator",
      },
    });

    const request = new Request(`http://localhost/api/trips/${trip.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Validation",
        startDate: "2025-04-01",
        endDate: "2025-04-05",
        coverImageUrl: "javascript:alert(1)",
      }),
    });

    const response = await patch(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects non-upload cover URLs", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const trip = await prisma.trip.create({
      data: {
        title: "External",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-05"),
        ownerId: "creator",
      },
    });

    const request = new Request(`http://localhost/api/trips/${trip.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "External",
        startDate: "2025-04-01",
        endDate: "2025-04-05",
        coverImageUrl: "https://example.com/cover.jpg",
      }),
    });

    const response = await patch(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns validation errors for invalid payloads", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const trip = await prisma.trip.create({
      data: {
        title: "Validation",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-05"),
        ownerId: "creator",
      },
    });

    const request = new Request(`http://localhost/api/trips/${trip.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "",
        startDate: "2025-04-10",
        endDate: "2025-04-01",
      }),
    });

    const response = await patch(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects non-ISO date strings", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const trip = await prisma.trip.create({
      data: {
        title: "Validation",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-05"),
        ownerId: "creator",
      },
    });

    const request = new Request(`http://localhost/api/trips/${trip.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Validation",
        startDate: "04/10/2025",
        endDate: "2025-04-12",
      }),
    });

    const response = await patch(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
