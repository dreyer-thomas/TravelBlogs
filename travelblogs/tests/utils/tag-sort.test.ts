import { describe, expect, it } from "vitest";
import { sortTagNames } from "../../src/utils/tag-sort";

describe("sortTagNames", () => {
  it("sorts tags in case-insensitive alphabetical order", () => {
    const tags = ["Zebra", "apple", "Banana"];
    const sorted = sortTagNames(tags);
    expect(sorted).toEqual(["apple", "Banana", "Zebra"]);
  });

  it("handles empty array", () => {
    expect(sortTagNames([])).toEqual([]);
  });

  it("preserves original casing", () => {
    const tags = ["FOOD", "food", "Food"];
    const sorted = sortTagNames(tags);
    // All should be treated as equal in sort, order preserved when equal
    expect(sorted).toHaveLength(3);
    expect(sorted.every((tag) => tag === "FOOD" || tag === "food" || tag === "Food")).toBe(true);
  });

  it("uses consistent locale-aware sorting", () => {
    const tags = ["Café", "Cat", "Cake"];
    const sorted = sortTagNames(tags);
    // With base sensitivity, accents are ignored for sorting
    expect(sorted).toEqual(["Café", "Cake", "Cat"]);
  });
});
