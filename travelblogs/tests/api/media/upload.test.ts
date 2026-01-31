import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

describe("POST /api/media/upload", () => {
  let post: (request: Request) => Promise<Response>;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "trips");

  const buildImageBuffer = async (
    width: number,
    height: number,
    format: "jpeg" | "png" = "jpeg",
  ) => {
    const pipeline = sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 50, g: 60, b: 70 },
      },
    });
    if (format === "png") {
      return pipeline.png().toBuffer();
    }
    return pipeline.jpeg({ quality: 95 }).toBuffer();
  };

  beforeAll(async () => {
    const routeModule = await import("../../../src/app/api/media/upload/route");
    post = routeModule.POST;
  });

  beforeEach(() => {
    getToken.mockReset();
    getToken.mockResolvedValue({ sub: "creator", role: "creator" });
  });

  afterAll(async () => {
    try {
      const files = await fs.readdir(uploadDir);
      await Promise.all(
        files.map((file) => fs.unlink(path.join(uploadDir, file))),
      );
    } catch {
      // Directory may not exist
    }
  });

  it("extracts GPS coordinates from photo with EXIF metadata", async () => {
    const testImagePath = path.join(
      __dirname,
      "../../fixtures/test-image-with-gps.jpg",
    );
    const buffer = await fs.readFile(testImagePath);
    const file = new File([buffer], "photo-with-gps.jpg", {
      type: "image/jpeg",
    });

    const formData = new FormData();
    formData.append("file", file);

    const request = new Request("http://localhost:3000/api/media/upload", {
      method: "POST",
      body: formData,
    });

    const response = await post(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.error).toBeNull();
    expect(json.data.url).toBeDefined();
    expect(json.data.mediaType).toBe("image");
    expect(json.data.location).toBeDefined();
    expect(json.data.location.latitude).toBeTypeOf("number");
    expect(json.data.location.longitude).toBeTypeOf("number");
    expect(json.data.location.latitude).toBeGreaterThan(-90);
    expect(json.data.location.latitude).toBeLessThan(90);
    expect(json.data.location.longitude).toBeGreaterThan(-180);
    expect(json.data.location.longitude).toBeLessThan(180);
  });

  it("returns null location for photo without GPS metadata", async () => {
    const testImagePath = path.join(
      __dirname,
      "../../fixtures/test-image-no-gps.jpg",
    );
    const buffer = await fs.readFile(testImagePath);
    const file = new File([buffer], "photo-no-gps.jpg", {
      type: "image/jpeg",
    });

    const formData = new FormData();
    formData.append("file", file);

    const request = new Request("http://localhost:3000/api/media/upload", {
      method: "POST",
      body: formData,
    });

    const response = await post(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.error).toBeNull();
    expect(json.data.url).toBeDefined();
    expect(json.data.mediaType).toBe("image");
    expect(json.data.location).toBeNull();
  });

  it("compresses large images before saving", async () => {
    const buffer = await buildImageBuffer(2400, 1600);
    const file = new File([buffer], "large-photo.jpg", {
      type: "image/jpeg",
    });

    const formData = new FormData();
    formData.append("file", file);

    const request = new Request("http://localhost:3000/api/media/upload", {
      method: "POST",
      body: formData,
    });

    const response = await post(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.error).toBeNull();

    const filename = json.data.url.split("/").pop();
    const storedPath = path.join(uploadDir, filename ?? "");
    const storedBuffer = await fs.readFile(storedPath);
    const metadata = await sharp(storedBuffer).metadata();

    expect(metadata.width).toBe(1920);
    expect(metadata.height).toBe(1280);
    expect(storedBuffer.length).toBeLessThan(buffer.length);
  });

  it("skips compression for small images", async () => {
    const buffer = await buildImageBuffer(800, 600, "png");
    const file = new File([buffer], "small-photo.png", {
      type: "image/png",
    });

    const formData = new FormData();
    formData.append("file", file);

    const request = new Request("http://localhost:3000/api/media/upload", {
      method: "POST",
      body: formData,
    });

    const response = await post(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.error).toBeNull();

    const filename = json.data.url.split("/").pop();
    const storedPath = path.join(uploadDir, filename ?? "");
    const storedBuffer = await fs.readFile(storedPath);
    const metadata = await sharp(storedBuffer).metadata();

    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(600);
    expect(metadata.format).toBe("png");
  });

  it("accepts video uploads without GPS extraction", async () => {
    const file = new File([new Uint8Array(1024)], "clip.mp4", {
      type: "video/mp4",
    });

    const formData = new FormData();
    formData.append("file", file);

    const request = new Request("http://localhost:3000/api/media/upload", {
      method: "POST",
      body: formData,
    });

    const response = await post(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.error).toBeNull();
    expect(json.data.url).toBeDefined();
    expect(json.data.mediaType).toBe("video");
    expect(json.data.location).toBeNull();
  });

  it("handles batch upload with mixed GPS metadata", async () => {
    const testImageWithGps = path.join(
      __dirname,
      "../../fixtures/test-image-with-gps.jpg",
    );
    const testImageNoGps = path.join(
      __dirname,
      "../../fixtures/test-image-no-gps.jpg",
    );

    const bufferWithGps = await fs.readFile(testImageWithGps);
    const bufferNoGps = await fs.readFile(testImageNoGps);

    const file1 = new File([bufferWithGps], "photo1.jpg", {
      type: "image/jpeg",
    });
    const file2 = new File([bufferNoGps], "photo2.jpg", {
      type: "image/jpeg",
    });

    const formData = new FormData();
    formData.append("file", file1);
    formData.append("file", file2);

    const request = new Request("http://localhost:3000/api/media/upload", {
      method: "POST",
      body: formData,
    });

    const response = await post(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.error).toBeNull();
    expect(json.data.uploads).toHaveLength(2);
    expect(json.data.uploads[0].location).toBeDefined();
    expect(json.data.uploads[1].location).toBeNull();
    expect(json.data.uploads[0].mediaType).toBe("image");
    expect(json.data.uploads[1].mediaType).toBe("image");
  });
});
