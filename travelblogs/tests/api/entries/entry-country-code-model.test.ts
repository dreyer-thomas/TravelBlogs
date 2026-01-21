import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const testDatabaseUrl = "file:./prisma/test-entry-country-code-model.db";

describe("Entry countryCode model", () => {
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
    await prisma.entry.deleteMany();
    await prisma.trip.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores countryCode for entries", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Country Code Trip",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-02"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry with country code",
        text: "Entry text",
        countryCode: "US",
      },
    });

    expect(entry.countryCode).toBe("US");
  });

  it("allows entries without countryCode", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Nullable Country Code Trip",
        startDate: new Date("2025-05-03"),
        endDate: new Date("2025-05-04"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry without country code",
        text: "Entry text",
      },
    });

    const storedEntry = await prisma.entry.findUnique({
      where: { id: entry.id },
    });

    expect(storedEntry?.countryCode).toBeNull();
  });
});
