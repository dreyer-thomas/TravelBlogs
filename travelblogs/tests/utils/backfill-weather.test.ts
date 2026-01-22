import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { execSync } from "node:child_process";

const createResponse = (ok: boolean, data: unknown, status = 200) => ({
  ok,
  status,
  json: async () => data,
});

describe("backfillWeather", () => {
  let prisma: PrismaClient;
  const testDatabaseUrl = "file:./prisma/test-backfill-weather.db";

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

  it("updates entries with coordinates missing weather data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createResponse(true, {
        daily: {
          weathercode: [0],
          temperature_2m_max: [22.5],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const trip = await prisma.trip.create({
      data: {
        title: "Weather Backfill Trip",
        startDate: new Date("2025-07-01"),
        endDate: new Date("2025-07-02"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry needing weather",
        text: "Test entry",
        latitude: 40.7128,
        longitude: -74.006,
        createdAt: new Date("2024-01-15"),
      },
    });

    const { backfillWeather } = await import("../../src/utils/backfill-weather");

    await backfillWeather(prisma);

    const updatedEntry = await prisma.entry.findUnique({
      where: { id: entry.id },
    });

    expect(updatedEntry?.weatherCondition).toBe("Clear");
    expect(updatedEntry?.weatherTemperature).toBe(22.5);
    expect(updatedEntry?.weatherIconCode).toBe("0");
  });

  it("skips entries without coordinates", async () => {
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

    const { backfillWeather } = await import("../../src/utils/backfill-weather");

    await backfillWeather(prisma);

    const unchangedEntry = await prisma.entry.findUnique({
      where: { id: entry.id },
    });

    expect(unchangedEntry?.weatherCondition).toBeNull();
    expect(unchangedEntry?.weatherTemperature).toBeNull();
    expect(unchangedEntry?.weatherIconCode).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips entries that already have weather data", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const trip = await prisma.trip.create({
      data: {
        title: "Already Has Weather Trip",
        startDate: new Date("2025-07-05"),
        endDate: new Date("2025-07-06"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry with weather",
        text: "Test entry",
        latitude: 48.8566,
        longitude: 2.3522,
        weatherCondition: "Rain",
        weatherTemperature: 15.0,
        weatherIconCode: "61",
      },
    });

    const { backfillWeather } = await import("../../src/utils/backfill-weather");

    await backfillWeather(prisma);

    const unchangedEntry = await prisma.entry.findUnique({
      where: { id: entry.id },
    });

    expect(unchangedEntry?.weatherCondition).toBe("Rain");
    expect(unchangedEntry?.weatherTemperature).toBe(15.0);
    expect(unchangedEntry?.weatherIconCode).toBe("61");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("handles API failures gracefully and continues processing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createResponse(false, {}, 500))
      .mockResolvedValueOnce(
        createResponse(true, {
          daily: {
            weathercode: [61],
            temperature_2m_max: [18.3],
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const trip = await prisma.trip.create({
      data: {
        title: "Failure Handling Trip",
        startDate: new Date("2025-07-07"),
        endDate: new Date("2025-07-08"),
        ownerId: "creator",
      },
    });

    const entry1 = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry that fails",
        text: "Test entry",
        latitude: 40.0,
        longitude: -75.0,
        createdAt: new Date("2024-01-15"),
      },
    });

    const entry2 = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry that succeeds",
        text: "Test entry",
        latitude: 52.52,
        longitude: 13.405,
        createdAt: new Date("2024-01-16"),
      },
    });

    const { backfillWeather } = await import("../../src/utils/backfill-weather");

    await backfillWeather(prisma);

    const failedEntry = await prisma.entry.findUnique({
      where: { id: entry1.id },
    });
    const successEntry = await prisma.entry.findUnique({
      where: { id: entry2.id },
    });

    expect(failedEntry?.weatherCondition).toBeNull();
    expect(successEntry?.weatherCondition).toBe("Rain");
    expect(successEntry?.weatherTemperature).toBe(18.3);
    expect(successEntry?.weatherIconCode).toBe("61");
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("logs progress for multiple entries", async () => {
    vi.useFakeTimers();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(
      createResponse(true, {
        daily: {
          weathercode: [3],
          temperature_2m_max: [20.0],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const trip = await prisma.trip.create({
      data: {
        title: "Progress Trip",
        startDate: new Date("2025-07-09"),
        endDate: new Date("2025-07-10"),
        ownerId: "creator",
      },
    });

    for (let index = 0; index < 11; index += 1) {
      await prisma.entry.create({
        data: {
          tripId: trip.id,
          title: `Entry ${index}`,
          text: "Test entry",
          latitude: 51.5074,
          longitude: -0.1278,
          createdAt: new Date("2024-01-15"),
        },
      });
    }

    const { backfillWeather } = await import("../../src/utils/backfill-weather");

    const run = backfillWeather(prisma);
    await vi.runAllTimersAsync();
    await run;

    expect(logSpy.mock.calls.some((call) => call[0]?.includes("Progress"))).toBe(true);

    logSpy.mockRestore();
  });

  it("runs only once per process", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(
      createResponse(true, {
        daily: {
          weathercode: [0],
          temperature_2m_max: [25.0],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const trip = await prisma.trip.create({
      data: {
        title: "Once Trip",
        startDate: new Date("2025-07-11"),
        endDate: new Date("2025-07-12"),
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
        createdAt: new Date("2024-01-15"),
      },
    });

    const { backfillWeather } = await import("../../src/utils/backfill-weather");

    await backfillWeather(prisma);
    await backfillWeather(prisma);

    const startLogs = logSpy.mock.calls.filter((call) =>
      String(call[0]).includes("Starting weather backfill"),
    );
    expect(startLogs).toHaveLength(1);

    logSpy.mockRestore();
  });

  it("respects rate limiting between requests", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(
      createResponse(true, {
        daily: {
          weathercode: [0],
          temperature_2m_max: [20.0],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const trip = await prisma.trip.create({
      data: {
        title: "Rate Limit Trip",
        startDate: new Date("2025-07-13"),
        endDate: new Date("2025-07-14"),
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
        createdAt: new Date("2024-01-15"),
      },
    });

    await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry two",
        text: "Test entry",
        latitude: 35.6762,
        longitude: 139.6503,
        createdAt: new Date("2024-01-16"),
      },
    });

    const { backfillWeather } = await import("../../src/utils/backfill-weather");

    const run = backfillWeather(prisma);
    await vi.runAllTimersAsync();
    await run;

    // Verify both entries were processed
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const entries = await prisma.entry.findMany({
      where: { weatherCondition: { not: null } },
    });
    expect(entries).toHaveLength(2);
  });
});
