import { describe, expect, it } from "vitest";

import { inferMediaType, mapEntryToReader } from "../../src/utils/entry-reader";

describe("mapEntryToReader", () => {
  it("maps API entry fields to EntryReader props with camelCase fields", () => {
    const mapped = mapEntryToReader({
      id: "entry-1",
      tripId: "trip-1",
      title: "Rainy afternoon",
      text: "Warm cafes and misty streets.",
      createdAt: "2025-05-03T00:00:00.000Z",
      tags: ["Coffee", "Rain"],
      media: [
        {
          id: "media-1",
          url: "https://example.com/hero.jpg",
          createdAt: "2025-05-03T00:00:00.000Z",
        },
      ],
    });

    expect(mapped).toEqual({
      id: "entry-1",
      title: "Rainy afternoon",
      body: "Warm cafes and misty streets.",
      createdAt: "2025-05-03T00:00:00.000Z",
      tags: ["Coffee", "Rain"],
      location: null,
      weatherCondition: null,
      weatherTemperature: null,
      weatherIconCode: null,
      media: [
        {
          id: "media-1",
          url: "https://example.com/hero.jpg",
          alt: null,
          height: null,
          type: "image",
          width: null,
        },
      ],
      navigation: {
        previousEntryId: null,
        nextEntryId: null,
        previousEntryTitle: null,
        nextEntryTitle: null,
        previousEntryDate: null,
        nextEntryDate: null,
      },
    });
  });
});

describe("inferMediaType", () => {
  it("classifies known image extensions", () => {
    expect(inferMediaType("/uploads/entries/1/photo.jpg")).toBe("image");
    expect(inferMediaType("/uploads/entries/1/photo.png")).toBe("image");
    expect(inferMediaType("/uploads/entries/1/photo.webp")).toBe("image");
  });

  it("classifies known video extensions", () => {
    expect(inferMediaType("/uploads/entries/1/clip.mp4")).toBe("video");
    expect(inferMediaType("/uploads/entries/1/clip.mov")).toBe("video");
  });

  it("returns null for unknown or missing extensions", () => {
    expect(inferMediaType("/uploads/entries/1/no-extension")).toBeNull();
    expect(inferMediaType("/uploads/entries/1/file.txt")).toBeNull();
  });
});
