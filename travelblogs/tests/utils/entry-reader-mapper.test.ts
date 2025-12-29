import { describe, expect, it } from "vitest";

import { mapEntryToReader } from "../../src/utils/entry-reader";

describe("mapEntryToReader", () => {
  it("maps API entry fields to EntryReader props with camelCase fields", () => {
    const mapped = mapEntryToReader({
      id: "entry-1",
      tripId: "trip-1",
      title: "Rainy afternoon",
      text: "Warm cafes and misty streets.",
      createdAt: "2025-05-03T00:00:00.000Z",
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
