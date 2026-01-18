import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-entries-migration-status.db";

describe("GET /api/entries/diagnostics", () => {
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

    const routeModule = await import("../../../src/app/api/entries/diagnostics/route");
    get = routeModule.GET;
  });

  beforeEach(async () => {
    getToken.mockReset();
    await prisma.entryMedia.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.tripAccess.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("requires authentication", async () => {
    getToken.mockResolvedValue(null);

    const request = new Request("http://localhost/api/entries/diagnostics", {
      method: "GET",
    });

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toEqual({
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });
  });

  it("rejects non-admin users", async () => {
    await prisma.user.create({
      data: {
        id: "viewer-1",
        email: "viewer@example.com",
        name: "Viewer One",
        role: "viewer",
        passwordHash: "hashed-password",
        isActive: true,
      },
    });
    getToken.mockResolvedValue({ sub: "viewer-1", role: "viewer" });

    const request = new Request("http://localhost/api/entries/diagnostics", {
      method: "GET",
    });

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toEqual({
      code: "FORBIDDEN",
      message: "Admin access required.",
    });
  });

  it("returns migration status counts and entry ids for admins", async () => {
    await prisma.user.create({
      data: {
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin One",
        role: "administrator",
        passwordHash: "hashed-password",
        isActive: true,
      },
    });
    getToken.mockResolvedValue({ sub: "admin-1", role: "administrator" });

    const trip = await prisma.trip.create({
      data: {
        title: "Diagnostics Trip",
        startDate: new Date("2025-07-01"),
        endDate: new Date("2025-07-04"),
        ownerId: "creator",
      },
    });

    const plainEntry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Plain",
        text: "Plain text entry",
        createdAt: new Date("2025-07-01T10:00:00Z"),
        updatedAt: new Date("2025-07-01T10:00:00Z"),
      },
    });
    const tiptapEntry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "JSON",
        text: JSON.stringify({ type: "doc", content: [] }),
        createdAt: new Date("2025-07-02T10:00:00Z"),
        updatedAt: new Date("2025-07-02T10:00:00Z"),
      },
    });
    const secondPlainEntry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Plain Two",
        text: "Another plain entry",
        createdAt: new Date("2025-07-03T10:00:00Z"),
        updatedAt: new Date("2025-07-03T10:00:00Z"),
      },
    });

    const request = new Request("http://localhost/api/entries/diagnostics", {
      method: "GET",
    });

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.summary).toEqual({
      totalCount: 3,
      plainCount: 2,
      tiptapCount: 1,
    });
    expect(body.data.entries.plain).toEqual(
      expect.arrayContaining([plainEntry.id, secondPlainEntry.id]),
    );
    expect(body.data.entries.tiptap).toEqual(
      expect.arrayContaining([tiptapEntry.id]),
    );
  });
});
