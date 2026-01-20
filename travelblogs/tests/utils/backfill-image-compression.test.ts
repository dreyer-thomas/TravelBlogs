import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const uploadDir = path.join(process.cwd(), "public", "uploads", "trips");

const createUserTripEntry = async (prisma: PrismaClient) => {
  const user = await prisma.user.create({
    data: {
      email: `user-${Date.now()}@example.com`,
      name: "Compression Tester",
      role: "creator",
      passwordHash: "hash",
    },
  });

  const trip = await prisma.trip.create({
    data: {
      title: "Compression Trip",
      startDate: new Date("2025-02-01"),
      endDate: new Date("2025-02-10"),
      ownerId: user.id,
    },
  });

  const entry = await prisma.entry.create({
    data: {
      tripId: trip.id,
      title: "Compression Entry",
      text: "Compression test entry",
    },
  });

  return { entry };
};

const createImageBuffer = async (width: number, height: number) => {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 20, g: 40, b: 60 },
    },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
};

describe("backfillImageCompression", () => {
  let prisma: PrismaClient;
  const testDatabaseUrl = "file:./prisma/test-backfill-image-compression.db";

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    execSync("npx prisma migrate deploy", {
      stdio: "ignore",
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl,
      },
    });

    const adapter = new PrismaBetterSqlite3({
      url: testDatabaseUrl.replace(/^file:/, ""),
    });
    prisma = new PrismaClient({ adapter });
  });

  beforeEach(async () => {
    await prisma.entryMedia.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.user.deleteMany();
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.mkdir(uploadDir, { recursive: true });
    vi.resetModules();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("compresses large images and overwrites the file", async () => {
    const { entry } = await createUserTripEntry(prisma);
    const fileName = "large-photo.jpg";
    const filePath = path.join(uploadDir, fileName);
    const inputBuffer = await createImageBuffer(2400, 1600);

    await fs.writeFile(filePath, inputBuffer);
    await prisma.entryMedia.create({
      data: {
        entryId: entry.id,
        url: `/uploads/trips/${fileName}`,
      },
    });

    const { backfillImageCompression } = await import(
      "../../src/utils/backfill-image-compression"
    );

    await backfillImageCompression(prisma);

    const outputBuffer = await fs.readFile(filePath);
    const metadata = await sharp(outputBuffer).metadata();

    expect(metadata.width).toBe(1920);
    expect(metadata.height).toBe(1280);
    expect(outputBuffer.length).toBeLessThan(inputBuffer.length);
  });

  it("skips small images without rewriting", async () => {
    const { entry } = await createUserTripEntry(prisma);
    const fileName = "small-photo.jpg";
    const filePath = path.join(uploadDir, fileName);
    const inputBuffer = await createImageBuffer(800, 600);

    await fs.writeFile(filePath, inputBuffer);
    await prisma.entryMedia.create({
      data: {
        entryId: entry.id,
        url: `/uploads/trips/${fileName}`,
      },
    });

    const { backfillImageCompression } = await import(
      "../../src/utils/backfill-image-compression"
    );

    await backfillImageCompression(prisma);

    const outputBuffer = await fs.readFile(filePath);
    expect(Buffer.compare(outputBuffer, inputBuffer)).toBe(0);
  });

  it("logs progress and handles missing files gracefully", async () => {
    const { entry } = await createUserTripEntry(prisma);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await prisma.entryMedia.create({
      data: {
        entryId: entry.id,
        url: "/uploads/trips/missing-photo.jpg",
      },
    });

    for (let index = 0; index < 11; index += 1) {
      const fileName = `progress-${index}.jpg`;
      const filePath = path.join(uploadDir, fileName);
      const buffer = await createImageBuffer(2400, 1600);
      await fs.writeFile(filePath, buffer);
      await prisma.entryMedia.create({
        data: {
          entryId: entry.id,
          url: `/uploads/trips/${fileName}`,
        },
      });
    }

    const { backfillImageCompression } = await import(
      "../../src/utils/backfill-image-compression"
    );

    await backfillImageCompression(prisma);

    expect(warnSpy).toHaveBeenCalled();
    expect(logSpy.mock.calls.some((call) => call[0]?.includes("Progress"))).toBe(
      true,
    );

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("runs only once per process", async () => {
    const { entry } = await createUserTripEntry(prisma);
    const fileName = "once-photo.jpg";
    const filePath = path.join(uploadDir, fileName);
    const inputBuffer = await createImageBuffer(2400, 1600);

    await fs.writeFile(filePath, inputBuffer);
    await prisma.entryMedia.create({
      data: {
        entryId: entry.id,
        url: `/uploads/trips/${fileName}`,
      },
    });

    const { backfillImageCompression } = await import(
      "../../src/utils/backfill-image-compression"
    );

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await backfillImageCompression(prisma);
    await backfillImageCompression(prisma);

    const startLogs = logSpy.mock.calls.filter((call) =>
      String(call[0]).includes("Starting image compression backfill"),
    );
    expect(startLogs).toHaveLength(1);

    logSpy.mockRestore();
  });
});
