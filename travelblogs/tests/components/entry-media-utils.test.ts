// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { uploadEntryMediaBatch } from "../../src/utils/entry-media";

describe("uploadEntryMediaBatch", () => {
  it("returns uploads and failures with per-file progress", async () => {
    const files = [
      new File(["ok"], "good.jpg", { type: "image/jpeg" }),
      new File(["bad"], "bad.jpg", { type: "image/jpeg" }),
    ];
    const onFileProgress = vi.fn();
    const uploadFn = vi.fn(async (file: File, options) => {
      options?.onProgress?.(45);
      if (file.name === "bad.jpg") {
        throw new Error("Nope");
      }
      return `/uploads/${file.name}`;
    });

    const result = await uploadEntryMediaBatch(files, {
      uploadFn,
      onFileProgress,
      getFileId: (file) => file.name,
    });

    expect(uploadFn).toHaveBeenCalledTimes(2);
    expect(onFileProgress).toHaveBeenCalledWith(files[0], 45);
    expect(onFileProgress).toHaveBeenCalledWith(files[1], 45);
    expect(result.uploads).toEqual([
      { fileId: "good.jpg", fileName: "good.jpg", url: "/uploads/good.jpg" },
    ]);
    expect(result.failures).toEqual([
      { fileId: "bad.jpg", fileName: "bad.jpg", message: "Nope" },
    ]);
  });

  it("supports parallel strategy", async () => {
    const files = [
      new File(["first"], "first.jpg", { type: "image/jpeg" }),
      new File(["second"], "second.jpg", { type: "image/jpeg" }),
    ];
    const uploadFn = vi.fn(async (file: File) => `/uploads/${file.name}`);

    const result = await uploadEntryMediaBatch(files, {
      uploadFn,
      strategy: "parallel",
      getFileId: (file) => file.name,
    });

    expect(uploadFn).toHaveBeenCalledTimes(2);
    expect(result.failures).toEqual([]);
    expect(result.uploads).toEqual([
      { fileId: "first.jpg", fileName: "first.jpg", url: "/uploads/first.jpg" },
      {
        fileId: "second.jpg",
        fileName: "second.jpg",
        url: "/uploads/second.jpg",
      },
    ]);
  });
});
