import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";
import { promises as fs } from "node:fs";
import StreamZip from "node-stream-zip";

import { EXPORT_SCHEMA_VERSION } from "../../../src/utils/trip-export";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabasePath = path.resolve(
  __dirname,
  "../../../prisma/test-trip-export.db",
);
const testDatabaseUrl = `file:${testDatabasePath}`;

describe("GET /api/trips/[id]/export", () => {
  let get: (
    request: Request,
    context: { params: { id: string } },
  ) => Promise<Response>;
  let prisma: PrismaClient;
  const uploadRoot = path.resolve(__dirname, "../../../tmp/uploads-test");

  const readZipEntries = async (buffer: Buffer) => {
    const tempRoot = path.resolve(__dirname, "../../../tmp");
    await fs.mkdir(tempRoot, { recursive: true });
    const tempDir = await fs.mkdtemp(path.join(tempRoot, "zip-test-"));
    const zipPath = path.join(tempDir, "export.zip");
    await fs.writeFile(zipPath, buffer);

    const zip = new StreamZip.async({ file: zipPath });
    const entries = await zip.entries();
    const entryNames = Object.keys(entries);
    const cleanup = async () => fs.rm(tempDir, { recursive: true, force: true });

    return { zip, entryNames, cleanup };
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.MEDIA_UPLOAD_DIR = uploadRoot;

    await fs.mkdir(path.dirname(testDatabasePath), { recursive: true });
    await fs.writeFile(testDatabasePath, "", { flag: "a" });

    execSync("npx prisma migrate deploy", {
      stdio: "ignore",
      env: {
        ...process.env,
        DATABASE_URL: testDatabaseUrl,
      },
    });

    const prismaModule = await import("@prisma/client");
    const adapter = new PrismaBetterSqlite3({ url: testDatabasePath });
    prisma = new prismaModule.PrismaClient({ adapter });

    const routeModule = await import(
      "../../../src/app/api/trips/[id]/export/route"
    );
    get = routeModule.GET;

    await fs.mkdir(path.join(uploadRoot, "trips"), { recursive: true });
  });

  beforeEach(async () => {
    getToken.mockReset();
    await prisma.entryTag.deleteMany();
    await prisma.entryMedia.deleteMany();
    await prisma.entry.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.user.deleteMany();
    await fs.rm(uploadRoot, { recursive: true, force: true });
    await fs.mkdir(path.join(uploadRoot, "trips"), { recursive: true });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    delete process.env.MEDIA_UPLOAD_DIR;
  });

  it("allows admins to export a trip and returns a ZIP", async () => {
    const admin = await prisma.user.create({
      data: {
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "administrator",
        passwordHash: "hash",
      },
    });

    const trip = await prisma.trip.create({
      data: {
        title: "Export Trip",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "creator",
      },
    });

    const tag = await prisma.tag.create({
      data: {
        tripId: trip.id,
        name: "Food",
        normalizedName: "food",
      },
    });

    const entry = await prisma.entry.create({
      data: {
        tripId: trip.id,
        title: "Entry",
        text: "Hello",
        createdAt: new Date("2025-05-02"),
        updatedAt: new Date("2025-05-02"),
        weatherCondition: "clear",
        weatherTemperature: 20,
        weatherIconCode: "1",
      },
    });

    await prisma.entryTag.create({
      data: {
        entryId: entry.id,
        tagId: tag.id,
      },
    });

    const coverUrl = "/uploads/trips/cover.jpg";
    const mediaUrl = "/uploads/trips/photo.jpg";
    await fs.writeFile(path.join(uploadRoot, "trips", "cover.jpg"), "cover");
    await fs.writeFile(path.join(uploadRoot, "trips", "photo.jpg"), "photo");

    await prisma.trip.update({
      where: { id: trip.id },
      data: { coverImageUrl: coverUrl },
    });

    await prisma.entryMedia.create({
      data: {
        entryId: entry.id,
        url: mediaUrl,
      },
    });

    getToken.mockResolvedValue({ sub: admin.id, role: "administrator" });

    const request = new Request(`http://localhost/api/trips/${trip.id}/export`, {
      method: "GET",
    });

    const response = await get(request, { params: { id: trip.id } });
    const buffer = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/zip");
    expect(response.headers.get("content-disposition")).toContain(".zip");

    const { zip, entryNames, cleanup } = await readZipEntries(buffer);
    expect(entryNames).toContain("meta.json");
    expect(entryNames).toContain("trip.json");
    expect(entryNames).toContain("entries.json");
    expect(entryNames).toContain("media/trips/cover.jpg");
    expect(entryNames).toContain("media/trips/photo.jpg");

    const meta = JSON.parse(
      (await zip.entryData("meta.json")).toString("utf-8"),
    ) as { schemaVersion: number; tripId: string; counts: { trip: number; entries: number; media: number } };
    expect(meta.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(meta.tripId).toBe(trip.id);
    expect(meta.counts.trip).toBe(1);
    expect(meta.counts.entries).toBe(1);
    expect(meta.counts.media).toBe(2);

    const tripPayload = JSON.parse(
      (await zip.entryData("trip.json")).toString("utf-8"),
    ) as { trip: { id: string; coverImageUrl: string | null } };
    expect(tripPayload.trip.id).toBe(trip.id);
    expect(tripPayload.trip.coverImageUrl).toBe(coverUrl);

    const entriesPayload = JSON.parse(
      (await zip.entryData("entries.json")).toString("utf-8"),
    ) as {
      entries: Array<{
        id: string;
        entryDate?: string | null;
        tags?: Array<{ id: string }>;
      }>;
    };
    expect(entriesPayload.entries[0]?.id).toBe(entry.id);
    expect(entriesPayload.entries[0]?.entryDate).toBe("2025-05-02T00:00:00.000Z");
    expect(entriesPayload.entries[0]?.tags?.[0]?.id).toBe(tag.id);

    await zip.close();
    await cleanup();
  });

  it("allows trip owners to export", async () => {
    const owner = await prisma.user.create({
      data: {
        id: "owner-1",
        email: "owner@example.com",
        name: "Owner",
        role: "creator",
        passwordHash: "hash",
      },
    });

    const trip = await prisma.trip.create({
      data: {
        title: "Owner Trip",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: owner.id,
      },
    });

    getToken.mockResolvedValue({ sub: owner.id, role: "creator" });

    const request = new Request(`http://localhost/api/trips/${trip.id}/export`, {
      method: "GET",
    });

    const response = await get(request, { params: { id: trip.id } });

    expect(response.status).toBe(200);
  });

  it("rejects non-admin non-owner", async () => {
    const viewer = await prisma.user.create({
      data: {
        id: "viewer-1",
        email: "viewer@example.com",
        name: "Viewer",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    const trip = await prisma.trip.create({
      data: {
        title: "Private Trip",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-05-10"),
        ownerId: "creator",
      },
    });

    getToken.mockResolvedValue({ sub: viewer.id, role: "viewer" });

    const request = new Request(`http://localhost/api/trips/${trip.id}/export`, {
      method: "GET",
    });

    const response = await get(request, { params: { id: trip.id } });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
