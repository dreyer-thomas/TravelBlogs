import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const testDatabaseUrl = "file:./prisma/test-trip-access-model.db";

describe("TripAccess model", () => {
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

  beforeEach(async () => {
    await prisma.tripAccess.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a trip access entry and enforces unique trip+user", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Viewer Trip",
        startDate: new Date("2025-02-01"),
        endDate: new Date("2025-02-02"),
        ownerId: "creator",
      },
    });

    const user = await prisma.user.create({
      data: {
        email: "viewer@example.com",
        name: "Viewer",
        role: "viewer",
        passwordHash: "hashed",
      },
    });

    const access = await prisma.tripAccess.create({
      data: {
        tripId: trip.id,
        userId: user.id,
      },
    });

    expect(access.tripId).toBe(trip.id);
    expect(access.userId).toBe(user.id);
    expect(access.canContribute).toBe(false);
    expect(access.createdAt).toBeInstanceOf(Date);

    await expect(
      prisma.tripAccess.create({
        data: {
          tripId: trip.id,
          userId: user.id,
        },
      }),
    ).rejects.toThrow();
  });
});
