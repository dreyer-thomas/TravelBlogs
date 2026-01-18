import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
import { promises as fs } from "node:fs";

import {
  COVER_IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
} from "../../../src/utils/media";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

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

const buildFile = (size: number, type: string, name = "cover") => {
  ensureFileConstructor();
  const content = new Uint8Array(size);
  return new File([content], name, { type });
};

describe("POST /api/media/upload", () => {
  const uploadRoot = path.join(
    process.cwd(),
    "tmp",
    "uploads-test",
  );
  let post: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    ensureFileConstructor();
    process.env.MEDIA_UPLOAD_DIR = uploadRoot;

    const routeModule = await import(
      "../../../src/app/api/media/upload/route"
    );
    post = routeModule.POST;
  });

  beforeEach(async () => {
    getToken.mockReset();
    await fs.rm(uploadRoot, { recursive: true, force: true });
  });

  afterAll(async () => {
    await fs.rm(uploadRoot, { recursive: true, force: true });
    delete process.env.MEDIA_UPLOAD_DIR;
  });

  it("stores a valid upload and returns the public URL", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const formData = new FormData();
    formData.append("file", buildFile(1024, "image/png"));

    const request = new Request("http://localhost/api/media/upload", {
      method: "POST",
      body: formData,
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.url).toMatch(/^\/uploads\/trips\//);
    expect(body.data.mediaType).toBe("image");

    const filename = body.data.url.split("/").pop();
    const storedPath = path.join(uploadRoot, "trips", filename ?? "");
    await expect(fs.stat(storedPath)).resolves.toBeDefined();
  });

  it("rejects non-image uploads", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const formData = new FormData();
    formData.append("file", buildFile(256, "text/plain"));

    const request = new Request("http://localhost/api/media/upload", {
      method: "POST",
      body: formData,
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects files larger than 15MB", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const formData = new FormData();
    formData.append(
      "file",
      buildFile(COVER_IMAGE_MAX_BYTES + 1, "image/png"),
    );

    const request = new Request("http://localhost/api/media/upload", {
      method: "POST",
      body: formData,
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects videos larger than 100MB", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const formData = new FormData();
    formData.append(
      "file",
      buildFile(VIDEO_MAX_BYTES + 1, "video/mp4", "video.mp4"),
    );

    const request = new Request("http://localhost/api/media/upload", {
      method: "POST",
      body: formData,
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toContain("100MB");
  });

  it("rejects unauthenticated uploads", async () => {
    getToken.mockResolvedValue(null);

    const formData = new FormData();
    formData.append("file", buildFile(512, "image/png"));

    const request = new Request("http://localhost/api/media/upload", {
      method: "POST",
      body: formData,
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects uploads from non-creator accounts", async () => {
    getToken.mockResolvedValue({ sub: "viewer" });

    const formData = new FormData();
    formData.append("file", buildFile(512, "image/png"));

    const request = new Request("http://localhost/api/media/upload", {
      method: "POST",
      body: formData,
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns per-file results when multiple files are uploaded", async () => {
    getToken.mockResolvedValue({ sub: "creator" });

    const formData = new FormData();
    formData.append("file", buildFile(1024, "image/png", "good.png"));
    formData.append("file", buildFile(256, "text/plain", "bad.txt"));

    const request = new Request("http://localhost/api/media/upload", {
      method: "POST",
      body: formData,
    });

    const response = await post(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.uploads).toHaveLength(1);
    expect(body.data.failures).toHaveLength(1);
    expect(body.data.uploads[0].fileName).toBe("good.png");
    expect(body.data.uploads[0].url).toMatch(/^\/uploads\/trips\//);
    expect(body.data.uploads[0].mediaType).toBe("image");
    expect(body.data.failures[0].fileName).toBe("bad.txt");
    expect(body.data.failures[0].message).toBe(
      "Cover image must be a JPG, PNG, WebP, MP4, WebM, or MOV file.",
    );

    const filename = body.data.uploads[0].url.split("/").pop();
    const storedPath = path.join(uploadRoot, "trips", filename ?? "");
    await expect(fs.stat(storedPath)).resolves.toBeDefined();
  });
});
