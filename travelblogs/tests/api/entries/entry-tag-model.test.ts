import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const testDatabaseUrl = "file:./prisma/test-entry-tag-model.db";

describe("Entry tag models", () => {
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
    await prisma.entryTag.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.trip.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("enforces unique tags per entry", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Tag Trip",
        startDate: new Date("2025-03-01"),
        endDate: new Date("2025-03-03"),
        ownerId: "creator",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Taggable Entry",
        text: "Tagged entry text.",
      },
    });

    const tag = await prisma.tag.create({
      data: {
        tripId: trip.id,
        name: "Paris",
        normalizedName: "paris",
      },
    });

    const entryTag = await prisma.entryTag.create({
      data: {
        entryId: entry.id,
        tagId: tag.id,
      },
    });

    expect(entryTag.entryId).toBe(entry.id);
    expect(entryTag.tagId).toBe(tag.id);

    await expect(
      prisma.entryTag.create({
        data: {
          entryId: entry.id,
          tagId: tag.id,
        },
      }),
    ).rejects.toThrow();
  });

  it("enforces unique tags per trip using normalized names", async () => {
    const trip = await prisma.trip.create({
      data: {
        title: "Normalization Trip",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-04-02"),
        ownerId: "creator",
      },
    });

    const tag = await prisma.tag.create({
      data: {
        tripId: trip.id,
        name: "ROME",
        normalizedName: "rome",
      },
    });

    expect(tag.normalizedName).toBe("rome");

    await expect(
      prisma.tag.create({
        data: {
          tripId: trip.id,
          name: "Rome",
          normalizedName: "rome",
        },
      }),
    ).rejects.toThrow();
  });
});
