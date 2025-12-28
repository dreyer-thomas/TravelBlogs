import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  COVER_IMAGE_MAX_BYTES,
  createCoverPreviewUrl,
  isCoverImageUrl,
  validateCoverImageFile,
} from "../../src/utils/media";

const ensureFileConstructor = () => {
  if (typeof File !== "undefined") {
    return;
  }

  class NodeFile extends Blob {
    name: string;
    lastModified: number;

    constructor(
      parts: BlobPart[],
      name: string,
      options?: FilePropertyBag,
    ) {
      super(parts, options);
      this.name = name;
      this.lastModified = options?.lastModified ?? Date.now();
    }
  }

  globalThis.File = NodeFile as typeof File;
};

const buildFile = (size: number, type: string) => {
  ensureFileConstructor();
  const content = new Uint8Array(size);
  return new File([content], "cover", { type });
};

describe("cover image helpers", () => {
  beforeEach(() => {
    ensureFileConstructor();
  });

  afterEach(() => {
    if (URL.createObjectURL) {
      vi.restoreAllMocks();
    }
  });

  it("rejects unsupported file types", () => {
    const file = buildFile(10, "text/plain");

    expect(validateCoverImageFile(file)).toContain("JPG");
  });

  it("rejects files larger than 5MB", () => {
    const file = buildFile(COVER_IMAGE_MAX_BYTES + 1, "image/png");

    expect(validateCoverImageFile(file)).toContain("5MB");
  });

  it("accepts valid cover image files", () => {
    const file = buildFile(1024, "image/webp");

    expect(validateCoverImageFile(file)).toBeNull();
  });

  it("recognizes cover image URLs from uploads path", () => {
    expect(isCoverImageUrl("/uploads/trips/cover-123.jpg")).toBe(true);
    expect(
      isCoverImageUrl("https://example.com/uploads/trips/cover-123.jpg"),
    ).toBe(false);
    expect(isCoverImageUrl("https://example.com/other.jpg")).toBe(false);
  });

  it("creates a preview URL for selected files", () => {
    ensureFileConstructor();
    const file = buildFile(12, "image/png");

    if (!URL.createObjectURL) {
      URL.createObjectURL = () => "blob:placeholder";
    }

    const createObjectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:cover-preview");

    expect(createCoverPreviewUrl(file)).toBe("blob:cover-preview");
    expect(createObjectUrl).toHaveBeenCalledWith(file);
  });
});
