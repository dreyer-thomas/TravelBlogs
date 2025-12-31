import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-delete-entry.db";

describe("DELETE /api/entries/[id]", () => {
  let del: (
    request: Request,
    context: { params: { id: string } },
  ) => Promise<Response>;
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
    del = routeModule.DELETE;
    get = routeModule.GET;
  });

  beforeEach(async () => {
    getToken.mockReset();
    getToken.mockResolvedValue({ sub: "creator" });
    await prisma.entryMedia.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns validation errors for empty entry id", async () => {
    const request = new Request("http://localhost/api/entries/", {
      method: "DELETE",
    });

    const response = await del(request, { params: { id: "" } });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("deletes an entry for an owned trip", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Delete Entry",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry to delete",
        text: "Entry to delete.",
        media: {
          create: [{ url: "/uploads/entries/delete-1.jpg" }],
        },
      },
      include: { media: true },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "DELETE",
    });

    const response = await del(request, { params: { id: entry.id } });
    const body = await response.json();

    const getResponse = await get(
      new Request(`http://localhost/api/entries/${entry.id}`, {
        method: "GET",
      }),
      { params: { id: entry.id } },
    );
    const getBody = await getResponse.json();

    const remainingEntry = await prisma.entry.findUnique({
      where: { id: entry.id },
    });
    const remainingMedia = await prisma.entryMedia.findMany({
      where: { entryId: entry.id },
    });

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.id).toBe(entry.id);
    expect(getResponse.status).toBe(404);
    expect(getBody.error.code).toBe("NOT_FOUND");
    expect(remainingEntry).toBeNull();
    expect(remainingMedia).toHaveLength(0);
  });

  it("rejects unauthenticated requests", async () => {
    getToken.mockResolvedValue(null);

    const request = new Request("http://localhost/api/entries/any", {
      method: "DELETE",
    });

    const response = await del(request, { params: { id: "any" } });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects deleting entries not owned by the creator", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Not Yours",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-02"),
        ownerId: "someone-else",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Not yours",
        text: "Not yours.",
        media: {
          create: [{ url: "/uploads/entries/other.jpg" }],
        },
      },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "DELETE",
    });

    const response = await del(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("rejects contributor deletes even with access", async () => {
    getToken.mockResolvedValue({ sub: "viewer-1" });

    const trip = await prisma.trip.create({
      data: {
        title: "Contributor Trip",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-02"),
        ownerId: "creator",
      },
    });

    await prisma.user.create({
      data: {
        id: "viewer-1",
        email: "viewer-1@example.com",
        name: "Viewer One",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    await prisma.tripAccess.create({
      data: {
        tripId: trip.id,
        userId: "viewer-1",
        canContribute: true,
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Contributor entry",
        text: "Contributor entry.",
        media: {
          create: [{ url: "/uploads/entries/other.jpg" }],
        },
      },
    });

    const request = new Request(`http://localhost/api/entries/${entry.id}`, {
      method: "DELETE",
    });

    const response = await del(request, { params: { id: entry.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns not found when the entry does not exist", async () => {
    const request = new Request("http://localhost/api/entries/missing", {
      method: "DELETE",
    });

    const response = await del(request, { params: { id: "missing" } });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
