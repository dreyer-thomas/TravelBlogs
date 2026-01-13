import { describe, expect, it } from "vitest";

import { getDistinctTagList } from "../../src/utils/entry-tags";

describe("getDistinctTagList", () => {
  it("deduplicates tags case-insensitively and sorts them", () => {
    const entries = [
      { tags: ["Food", "Hike"] },
      { tags: ["food", "Sunset"] },
      { tags: ["  Hike  ", ""] },
    ];

    expect(getDistinctTagList(entries)).toEqual(["Food", "Hike", "Sunset"]);
  });

  it("returns an empty list when no tags exist", () => {
    expect(getDistinctTagList([{ tags: [] }])).toEqual([]);
    expect(getDistinctTagList([])).toEqual([]);
  });
});
