import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import exifr from "exifr";
import { compressImage } from "../../src/utils/compress-image";

const buildImage = async (
  width: number,
  height: number,
  options: { exif?: sharp.Exif; format?: "jpeg" | "png" } = {},
) => {
  const format = options.format ?? "jpeg";
  let pipeline = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 120, g: 80, b: 40 },
    },
  });

  if (options.exif) {
    pipeline = pipeline.withExif(options.exif);
  }

  if (format === "png") {
    return pipeline.png().toBuffer();
  }

  return pipeline.jpeg({ quality: 95 }).toBuffer();
};

const toExifRational = (value: number, denominator: number) => {
  return `${Math.round(value * denominator)}/${denominator}`;
};

const buildGpsExif = (latitude: number, longitude: number): sharp.Exif => {
  const latRef = latitude >= 0 ? "N" : "S";
  const lonRef = longitude >= 0 ? "E" : "W";
  const absLat = Math.abs(latitude);
  const absLon = Math.abs(longitude);

  const latDegrees = Math.floor(absLat);
  const latMinutesFloat = (absLat - latDegrees) * 60;
  const latMinutes = Math.floor(latMinutesFloat);
  const latSeconds = (latMinutesFloat - latMinutes) * 60;

  const lonDegrees = Math.floor(absLon);
  const lonMinutesFloat = (absLon - lonDegrees) * 60;
  const lonMinutes = Math.floor(lonMinutesFloat);
  const lonSeconds = (lonMinutesFloat - lonMinutes) * 60;

  return {
    IFD3: {
      GPSLatitudeRef: latRef,
      GPSLatitude: `${latDegrees}/1 ${latMinutes}/1 ${toExifRational(latSeconds, 100)}`,
      GPSLongitudeRef: lonRef,
      GPSLongitude: `${lonDegrees}/1 ${lonMinutes}/1 ${toExifRational(lonSeconds, 100)}`,
    },
  };
};

describe("compressImage", () => {
  it("compresses large images to fit within 1920px", async () => {
    const inputBuffer = await buildImage(2400, 1600);

    const result = await compressImage(inputBuffer);
    const metadata = await sharp(result.buffer).metadata();

    expect(result.wasCompressed).toBe(true);
    expect(metadata.width).toBe(1920);
    expect(metadata.height).toBe(1280);
    expect(metadata.format).toBe("jpeg");
  });

  it("skips compression for small images", async () => {
    const inputBuffer = await buildImage(800, 600);

    const result = await compressImage(inputBuffer);

    expect(result.wasCompressed).toBe(false);
    expect(Buffer.compare(result.buffer, inputBuffer)).toBe(0);
  });

  it("preserves aspect ratio for portrait images", async () => {
    const inputBuffer = await buildImage(1600, 2400);

    const result = await compressImage(inputBuffer);
    const metadata = await sharp(result.buffer).metadata();

    expect(result.wasCompressed).toBe(true);
    expect(metadata.width).toBe(1280);
    expect(metadata.height).toBe(1920);
  });

  it("outputs a smaller JPEG buffer when compressing", async () => {
    const inputBuffer = await buildImage(2400, 1600, { format: "png" });

    const result = await compressImage(inputBuffer);
    const metadata = await sharp(result.buffer).metadata();

    expect(result.wasCompressed).toBe(true);
    expect(metadata.format).toBe("jpeg");
    expect(result.buffer.length).toBeLessThan(inputBuffer.length);
  });

  it("preserves EXIF metadata during compression", async () => {
    const inputBuffer = await buildImage(2400, 1600, {
      exif: {
        IFD0: {
          Make: "TestCam",
          Model: "TestCam Pro",
        },
      },
    });

    const result = await compressImage(inputBuffer);
    const parsed = await exifr.parse(result.buffer).catch(() => null);

    expect(parsed?.Make).toBe("TestCam");
    expect(parsed?.Model).toBe("TestCam Pro");
  });

  it("preserves GPS metadata when present", async () => {
    const latitude = 37.7749;
    const longitude = -122.4194;
    const inputBuffer = await buildImage(2400, 1600, {
      exif: buildGpsExif(latitude, longitude),
    });

    const result = await compressImage(inputBuffer);
    const gps = await exifr.gps(result.buffer);

    expect(result.wasCompressed).toBe(true);
    expect(gps?.latitude).toBeCloseTo(latitude, 4);
    expect(gps?.longitude).toBeCloseTo(longitude, 4);
  });

  it("re-encodes HEIC inputs as JPEG even when below size threshold", async () => {
    const fixturePath = path.join(
      __dirname,
      "../fixtures/test-image.heic",
    );
    const inputBuffer = await fs.readFile(fixturePath);

    const result = await compressImage(inputBuffer, { forceJpeg: true });
    const metadata = await sharp(result.buffer).metadata();

    expect(result.wasCompressed).toBe(true);
    expect(metadata.format).toBe("jpeg");
  });
});
