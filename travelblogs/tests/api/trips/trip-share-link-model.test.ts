import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const testDatabaseUrl = "file:./prisma/test-trip-share-link-model.db";

describe("TripShareLink model", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    execSync("npx prisma migrate deploy", {
      stdio: "ignore",
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl,
      },
    });
    const { PrismaClient } = await import("@prisma/client");
    const adapter = new PrismaBetterSqlite3({
      url: testDatabaseUrl.replace(/^file:/, ""),
    });
    prisma = new PrismaClient({ adapter });
  });

  afterAll(async () => {
    await prisma.tripShareLink.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.$disconnect();
  });

  it("creates a share link and enforces unique tripId", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Share Trip",
        startDate: new Date("2025-02-01"),
        endDate: new Date("2025-02-02"),
        ownerId: "creator",
      },
    });

    const shareLink = await prisma.tripShareLink.create({
      data: {
        tripId: trip.id,
        token: "token-one",
      },
    });

    expect(shareLink.tripId).toBe(trip.id);
    expect(shareLink.token).toBe("token-one");
    expect(shareLink.createdAt).toBeInstanceOf(Date);

    await expect(
      prisma.tripShareLink.create({
        data: {
          tripId: trip.id,
          token: "token-two",
        },
      })
    ).rejects.toThrow();
  });

  it("enforces unique token across trips", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Second Trip",
        startDate: new Date("2025-03-01"),
        endDate: new Date("2025-03-02"),
        ownerId: "creator",
      },
    });

    await expect(
      prisma.tripShareLink.create({
        data: {
          tripId: trip.id,
          token: "token-one",
        },
      })
    ).rejects.toThrow();
  });
});
