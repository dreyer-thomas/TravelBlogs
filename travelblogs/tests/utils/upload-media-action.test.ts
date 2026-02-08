import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
import { promises as fs } from "node:fs";

const getServerSession = vi.hoisted(() => vi.fn());
const ensureActiveAccount = vi.hoisted(() => vi.fn());
const isAdminOrCreator = vi.hoisted(() => vi.fn());
const extractGpsFromImage = vi.hoisted(() => vi.fn());
const compressImage = vi.hoisted(() => vi.fn());

vi.mock("next-auth", () => ({
  getServerSession,
}));

vi.mock("../../src/utils/roles", () => ({
  ensureActiveAccount,
  isAdminOrCreator,
}));

vi.mock("../../src/utils/entry-location", () => ({
  extractGpsFromImage,
}));

vi.mock("../../src/utils/compress-image", () => ({
  compressImage,
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

const buildFile = (size: number, type: string, name = "upload") => {
  ensureFileConstructor();
  const content = new Uint8Array(size);
  return new File([content], name, { type });
};

describe("uploadMediaAction", () => {
  const uploadRoot = path.join(process.cwd(), "tmp", "uploads-action-test");

  beforeAll(() => {
    ensureFileConstructor();
    process.env.MEDIA_UPLOAD_DIR = uploadRoot;
  });

  beforeEach(async () => {
    getServerSession.mockReset();
    ensureActiveAccount.mockReset();
    isAdminOrCreator.mockReset();
    extractGpsFromImage.mockReset();
    compressImage.mockReset();
    await fs.rm(uploadRoot, { recursive: true, force: true });

    getServerSession.mockResolvedValue({ user: { id: "creator", role: "creator" } });
    ensureActiveAccount.mockResolvedValue(true);
    isAdminOrCreator.mockReturnValue(true);
    extractGpsFromImage.mockResolvedValue(null);
  });

  afterAll(async () => {
    await fs.rm(uploadRoot, { recursive: true, force: true });
    delete process.env.MEDIA_UPLOAD_DIR;
  });

  it("converts HEIC uploads to JPG and returns a .jpg URL", async () => {
    compressImage.mockResolvedValue({
      buffer: Buffer.from("jpeg-buffer"),
      wasCompressed: true,
    });

    const { uploadMediaAction } = await import(
      "../../src/actions/upload-media"
    );

    const formData = new FormData();
    formData.append("file", buildFile(512, "image/heic", "photo.heic"));

    const result = await uploadMediaAction(formData);

    expect(result.error).toBeNull();
    expect(result.data?.url).toMatch(/\.jpg$/);

    const filename = result.data?.url.split("/").pop();
    const storedPath = path.join(uploadRoot, "trips", filename ?? "");
    await expect(fs.stat(storedPath)).resolves.toBeDefined();
  });

  it("returns HEIC_UNSUPPORTED when conversion fails and writes no file", async () => {
    compressImage.mockRejectedValue(new Error("HEIC decode failed"));

    const { uploadMediaAction } = await import(
      "../../src/actions/upload-media"
    );

    const formData = new FormData();
    formData.append("file", buildFile(512, "image/heic", "photo.heic"));

    const result = await uploadMediaAction(formData);

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe("HEIC_UNSUPPORTED");

    const tripsDir = path.join(uploadRoot, "trips");
    let files: string[] = [];
    try {
      files = await fs.readdir(tripsDir);
    } catch {
      files = [];
    }
    expect(files).toHaveLength(0);
  });
});
