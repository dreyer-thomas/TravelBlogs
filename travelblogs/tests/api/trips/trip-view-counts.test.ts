import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-trip-view-counts.db";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const startOfUtcDay = (date: Date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

const daysAgo = (days: number) =>
  new Date(startOfUtcDay(new Date()).getTime() - days * DAY_IN_MS);

describe("trip view counts", () => {
  let getViewCounts: (
    request: Request,
    context: { params: { id: string } },
  ) => Promise<Response>;
  let getTripViewCounts: (tripId: string) => Promise<{
    trip: { total: number; last30Days: number };
    entries: { entryId: string; total: number }[];
  }>;
  let prisma: PrismaClient;

  const requestCounts = (tripId: string) =>
    getViewCounts(
      new Request(`http://localhost/api/trips/${tripId}/view-counts`, {
        method: "GET",
      }),
      { params: { id: tripId } },
    );

  const createTrip = async (ownerId: string) =>
    prisma.trip.create({
      data: {
        title: "Counted Trip",
        startDate: new Date("2026-05-01"),
        endDate: new Date("2026-05-10"),
        ownerId,
      },
    });

  const createUser = async (
    id: string,
    role: "creator" | "administrator" | "viewer",
    isActive = true,
  ) =>
    prisma.user.create({
      data: {
        id,
        name: id,
        email: `${id}@example.com`,
        passwordHash: "hash",
        role,
        isActive,
      },
    });

  beforeAll(async () => {
    // `daysAgo()` computes buckets when a row is inserted and the production
    // helper computes the window when the query runs. If UTC midnight falls
    // between the two, the `daysAgo(29)` bucket drops out of the window and
    // the suite fails for no reason. Only `Date` is faked, so the SQLite
    // driver and every await behave normally.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));

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

    const routeModule = await import(
      "../../../src/app/api/trips/[id]/view-counts/route"
    );
    getViewCounts = routeModule.GET as typeof getViewCounts;

    const counterModule = await import("../../../src/utils/view-counter");
    getTripViewCounts = counterModule.getTripViewCounts as typeof getTripViewCounts;
  });

  beforeEach(async () => {
    getToken.mockReset();
    getToken.mockResolvedValue(null);
    await prisma.entryView.deleteMany();
    await prisma.tripView.deleteMany();
    await prisma.entryMedia.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.tripAccess.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();

    const databaseFile = testDatabaseUrl.replace(/^file:/, "");
    for (const suffix of ["", "-journal", "-wal", "-shm"]) {
      rmSync(`${databaseFile}${suffix}`, { force: true });
    }
  });

  describe("getTripViewCounts", () => {
    it("sums all trip view buckets and the last 30 day buckets separately", async () => {
      const trip = await createTrip("creator");

      await prisma.tripView.createMany({
        data: [
          { tripId: trip.id, day: daysAgo(0), views: 4 },
          { tripId: trip.id, day: daysAgo(29), views: 3 },
          // Bucket 30 is outside the 30-bucket window (today plus 29 earlier days).
          { tripId: trip.id, day: daysAgo(30), views: 100 },
          { tripId: trip.id, day: daysAgo(400), views: 7 },
        ],
      });

      const counts = await getTripViewCounts(trip.id);

      expect(counts.trip.total).toBe(114);
      expect(counts.trip.last30Days).toBe(7);
    });

    it("returns zeros for a trip that was never viewed", async () => {
      const trip = await createTrip("creator");

      const counts = await getTripViewCounts(trip.id);

      expect(counts.trip).toEqual({ total: 0, last30Days: 0 });
      expect(counts.entries).toEqual([]);
    });

    it("sums per-entry totals across days for every entry of the trip", async () => {
      const trip = await createTrip("creator");
      const first = await prisma.entry.create({
        data: { tripId: trip.id, title: "Day one", text: "One." },
      });
      const second = await prisma.entry.create({
        data: { tripId: trip.id, title: "Day two", text: "Two." },
      });

      await prisma.entryView.createMany({
        data: [
          { entryId: first.id, day: daysAgo(0), views: 2 },
          { entryId: first.id, day: daysAgo(40), views: 5 },
          { entryId: second.id, day: daysAgo(1), views: 9 },
        ],
      });

      const counts = await getTripViewCounts(trip.id);
      const byEntry = new Map(
        counts.entries.map((entry) => [entry.entryId, entry.total]),
      );

      expect(byEntry.get(first.id)).toBe(7);
      expect(byEntry.get(second.id)).toBe(9);
    });

    it("ignores entries and view rows that belong to another trip", async () => {
      const trip = await createTrip("creator");
      const otherTrip = await createTrip("creator");
      const otherEntry = await prisma.entry.create({
        data: { tripId: otherTrip.id, title: "Elsewhere", text: "Elsewhere." },
      });

      await prisma.tripView.create({
        data: { tripId: otherTrip.id, day: daysAgo(0), views: 50 },
      });
      await prisma.entryView.create({
        data: { entryId: otherEntry.id, day: daysAgo(0), views: 50 },
      });

      const counts = await getTripViewCounts(trip.id);

      expect(counts.trip).toEqual({ total: 0, last30Days: 0 });
      expect(counts.entries).toEqual([]);
    });

    it("aggregates every entry in a single query regardless of entry count", async () => {
      const trip = await createTrip("creator");
      for (let index = 0; index < 5; index += 1) {
        const entry = await prisma.entry.create({
          data: { tripId: trip.id, title: `Day ${index}`, text: "Text." },
        });
        await prisma.entryView.create({
          data: { entryId: entry.id, day: daysAgo(0), views: index + 1 },
        });
      }

      const counterModule = await import("../../../src/utils/view-counter");
      const dbModule = await import("../../../src/utils/db");
      const groupBySpy = vi.spyOn(dbModule.prisma.entryView, "groupBy");

      const counts = await counterModule.getTripViewCounts(trip.id);

      expect(counts.entries).toHaveLength(5);
      expect(groupBySpy).toHaveBeenCalledTimes(1);

      groupBySpy.mockRestore();
    });
  });

  describe("GET /api/trips/[id]/view-counts", () => {
    it("rejects an anonymous caller with the standard error shape and no counts", async () => {
      const trip = await createTrip("creator");
      await prisma.tripView.create({
        data: { tripId: trip.id, day: daysAgo(0), views: 12 },
      });

      const response = await requestCounts(trip.id);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toEqual({
        data: null,
        error: { code: "UNAUTHORIZED", message: "Authentication required." },
      });
      expect(body.data).toBeNull();
      expect(Object.keys(body)).toEqual(["data", "error"]);
    });

    it("returns counts to the trip owner", async () => {
      const owner = await createUser("owner-1", "creator");
      const trip = await createTrip(owner.id);
      const entry = await prisma.entry.create({
        data: { tripId: trip.id, title: "Day one", text: "One." },
      });

      await prisma.tripView.createMany({
        data: [
          { tripId: trip.id, day: daysAgo(0), views: 6 },
          { tripId: trip.id, day: daysAgo(90), views: 4 },
        ],
      });
      await prisma.entryView.create({
        data: { entryId: entry.id, day: daysAgo(2), views: 3 },
      });

      getToken.mockResolvedValue({ sub: owner.id, role: "creator" });

      const response = await requestCounts(trip.id);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.error).toBeNull();
      expect(body.data.trip).toEqual({ total: 10, last30Days: 6 });
      expect(body.data.entries).toEqual([{ entryId: entry.id, total: 3 }]);
    });

    it("returns counts to a contributor who does not own the trip", async () => {
      const owner = await createUser("owner-2", "creator");
      const contributor = await createUser("contributor-1", "viewer");
      const trip = await createTrip(owner.id);

      await prisma.tripAccess.create({
        data: { tripId: trip.id, userId: contributor.id, canContribute: true },
      });
      await prisma.tripView.create({
        data: { tripId: trip.id, day: daysAgo(0), views: 8 },
      });

      getToken.mockResolvedValue({ sub: contributor.id, role: "viewer" });

      const response = await requestCounts(trip.id);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.trip).toEqual({ total: 8, last30Days: 8 });
    });

    it("returns counts to an administrator", async () => {
      const owner = await createUser("owner-3", "creator");
      const admin = await createUser("admin-1", "administrator");
      const trip = await createTrip(owner.id);

      await prisma.tripView.create({
        data: { tripId: trip.id, day: daysAgo(0), views: 2 },
      });

      getToken.mockResolvedValue({ sub: admin.id, role: "administrator" });

      const response = await requestCounts(trip.id);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.trip.total).toBe(2);
    });

    it("rejects a read-only viewer without leaking the counts", async () => {
      const owner = await createUser("owner-4", "creator");
      const viewer = await createUser("viewer-1", "viewer");
      const trip = await createTrip(owner.id);

      await prisma.tripAccess.create({
        data: { tripId: trip.id, userId: viewer.id, canContribute: false },
      });
      await prisma.tripView.create({
        data: { tripId: trip.id, day: daysAgo(0), views: 77 },
      });

      getToken.mockResolvedValue({ sub: viewer.id, role: "viewer" });

      const response = await requestCounts(trip.id);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.data).toBeNull();
      expect(body.error.code).toBe("FORBIDDEN");
      expect(Object.keys(body)).toEqual(["data", "error"]);
    });

    it("rejects a deactivated account", async () => {
      const owner = await createUser("owner-5", "creator", false);
      const trip = await createTrip(owner.id);

      getToken.mockResolvedValue({ sub: owner.id, role: "creator" });

      const response = await requestCounts(trip.id);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error.code).toBe("FORBIDDEN");
    });

    it("returns 404 for a trip that does not exist", async () => {
      const admin = await createUser("admin-2", "administrator");
      getToken.mockResolvedValue({ sub: admin.id, role: "administrator" });

      const response = await requestCounts("missing-trip");
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("reports zeros rather than nulls for an unviewed trip", async () => {
      const owner = await createUser("owner-6", "creator");
      const trip = await createTrip(owner.id);
      const entry = await prisma.entry.create({
        data: { tripId: trip.id, title: "Unread", text: "Unread." },
      });

      getToken.mockResolvedValue({ sub: owner.id, role: "creator" });

      const response = await requestCounts(trip.id);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.trip).toEqual({ total: 0, last30Days: 0 });
      expect(body.data.entries).toEqual([{ entryId: entry.id, total: 0 }]);
    });
  });
});
