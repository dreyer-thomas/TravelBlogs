import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const testDatabaseUrl = "file:./prisma/test-trip-model.db";

describe("Trip model", () => {
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
    await prisma.trip.deleteMany();
    await prisma.$disconnect();
  });

  it("creates a trip with required fields", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "New Trip",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-01-05"),
        ownerId: "creator",
      },
    });

    expect(trip.title).toBe("New Trip");
    expect(trip.ownerId).toBe("creator");
    expect(trip.coverImageUrl).toBeNull();
  });
});
