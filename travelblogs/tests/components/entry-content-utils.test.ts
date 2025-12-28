import { describe, expect, it } from "vitest";

import {
  insertInlineImageAtCursor,
  removeInlineImageByUrl,
} from "../../src/utils/entry-content";

describe("insertInlineImageAtCursor", () => {
  it("inserts a default inline image at the cursor", () => {
    const result = insertInlineImageAtCursor(
      "Hello world",
      "/uploads/photo.jpg",
      11,
      11,
    );

    expect(result.nextText).toBe(
      "Hello world![Entry photo](/uploads/photo.jpg)",
    );
  });

  it("preserves custom alt text when inserting a known image", () => {
    const existing = "Start\n![Sunset](/uploads/photo.jpg)\nEnd";
    const result = insertInlineImageAtCursor(
      existing,
      "/uploads/photo.jpg",
      0,
      0,
    );

    expect(result.nextText).toContain("![Sunset](/uploads/photo.jpg)");
  });
});

describe("removeInlineImageByUrl", () => {
  it("removes inline image references that match the url", () => {
    const text =
      "Start\\n![Alt](/uploads/photo.jpg)\\nMiddle\\n![Other](/uploads/other.jpg)";
    const result = removeInlineImageByUrl(text, "/uploads/photo.jpg");

    expect(result).not.toContain("/uploads/photo.jpg");
    expect(result).toContain("/uploads/other.jpg");
  });
});
