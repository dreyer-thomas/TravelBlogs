import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { backfillGpsData } from "../../src/utils/backfill-gps";

describe("backfillGpsData", () => {
  let prisma: PrismaClient;
  const testDatabaseUrl = "file:./prisma/test-backfill-gps.db";

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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should extract GPS from existing entry media without location", async () => {
    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        name: "Test User",
        role: "creator",
        passwordHash: "hash",
      },
    });

    const trip = await prisma.trip.create({
      data: {
        title: "Test Trip",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-01-10"),
        ownerId: user.id,
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry without GPS",
        text: "Test entry",
        latitude: null,
        longitude: null,
      },
    });

    const testImagePath = path.join(
      __dirname,
      "../fixtures/test-image-with-gps.jpg",
    );
    const uploadDir = path.join(process.cwd(), "public", "uploads", "trips");
    await fs.mkdir(uploadDir, { recursive: true });

    const testImageBuffer = await fs.readFile(testImagePath);
    const testImageName = "test-backfill-image.jpg";
    const testImageDest = path.join(uploadDir, testImageName);
    await fs.writeFile(testImageDest, testImageBuffer);

    await prisma.entryMedia.create({
      data: {
        entryId: entry.id,
        url: `/uploads/trips/${testImageName}`,
      },
    });

    await backfillGpsData(prisma);

    const updatedEntry = await prisma.entry.findUnique({
      where: { id: entry.id },
    });

    expect(updatedEntry?.latitude).not.toBeNull();
    expect(updatedEntry?.longitude).not.toBeNull();
    expect(updatedEntry?.latitude).toBeTypeOf("number");
    expect(updatedEntry?.longitude).toBeTypeOf("number");

    await fs.unlink(testImageDest).catch(() => {});
  });

  it("should skip entries that already have location", async () => {
    const user = await prisma.user.create({
      data: {
        email: "test2@example.com",
        name: "Test User 2",
        role: "creator",
        passwordHash: "hash",
      },
    });

    const trip = await prisma.trip.create({
      data: {
        title: "Test Trip 2",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-01-10"),
        ownerId: user.id,
      },
    });

    const existingLat = 48.8566;
    const existingLon = 2.3522;

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry with GPS",
        text: "Test entry",
        latitude: existingLat,
        longitude: existingLon,
      },
    });

    await backfillGpsData(prisma);

    const unchangedEntry = await prisma.entry.findUnique({
      where: { id: entry.id },
    });

    expect(unchangedEntry?.latitude).toBe(existingLat);
    expect(unchangedEntry?.longitude).toBe(existingLon);
  });

  it("should handle entries without media gracefully", async () => {
    const user = await prisma.user.create({
      data: {
        email: "test3@example.com",
        name: "Test User 3",
        role: "creator",
        passwordHash: "hash",
      },
    });

    const trip = await prisma.trip.create({
      data: {
        title: "Test Trip 3",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-01-10"),
        ownerId: user.id,
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry without media",
        text: "Test entry",
        latitude: null,
        longitude: null,
      },
    });

    await backfillGpsData(prisma);

    const unchangedEntry = await prisma.entry.findUnique({
      where: { id: entry.id },
    });

    expect(unchangedEntry?.latitude).toBeNull();
    expect(unchangedEntry?.longitude).toBeNull();
  });
});
