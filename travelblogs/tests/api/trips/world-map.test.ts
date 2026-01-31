import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-world-map.db";

describe("GET /api/trips/world-map", () => {
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

    const routeModule = await import("../../../src/app/api/trips/world-map/route");
    get = routeModule.GET;
  });

  beforeEach(async () => {
    getToken.mockReset();
    await prisma.tripAccess.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns visible trip countries for creators", async () => {
    await prisma.user.create({
      data: {
        id: "creator",
        email: "creator@example.com",
        name: "Creator",
        role: "creator",
        passwordHash: "hash",
      },
    });

    const ownedTrip = await prisma.trip.create({
      data: {
        title: "Owned Trip",
        startDate: new Date("2025-01-01T00:00:00.000Z"),
        endDate: new Date("2025-01-05T00:00:00.000Z"),
        ownerId: "creator",
      },
    });

    const invitedTrip = await prisma.trip.create({
      data: {
        title: "Invited Trip",
        startDate: new Date("2025-02-01T00:00:00.000Z"),
        endDate: new Date("2025-02-05T00:00:00.000Z"),
        ownerId: "someone-else",
      },
    });

    const hiddenTrip = await prisma.trip.create({
      data: {
        title: "Hidden Trip",
        startDate: new Date("2025-03-01T00:00:00.000Z"),
        endDate: new Date("2025-03-05T00:00:00.000Z"),
        ownerId: "someone-else",
      },
    });

    await prisma.tripAccess.create({
      data: {
        tripId: invitedTrip.id,
        userId: "creator",
      },
    });

    await prisma.entry.createMany({
      data: [
        {
          tripId: ownedTrip.id,
          title: "Owned Entry",
          text: "Story",
          countryCode: "us",
        },
        {
          tripId: invitedTrip.id,
          title: "Invited Entry",
          text: "Story",
          countryCode: "DE",
        },
        {
          tripId: invitedTrip.id,
          title: "Invalid Entry",
          text: "Story",
          countryCode: "USA",
        },
        {
          tripId: hiddenTrip.id,
          title: "Hidden Entry",
          text: "Story",
          countryCode: "FR",
        },
      ],
    });

    getToken.mockResolvedValue({ sub: "creator", role: "creator" });

    const request = new Request("http://localhost/api/trips/world-map", {
      method: "GET",
    });

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.countries).toEqual(["DE", "US"]);
    expect(body.data.tripsByCountry).toEqual({
      DE: [{ id: invitedTrip.id, title: "Invited Trip" }],
      US: [{ id: ownedTrip.id, title: "Owned Trip" }],
    });
  });

  it("returns visible trip countries for viewers", async () => {
    const viewer = await prisma.user.create({
      data: {
        email: "viewer@example.com",
        name: "Viewer",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const invitedTrip = await prisma.trip.create({
      data: {
        title: "Viewer Trip",
        startDate: new Date("2025-04-01T00:00:00.000Z"),
        endDate: new Date("2025-04-05T00:00:00.000Z"),
        ownerId: "creator",
      },
    });

    const hiddenTrip = await prisma.trip.create({
      data: {
        title: "Hidden Trip",
        startDate: new Date("2025-05-01T00:00:00.000Z"),
        endDate: new Date("2025-05-05T00:00:00.000Z"),
        ownerId: "creator",
      },
    });

    await prisma.tripAccess.create({
      data: {
        tripId: invitedTrip.id,
        userId: viewer.id,
      },
    });

    await prisma.entry.createMany({
      data: [
        {
          tripId: invitedTrip.id,
          title: "Viewer Entry",
          text: "Story",
          countryCode: "JP",
        },
        {
          tripId: hiddenTrip.id,
          title: "Hidden Entry",
          text: "Story",
          countryCode: "GB",
        },
      ],
    });

    getToken.mockResolvedValue({ sub: viewer.id, role: "viewer" });

    const request = new Request("http://localhost/api/trips/world-map", {
      method: "GET",
    });

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.countries).toEqual(["JP"]);
    expect(body.data.tripsByCountry).toEqual({
      JP: [{ id: invitedTrip.id, title: "Viewer Trip" }],
    });
  });

  it("returns visible trip countries for administrators", async () => {
    const admin = await prisma.user.create({
      data: {
        email: "admin@example.com",
        name: "Admin",
        role: "administrator",
        passwordHash: "hash",
      },
    });

    const firstTrip = await prisma.trip.create({
      data: {
        title: "Alpine Escape",
        startDate: new Date("2025-06-01T00:00:00.000Z"),
        endDate: new Date("2025-06-10T00:00:00.000Z"),
        ownerId: "creator",
      },
    });

    const secondTrip = await prisma.trip.create({
      data: {
        title: "Coastal Retreat",
        startDate: new Date("2025-07-01T00:00:00.000Z"),
        endDate: new Date("2025-07-05T00:00:00.000Z"),
        ownerId: "creator",
      },
    });

    await prisma.entry.createMany({
      data: [
        {
          tripId: firstTrip.id,
          title: "Alps Entry",
          text: "Story",
          countryCode: "CH",
        },
        {
          tripId: secondTrip.id,
          title: "Coast Entry",
          text: "Story",
          countryCode: "PT",
        },
      ],
    });

    getToken.mockResolvedValue({ sub: admin.id, role: "administrator" });

    const request = new Request("http://localhost/api/trips/world-map", {
      method: "GET",
    });

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.countries).toEqual(["CH", "PT"]);
    expect(body.data.tripsByCountry).toEqual({
      CH: [{ id: firstTrip.id, title: "Alpine Escape" }],
      PT: [{ id: secondTrip.id, title: "Coastal Retreat" }],
    });
  });

  it("rejects unauthenticated requests", async () => {
    getToken.mockResolvedValue(null);

    const request = new Request("http://localhost/api/trips/world-map", {
      method: "GET",
    });

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects inactive accounts", async () => {
    const viewer = await prisma.user.create({
      data: {
        email: "inactive@example.com",
        name: "Inactive Viewer",
        role: "viewer",
        passwordHash: "hash",
        isActive: false,
      },
    });

    getToken.mockResolvedValue({ sub: viewer.id, role: "viewer" });

    const request = new Request("http://localhost/api/trips/world-map", {
      method: "GET",
    });

    const response = await get(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
