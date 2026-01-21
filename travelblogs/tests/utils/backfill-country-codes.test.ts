import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { execSync } from "node:child_process";

const createResponse = (ok: boolean, data: unknown, status = 200) => ({
  ok,
  status,
  json: async () => data,
});

describe("backfillCountryCodes", () => {
  let prisma: PrismaClient;
  const testDatabaseUrl = "file:./prisma/test-backfill-country-codes.db";

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    execSync("npx prisma migrate deploy", {
      stdio: "ignore",
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl,
      },
    });

    const adapter = new PrismaBetterSqlite3({
      url: testDatabaseUrl.replace(/^file:/, ""),
    });
    prisma = new PrismaClient({ adapter });
  });

  beforeEach(async () => {
    await prisma.entry.deleteMany();
    await prisma.trip.deleteMany();
    vi.resetModules();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("updates entries with coordinates missing country codes", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createResponse(true, { address: { country_code: "us" } }),
      );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const trip = await prisma.trip.create({
      data: {
        title: "Country Backfill Trip",
        startDate: new Date("2025-07-01"),
        endDate: new Date("2025-07-02"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry needing country",
        text: "Test entry",
        latitude: 40.7128,
        longitude: -74.006,
      },
    });

    const { backfillCountryCodes } = await import(
      "../../src/utils/backfill-country-codes"
    );

    const run = backfillCountryCodes(prisma);
    await vi.runAllTimersAsync();
    await run;

    const updatedEntry = await prisma.entry.findUnique({
      where: { id: entry.id },
    });

    expect(updatedEntry?.countryCode).toBe("US");
  });

  it("skips entries without coordinates", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const trip = await prisma.trip.create({
      data: {
        title: "No Coordinates Trip",
        startDate: new Date("2025-07-03"),
        endDate: new Date("2025-07-04"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry without coordinates",
        text: "Test entry",
        latitude: null,
        longitude: null,
      },
    });

    const { backfillCountryCodes } = await import(
      "../../src/utils/backfill-country-codes"
    );

    const run = backfillCountryCodes(prisma);
    await vi.runAllTimersAsync();
    await run;

    const unchangedEntry = await prisma.entry.findUnique({
      where: { id: entry.id },
    });

    expect(unchangedEntry?.countryCode).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logs progress and handles API failures gracefully", async () => {
    vi.useFakeTimers();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createResponse(false, {}, 500))
      .mockResolvedValue(
        createResponse(true, { address: { country_code: "de" } }),
      );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const trip = await prisma.trip.create({
      data: {
        title: "Progress Trip",
        startDate: new Date("2025-07-05"),
        endDate: new Date("2025-07-06"),
        ownerId: "creator",
      },
    });

    for (let index = 0; index < 11; index += 1) {
      await prisma.entry.create({
        data: {
          tripId: trip.id,
          title: `Entry ${index}`,
          text: "Test entry",
          latitude: 52.52,
          longitude: 13.405,
        },
      });
    }

    const { backfillCountryCodes } = await import(
      "../../src/utils/backfill-country-codes"
    );

    const run = backfillCountryCodes(prisma);
    await vi.runAllTimersAsync();
    await run;

    expect(warnSpy).toHaveBeenCalled();
    expect(logSpy.mock.calls.some((call) => call[0]?.includes("Progress"))).toBe(
      true,
    );

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("runs only once per process", async () => {
    vi.useFakeTimers();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createResponse(true, { address: { country_code: "us" } }),
      );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const trip = await prisma.trip.create({
      data: {
        title: "Once Trip",
        startDate: new Date("2025-07-07"),
        endDate: new Date("2025-07-08"),
        ownerId: "creator",
      },
    });

    await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry",
        text: "Test entry",
        latitude: 34.0522,
        longitude: -118.2437,
      },
    });

    const { backfillCountryCodes } = await import(
      "../../src/utils/backfill-country-codes"
    );

    const run = backfillCountryCodes(prisma);
    await vi.runAllTimersAsync();
    await run;
    await backfillCountryCodes(prisma);

    const startLogs = logSpy.mock.calls.filter((call) =>
      String(call[0]).includes("Starting country code backfill"),
    );
    expect(startLogs).toHaveLength(1);

    logSpy.mockRestore();
  });

  it("waits between reverse geocode calls", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createResponse(true, { address: { country_code: "jp" } }),
      );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const trip = await prisma.trip.create({
      data: {
        title: "Rate Limit Trip",
        startDate: new Date("2025-07-09"),
        endDate: new Date("2025-07-10"),
        ownerId: "creator",
      },
    });

    await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry one",
        text: "Test entry",
        latitude: 35.6762,
        longitude: 139.6503,
      },
    });

    await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry two",
        text: "Test entry",
        latitude: 35.6762,
        longitude: 139.6503,
      },
    });

    const { backfillCountryCodes } = await import(
      "../../src/utils/backfill-country-codes"
    );

    const run = backfillCountryCodes(prisma);

    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await vi.runAllTimersAsync();
    await run;
  });
});
