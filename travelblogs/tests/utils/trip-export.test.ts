import { describe, expect, it } from "vitest";

import {
  EXPORT_SCHEMA_VERSION,
  buildExportMeta,
  resolveUploadRoot,
  serializeTrip,
  serializeEntries,
} from "../../src/utils/trip-export";
import { APP_VERSION } from "../../src/utils/app-version";

describe("trip export helpers", () => {
  it("exposes a schema version", () => {
    expect(EXPORT_SCHEMA_VERSION).toBeGreaterThan(0);
  });

  it("builds metadata with counts and timestamp", () => {
    const meta = buildExportMeta({
      tripId: "trip-1",
      entryCount: 2,
      mediaCount: 5,
      exportedAt: new Date("2026-02-07T12:00:00Z"),
    });

    expect(meta.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(meta.tripId).toBe("trip-1");
    expect(meta.appVersion).toBe(APP_VERSION);
    expect(meta.counts.trip).toBe(1);
    expect(meta.counts.entries).toBe(2);
    expect(meta.counts.media).toBe(5);
    expect(meta.exportedAt).toBe("2026-02-07T12:00:00.000Z");
  });

  it("serializes trip dates to ISO strings", () => {
    const trip = serializeTrip({
      id: "trip-1",
      title: "Test",
      description: "Desc",
      startDate: new Date("2025-01-01T00:00:00Z"),
      endDate: new Date("2025-01-02T00:00:00Z"),
      coverImageUrl: "/uploads/trips/cover.jpg",
      ownerId: "creator",
      createdAt: new Date("2025-01-03T00:00:00Z"),
      updatedAt: new Date("2025-01-04T00:00:00Z"),
    });

    expect(trip.startDate).toBe("2025-01-01T00:00:00.000Z");
    expect(trip.endDate).toBe("2025-01-02T00:00:00.000Z");
    expect(trip.createdAt).toBe("2025-01-03T00:00:00.000Z");
    expect(trip.updatedAt).toBe("2025-01-04T00:00:00.000Z");
  });

  it("serializes entries with ISO dates", () => {
    const entries = serializeEntries([
      {
        id: "entry-1",
        tripId: "trip-1",
        title: "Entry",
        text: "Hello",
        entryDate: new Date("2025-02-01T00:00:00Z"),
        coverImageUrl: null,
        tags: ["tag"],
        latitude: 10.5,
        longitude: 20.5,
        locationName: "Somewhere",
        weatherCondition: "partly-cloudy",
        weatherTemperature: 12,
        weatherIconCode: "2",
        createdAt: new Date("2025-02-02T00:00:00Z"),
        updatedAt: new Date("2025-02-03T00:00:00Z"),
      },
    ]);

    expect(entries[0]?.entryDate).toBe("2025-02-01T00:00:00.000Z");
    expect(entries[0]?.createdAt).toBe("2025-02-02T00:00:00.000Z");
    expect(entries[0]?.updatedAt).toBe("2025-02-03T00:00:00.000Z");
  });

  it("resolves upload root from environment when set", () => {
    process.env.MEDIA_UPLOAD_DIR = "/tmp/uploads";
    expect(resolveUploadRoot()).toBe("/tmp/uploads");
    delete process.env.MEDIA_UPLOAD_DIR;
  });
});
