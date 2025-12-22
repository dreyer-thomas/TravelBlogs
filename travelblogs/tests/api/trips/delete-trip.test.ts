import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-delete.db";

describe("DELETE /api/trips/[id]", () => {
  let del: (
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
    del = routeModule.DELETE;
  });

  beforeEach(async () => {
    getToken.mockReset();
    await prisma.trip.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("deletes an owned trip", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const trip = await prisma.trip.create({
      data: {
        title: "To Delete",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "creator",
      },
    });

    const request = new Request(`http://localhost/api/trips/${trip.id}`, {
      method: "DELETE",
    });
    const response = await del(request, { params: { id: trip.id } });
    const body = await response.json();

    const remaining = await prisma.trip.findUnique({ where: { id: trip.id } });

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.id).toBe(trip.id);
    expect(remaining).toBeNull();
  });

  it("rejects unauthenticated requests", async () => {
    getToken.mockResolvedValue(null);

    const request = new Request("http://localhost/api/trips/any", {
      method: "DELETE",
    });
    const response = await del(request, { params: { id: "any" } });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects deleting trips not owned by the creator", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const trip = await prisma.trip.create({
      data: {
        title: "Not Yours",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-02"),
        ownerId: "someone-else",
      },
    });

    const request = new Request(`http://localhost/api/trips/${trip.id}`, {
      method: "DELETE",
    });
    const response = await del(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns not found when the trip does not exist", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const request = new Request("http://localhost/api/trips/missing", {
      method: "DELETE",
    });
    const response = await del(request, { params: { id: "missing" } });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
