import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabaseUrl = "file:./prisma/test-share-view-counter.db";

const BOT_USER_AGENT =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

// A real device whose model name contains "BOT"; it must not be filtered.
const DEVICE_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 11; CUBOT NOTE 20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";

const startOfUtcDay = (date: Date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

describe("POST /api/trips/share/[token]/view", () => {
  let post: (
    request: Request,
    context: { params: { token: string } },
  ) => Promise<Response>;
  let deleteTrip: (
    request: Request,
    context: { params: { id: string } },
  ) => Promise<Response>;
  let deleteEntry: (
    request: Request,
    context: { params: { id: string } },
  ) => Promise<Response>;
  let prisma: PrismaClient;

  // `null` sends no User-Agent at all, which the counter treats as a bot.
  const postView = (
    token: string,
    body?: unknown,
    userAgent: string | null = BROWSER_USER_AGENT,
  ) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (userAgent) {
      headers["user-agent"] = userAgent;
    }

    return post(
      new Request(`http://localhost/api/trips/share/${token}/view`, {
        method: "POST",
        headers,
        body: JSON.stringify(body ?? {}),
      }),
      { params: { token } },
    );
  };

  const createSharedTrip = async (token: string) => {
    const trip = await prisma.trip.create({
      data: {
        title: "Shared Trip",
        startDate: new Date("2026-05-01"),
        endDate: new Date("2026-05-10"),
        ownerId: "creator",
      },
    });

    await prisma.tripShareLink.create({
      data: { tripId: trip.id, token },
    });

    return trip;
  };

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

    const routeModule = await import(
      "../../../src/app/api/trips/share/[token]/view/route"
    );
    post = routeModule.POST as typeof post;

    const tripRouteModule = await import("../../../src/app/api/trips/[id]/route");
    deleteTrip = tripRouteModule.DELETE as typeof deleteTrip;

    const entryRouteModule = await import(
      "../../../src/app/api/entries/[id]/route"
    );
    deleteEntry = entryRouteModule.DELETE as typeof deleteEntry;
  });

  beforeEach(async () => {
    getToken.mockReset();
    getToken.mockResolvedValue(null);
    await prisma.entryView.deleteMany();
    await prisma.tripView.deleteMany();
    await prisma.entryMedia.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.tripShareLink.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();

    // Remove the database file so the next run starts from a clean tree rather
    // than re-applying migrations over whatever a previous branch left behind.
    const databaseFile = testDatabaseUrl.replace(/^file:/, "");
    for (const suffix of ["", "-journal", "-wal", "-shm"]) {
      rmSync(`${databaseFile}${suffix}`, { force: true });
    }
  });

  it("counts an anonymous trip view", async () => {
    const trip = await createSharedTrip("token-trip-view");

    // Bracket the request rather than recomputing "today" after it: a run that
    // crosses 00:00 UTC would otherwise compare against a different bucket.
    const dayBeforeRequest = startOfUtcDay(new Date());
    const response = await postView("token-trip-view");
    const dayAfterRequest = startOfUtcDay(new Date());
    const body = await response.json();

    const rows = await prisma.tripView.findMany({ where: { tripId: trip.id } });

    expect(response.status).toBe(200);
    expect(body).toEqual({ data: { counted: true }, error: null });
    expect(rows).toHaveLength(1);
    expect(rows[0].views).toBe(1);
    expect([
      dayBeforeRequest.toISOString(),
      dayAfterRequest.toISOString(),
    ]).toContain(rows[0].day.toISOString());
  });

  it("stores nothing but target, day and count", async () => {
    const trip = await createSharedTrip("token-privacy");

    await postView("token-privacy", {}, "Mozilla/5.0 (Macintosh)");

    const row = await prisma.tripView.findFirstOrThrow({
      where: { tripId: trip.id },
    });

    expect(Object.keys(row).sort()).toEqual(["day", "id", "tripId", "views"]);
  });

  it("counts an anonymous entry view without touching the trip counter", async () => {
    const trip = await createSharedTrip("token-entry-view");
    const entry = await prisma.entry.create({
      data: { tripId: trip.id, title: "Day one", text: "Day one." },
    });

    const response = await postView("token-entry-view", { entryId: entry.id });
    const body = await response.json();

    const entryRows = await prisma.entryView.findMany({
      where: { entryId: entry.id },
    });
    const tripRows = await prisma.tripView.findMany({
      where: { tripId: trip.id },
    });

    expect(response.status).toBe(200);
    expect(body.data.counted).toBe(true);
    expect(entryRows).toHaveLength(1);
    expect(entryRows[0].views).toBe(1);
    expect(tripRows).toHaveLength(0);
  });

  it("accumulates two views on the same UTC day into a single row", async () => {
    const trip = await createSharedTrip("token-accumulate");

    await postView("token-accumulate");
    await postView("token-accumulate");

    const rows = await prisma.tripView.findMany({ where: { tripId: trip.id } });

    expect(rows).toHaveLength(1);
    expect(rows[0].views).toBe(2);
  });

  it("keeps a previous day's row unchanged when a new day is bucketed", async () => {
    const trip = await createSharedTrip("token-daily-buckets");
    const previousDay = new Date(
      startOfUtcDay(new Date()).getTime() - 24 * 60 * 60 * 1000,
    );

    await prisma.tripView.create({
      data: { tripId: trip.id, day: previousDay, views: 7 },
    });

    await postView("token-daily-buckets");

    const rows = await prisma.tripView.findMany({
      where: { tripId: trip.id },
      orderBy: { day: "asc" },
    });

    expect(rows).toHaveLength(2);
    expect(rows[0].day.toISOString()).toBe(previousDay.toISOString());
    expect(rows[0].views).toBe(7);
    expect(rows[1].views).toBe(1);
  });

  it("does not count signed-in users", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const trip = await createSharedTrip("token-signed-in");

    const response = await postView("token-signed-in");
    const body = await response.json();

    const rows = await prisma.tripView.findMany({ where: { tripId: trip.id } });

    expect(response.status).toBe(200);
    expect(body).toEqual({ data: { counted: false }, error: null });
    expect(rows).toHaveLength(0);
  });

  it("does not count known bots", async () => {
    const trip = await createSharedTrip("token-bot");

    const response = await postView("token-bot", {}, BOT_USER_AGENT);
    const body = await response.json();

    const rows = await prisma.tripView.findMany({ where: { tripId: trip.id } });

    expect(response.status).toBe(200);
    expect(body).toEqual({ data: { counted: false }, error: null });
    expect(rows).toHaveLength(0);
  });

  it("does not count a request that sends no User-Agent at all", async () => {
    const trip = await createSharedTrip("token-no-ua");

    const response = await postView("token-no-ua", {}, null);
    const body = await response.json();

    const rows = await prisma.tripView.findMany({ where: { tripId: trip.id } });

    expect(response.status).toBe(200);
    expect(body).toEqual({ data: { counted: false }, error: null });
    expect(rows).toHaveLength(0);
  });

  it("counts a real device whose model name contains BOT", async () => {
    const trip = await createSharedTrip("token-device-ua");

    const response = await postView("token-device-ua", {}, DEVICE_USER_AGENT);
    const body = await response.json();

    const rows = await prisma.tripView.findMany({ where: { tripId: trip.id } });

    expect(response.status).toBe(200);
    expect(body).toEqual({ data: { counted: true }, error: null });
    expect(rows).toHaveLength(1);
    expect(rows[0].views).toBe(1);
  });

  it("does not count a view when the session check throws", async () => {
    const trip = await createSharedTrip("token-session-error");
    getToken.mockRejectedValueOnce(new Error("no secret"));

    const response = await postView("token-session-error");
    const body = await response.json();

    const rows = await prisma.tripView.findMany({ where: { tripId: trip.id } });

    expect(response.status).toBe(200);
    expect(body).toEqual({ data: { counted: false }, error: null });
    expect(rows).toHaveLength(0);
  });

  it("returns 404 for an unknown or revoked token", async () => {
    const trip = await createSharedTrip("token-revoked");
    await prisma.tripShareLink.deleteMany({ where: { tripId: trip.id } });

    const response = await postView("token-revoked");
    const body = await response.json();

    const rows = await prisma.tripView.findMany({ where: { tripId: trip.id } });

    expect(response.status).toBe(404);
    expect(body).toEqual({
      data: null,
      error: { code: "NOT_FOUND", message: expect.any(String) },
    });
    expect(rows).toHaveLength(0);
  });

  it("returns 404 for an entry that belongs to another trip", async () => {
    await createSharedTrip("token-other-trip");
    const otherTrip = await prisma.trip.create({
      data: {
        title: "Other Trip",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-06-10"),
        ownerId: "creator",
      },
    });
    const foreignEntry = await prisma.entry.create({
      data: { tripId: otherTrip.id, title: "Foreign", text: "Foreign." },
    });

    const response = await postView("token-other-trip", {
      entryId: foreignEntry.id,
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      data: null,
      error: { code: "NOT_FOUND", message: expect.any(String) },
    });
    expect(await prisma.entryView.count()).toBe(0);
    expect(await prisma.tripView.count()).toBe(0);
  });

  it("rejects an invalid request body", async () => {
    await createSharedTrip("token-invalid-body");

    const response = await post(
      new Request("http://localhost/api/trips/share/token-invalid-body/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: 42 }),
      }),
      { params: { token: "token-invalid-body" } },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("removes trip view rows when the trip is deleted", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const trip = await createSharedTrip("token-delete-trip");
    await prisma.tripView.create({
      data: { tripId: trip.id, day: startOfUtcDay(new Date()), views: 3 },
    });

    const response = await deleteTrip(
      new Request(`http://localhost/api/trips/${trip.id}`, {
        method: "DELETE",
      }),
      { params: { id: trip.id } },
    );

    expect(response.status).toBe(200);
    expect(await prisma.tripView.count({ where: { tripId: trip.id } })).toBe(0);
  });

  it("removes entry view rows when the entry is deleted", async () => {
    getToken.mockResolvedValue({ sub: "creator" });
    const trip = await createSharedTrip("token-delete-entry");
    const entry = await prisma.entry.create({
      data: { tripId: trip.id, title: "Doomed", text: "Doomed." },
    });
    await prisma.entryView.create({
      data: { entryId: entry.id, day: startOfUtcDay(new Date()), views: 5 },
    });

    const response = await deleteEntry(
      new Request(`http://localhost/api/entries/${entry.id}`, {
        method: "DELETE",
      }),
      { params: { id: entry.id } },
    );

    expect(response.status).toBe(200);
    expect(await prisma.entryView.count({ where: { entryId: entry.id } })).toBe(
      0,
    );
  });
});
