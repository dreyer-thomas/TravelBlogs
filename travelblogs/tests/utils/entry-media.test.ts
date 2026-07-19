import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  COVER_IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
  getImageMimeTypeFromUrl,
  resolveUploadFilePath,
} from "../../src/utils/media";
import { validateEntryMediaFile } from "../../src/utils/entry-media";

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
  return new File([content], "media", { type });
};

describe("entry media validation", () => {
  it("rejects unsupported file types", () => {
    const file = buildFile(10, "text/plain");

    expect(validateEntryMediaFile(file)).toContain("MP4");
  });

  it("rejects photos larger than 15MB", () => {
    const file = buildFile(COVER_IMAGE_MAX_BYTES + 1, "image/jpeg");

    expect(validateEntryMediaFile(file)).toContain("15MB");
  });

  it("rejects videos larger than 100MB", () => {
    const file = buildFile(VIDEO_MAX_BYTES + 1, "video/webm");

    expect(validateEntryMediaFile(file)).toContain("100MB");
  });

  it("accepts valid photos", () => {
    const file = buildFile(1024, "image/png");

    expect(validateEntryMediaFile(file)).toBeNull();
  });

  it("accepts valid videos", () => {
    const file = buildFile(1024, "video/mp4");

    expect(validateEntryMediaFile(file)).toBeNull();
  });

  it("accepts MOV video files", () => {
    const file = buildFile(1024, "video/quicktime");

    expect(validateEntryMediaFile(file)).toBeNull();
  });
});

describe("resolveUploadFilePath", () => {
  afterEach(() => {
    delete process.env.MEDIA_UPLOAD_DIR;
  });

  it("returns null for URLs outside /uploads/", () => {
    expect(resolveUploadFilePath("/static/logo.png")).toBeNull();
    expect(resolveUploadFilePath("https://example.com/uploads/photo.jpg")).toBeNull();
  });

  it("joins the upload root with the URL's relative remainder", () => {
    process.env.MEDIA_UPLOAD_DIR = "/tmp/uploads-root";

    expect(resolveUploadFilePath("/uploads/trips/1/cover.jpg")).toBe(
      path.join("/tmp/uploads-root", "trips/1/cover.jpg"),
    );
  });
});

describe("getImageMimeTypeFromUrl", () => {
  it("maps known image extensions to mime types", () => {
    expect(getImageMimeTypeFromUrl("/uploads/trips/1/cover.jpg")).toBe(
      "image/jpeg",
    );
    expect(getImageMimeTypeFromUrl("/uploads/trips/1/cover.jpeg")).toBe(
      "image/jpeg",
    );
    expect(getImageMimeTypeFromUrl("/uploads/trips/1/cover.png")).toBe(
      "image/png",
    );
    expect(getImageMimeTypeFromUrl("/uploads/trips/1/cover.webp")).toBe(
      "image/webp",
    );
  });

  it("returns null for non-image or unknown extensions", () => {
    expect(getImageMimeTypeFromUrl("/uploads/trips/1/clip.mp4")).toBeNull();
    expect(getImageMimeTypeFromUrl("/uploads/trips/1/photo.heic")).toBeNull();
    expect(getImageMimeTypeFromUrl("/uploads/trips/1/no-extension")).toBeNull();
  });
});
