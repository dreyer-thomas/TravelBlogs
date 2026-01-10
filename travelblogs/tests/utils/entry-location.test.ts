import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";

import {
  extractGpsFromImage,
  filterEntriesWithLocation,
  hasEntryLocation,
  type EntryWithLocation,
} from "../../src/utils/entry-location";

describe("entry location helpers", () => {
  it("detects when an entry has valid coordinates", () => {
    const entry: EntryWithLocation = {
      id: "entry-1",
      tripId: "trip-1",
      title: "Day one",
      createdAt: "2025-06-01T12:00:00.000Z",
      location: {
        latitude: 48.8566,
        longitude: 2.3522,
      },
    };

    expect(hasEntryLocation(entry)).toBe(true);
  });

  it("returns false when location is missing or invalid", () => {
    const missing: EntryWithLocation = {
      id: "entry-2",
      tripId: "trip-1",
      title: "Day two",
      createdAt: "2025-06-02T12:00:00.000Z",
    };
    const empty: EntryWithLocation = {
      id: "entry-3",
      tripId: "trip-1",
      title: "Day three",
      createdAt: "2025-06-03T12:00:00.000Z",
      location: null,
    };
    const invalid: EntryWithLocation = {
      id: "entry-4",
      tripId: "trip-1",
      title: "Day four",
      createdAt: "2025-06-04T12:00:00.000Z",
      location: {
        latitude: Number.NaN,
        longitude: 4.0,
      },
    };

    expect(hasEntryLocation(missing)).toBe(false);
    expect(hasEntryLocation(empty)).toBe(false);
    expect(hasEntryLocation(invalid)).toBe(false);
  });

  it("filters entries down to those with valid locations", () => {
    const entries: EntryWithLocation[] = [
      {
        id: "entry-1",
        tripId: "trip-1",
        title: "Day one",
        createdAt: "2025-06-01T12:00:00.000Z",
        location: { latitude: 48.8566, longitude: 2.3522 },
      },
      {
        id: "entry-2",
        tripId: "trip-1",
        title: "Day two",
        createdAt: "2025-06-02T12:00:00.000Z",
      },
    ];

    const result = filterEntriesWithLocation(entries);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("entry-1");
  });
});

describe("extractGpsFromImage", () => {
  it("should extract GPS coordinates from image with EXIF data", async () => {
    const testImagePath = path.join(
      __dirname,
      "../fixtures/test-image-with-gps.jpg",
    );
    const buffer = await fs.readFile(testImagePath);

    const result = await extractGpsFromImage(buffer);

    expect(result).not.toBeNull();
    expect(result?.latitude).toBeTypeOf("number");
    expect(result?.longitude).toBeTypeOf("number");
    expect(result?.latitude).toBeGreaterThan(-90);
    expect(result?.latitude).toBeLessThan(90);
    expect(result?.longitude).toBeGreaterThan(-180);
    expect(result?.longitude).toBeLessThan(180);
  });

  it("should return null for image without GPS data", async () => {
    const testImagePath = path.join(
      __dirname,
      "../fixtures/test-image-no-gps.jpg",
    );
    const buffer = await fs.readFile(testImagePath);

    const result = await extractGpsFromImage(buffer);

    expect(result).toBeNull();
  });

  it("should return null for invalid image buffer", async () => {
    const invalidBuffer = Buffer.from("not an image");

    const result = await extractGpsFromImage(invalidBuffer);

    expect(result).toBeNull();
  });

  it("should handle corrupted EXIF data gracefully", async () => {
    const corruptedBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
      0xff, 0xd9,
    ]);

    const result = await extractGpsFromImage(corruptedBuffer);

    expect(result).toBeNull();
  });
});
