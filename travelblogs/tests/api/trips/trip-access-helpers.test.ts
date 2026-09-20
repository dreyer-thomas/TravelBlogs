import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const testDatabaseUrl = "file:./prisma/test-trip-access-helpers.db";

describe("trip access helpers", () => {
  let hasTripAccess: (tripId: string, userId: string) => Promise<boolean>;
  let canContributeToTrip: (tripId: string, userId: string) => Promise<boolean>;
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

    const prismaModule = await import("@prisma/client");
    const adapter = new PrismaBetterSqlite3({
      url: testDatabaseUrl.replace(/^file:/, ""),
    });
    prisma = new prismaModule.PrismaClient({ adapter });

    const accessModule = await import("../../../src/utils/trip-access");
    hasTripAccess = accessModule.hasTripAccess;
    canContributeToTrip = accessModule.canContributeToTrip;
  });

  beforeEach(async () => {
    await prisma.tripAccess.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const createOwnerWithTrip = async () => {
    const owner = await prisma.user.create({
      data: {
        email: "owner@example.com",
        name: "Owner",
        role: "creator",
        passwordHash: "hash",
      },
    });

    const trip = await prisma.trip.create({
      data: {
        title: "Shared Trip",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: owner.id,
      },
    });

    return { owner, trip };
  };

  const createCreator = () =>
    prisma.user.create({
      data: {
        email: "guest@example.com",
        name: "Guest Creator",
        role: "creator",
        passwordHash: "hash",
      },
    });

  it("grants a creator access to a trip they own", async () => {
    const { owner, trip } = await createOwnerWithTrip();

    await expect(hasTripAccess(trip.id, owner.id)).resolves.toBe(true);
    await expect(canContributeToTrip(trip.id, owner.id)).resolves.toBe(true);
  });

  it("grants a creator access to someone else's trip they were invited to", async () => {
    const { trip } = await createOwnerWithTrip();
    const guest = await createCreator();

    await prisma.tripAccess.create({
      data: {
        tripId: trip.id,
        userId: guest.id,
      },
    });

    await expect(hasTripAccess(trip.id, guest.id)).resolves.toBe(true);
  });

  it("lets an invited creator contribute once canContribute is granted", async () => {
    const { trip } = await createOwnerWithTrip();
    const guest = await createCreator();

    await prisma.tripAccess.create({
      data: {
        tripId: trip.id,
        userId: guest.id,
        canContribute: true,
      },
    });

    await expect(canContributeToTrip(trip.id, guest.id)).resolves.toBe(true);
  });

  it("keeps an invited creator read-only while canContribute is false", async () => {
    const { trip } = await createOwnerWithTrip();
    const guest = await createCreator();

    await prisma.tripAccess.create({
      data: {
        tripId: trip.id,
        userId: guest.id,
        canContribute: false,
      },
    });

    await expect(hasTripAccess(trip.id, guest.id)).resolves.toBe(true);
    await expect(canContributeToTrip(trip.id, guest.id)).resolves.toBe(false);
  });

  it("denies a creator who neither owns the trip nor was invited", async () => {
    const { trip } = await createOwnerWithTrip();
    const guest = await createCreator();

    await expect(hasTripAccess(trip.id, guest.id)).resolves.toBe(false);
    await expect(canContributeToTrip(trip.id, guest.id)).resolves.toBe(false);
  });

  it("denies an inactive creator even when invited as a contributor", async () => {
    const { trip } = await createOwnerWithTrip();
    const guest = await createCreator();

    await prisma.tripAccess.create({
      data: {
        tripId: trip.id,
        userId: guest.id,
        canContribute: true,
      },
    });

    await prisma.user.update({
      where: { id: guest.id },
      data: { isActive: false },
    });

    await expect(hasTripAccess(trip.id, guest.id)).resolves.toBe(false);
    await expect(canContributeToTrip(trip.id, guest.id)).resolves.toBe(false);
  });
});
