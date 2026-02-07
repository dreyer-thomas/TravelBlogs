import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";
import { PassThrough } from "node:stream";
import { promises as fs } from "node:fs";
import ZipStream from "zip-stream";
import packageJson from "../../../package.json";

const getToken = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const testDatabasePath = path.resolve(
  __dirname,
  "../../../prisma/test-trip-restore.db",
);
const testDatabaseUrl = `file:${testDatabasePath}`;

const buildZipBuffer = async (
  entries: Array<{ name: string; data: Buffer | string }>,
) =>
  new Promise<Buffer>((resolve, reject) => {
    const zip = new ZipStream({ forceZip64: true });
    const output = new PassThrough();
    const chunks: Buffer[] = [];

    output.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    output.on("error", reject);
    output.on("finish", () => resolve(Buffer.concat(chunks)));
    zip.on("error", reject);

    zip.pipe(output);

    const addEntry = (entry: { name: string; data: Buffer | string }) =>
      new Promise<void>((entryResolve, entryReject) => {
        const data =
          typeof entry.data === "string"
            ? Buffer.from(entry.data)
            : entry.data;
        zip.entry(data, { name: entry.name }, (error) => {
          if (error) {
            entryReject(error);
            return;
          }
          entryResolve();
        });
      });

    (async () => {
      for (const entry of entries) {
        await addEntry(entry);
      }
      zip.finalize();
    })().catch(reject);
  });

const buildRestoreZipWithPayload = async (payload: {
  meta: unknown;
  trip: unknown;
  entries: unknown;
  mediaEntries: Array<{ name: string; data: Buffer | string }>;
}) =>
  buildZipBuffer([
    { name: "meta.json", data: JSON.stringify(payload.meta, null, 2) },
    { name: "trip.json", data: JSON.stringify(payload.trip, null, 2) },
    { name: "entries.json", data: JSON.stringify(payload.entries, null, 2) },
    ...payload.mediaEntries,
  ]);

const buildRestoreZip = async () => {
  const meta = {
    schemaVersion: 1,
    tripId: "trip-restore-1",
    appVersion: packageJson.version,
    exportedAt: "2025-01-01T00:00:00.000Z",
    counts: { trip: 1, entries: 1, media: 3 },
  };

  const trip = {
    trip: {
      id: "trip-restore-1",
      title: "Restored Trip",
      description: null,
      startDate: "2025-01-01T00:00:00.000Z",
      endDate: "2025-01-02T00:00:00.000Z",
      coverImageUrl: "/uploads/trips/cover.jpg",
      ownerId: "creator",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    },
    tags: [
      {
        id: "tag-1",
        name: "Beach",
        normalizedName: "beach",
        createdAt: "2025-01-01T00:00:00.000Z",
      },
    ],
  };

  const entries = {
    entries: [
      {
        id: "entry-1",
        tripId: "trip-restore-1",
        title: "Entry",
        text: "Hello",
        entryDate: "2025-01-01T00:00:00.000Z",
        coverImageUrl: "/uploads/entries/cover.jpg",
        tags: [
          {
            id: "tag-1",
            name: "Beach",
            normalizedName: "beach",
            createdAt: "2025-01-01T00:00:00.000Z",
          },
        ],
        media: [
          {
            id: "media-1",
            url: "/uploads/entries/photo.jpg",
            createdAt: "2025-01-01T00:00:00.000Z",
          },
        ],
        latitude: null,
        longitude: null,
        locationName: null,
        weatherCondition: null,
        weatherTemperature: null,
        weatherIconCode: null,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      },
    ],
  };

  return buildRestoreZipWithPayload({
    meta,
    trip,
    entries,
    mediaEntries: [
      { name: "media/trips/cover.jpg", data: "cover" },
      { name: "media/entries/cover.jpg", data: "entry-cover" },
      { name: "media/entries/photo.jpg", data: "photo" },
    ],
  });
};

describe("POST /api/trips/restore", () => {
  let post: (request: Request) => Promise<Response>;
  let prisma: PrismaClient;
  const uploadRoot = path.resolve(__dirname, "../../../tmp/uploads-restore");

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
      "../../../src/app/api/trips/restore/route"
    );
    post = routeModule.POST;
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
    await fs.mkdir(uploadRoot, { recursive: true });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    delete process.env.MEDIA_UPLOAD_DIR;
  });

  it("restores a trip for admins", async () => {
    const admin = await prisma.user.create({
      data: {
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "administrator",
        passwordHash: "hash",
      },
    });

    const zipBuffer = await buildRestoreZip();
    const formData = new FormData();
    formData.set(
      "file",
      new File([zipBuffer], "trip.zip", { type: "application/zip" }),
    );

    getToken.mockResolvedValue({ sub: admin.id, role: "administrator" });

    const response = await post(
      new Request("http://localhost/api/trips/restore", {
        method: "POST",
        body: formData,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.summary.counts).toEqual({
      trip: 1,
      entries: 1,
      tags: 1,
      media: 3,
    });

    const trip = await prisma.trip.findUnique({
      where: { id: "trip-restore-1" },
    });
    const entries = await prisma.entry.findMany();
    const tags = await prisma.tag.findMany();
    const media = await prisma.entryMedia.findMany();

    expect(trip).not.toBeNull();
    expect(entries).toHaveLength(1);
    expect(tags).toHaveLength(1);
    expect(media).toHaveLength(1);

    await expect(
      fs.stat(path.join(uploadRoot, "trips", "cover.jpg")),
    ).resolves.toBeDefined();
    await expect(
      fs.stat(path.join(uploadRoot, "entries", "photo.jpg")),
    ).resolves.toBeDefined();
  });

  it("rejects invalid archives without writing data", async () => {
    const admin = await prisma.user.create({
      data: {
        id: "admin-2",
        email: "admin2@example.com",
        name: "Admin",
        role: "administrator",
        passwordHash: "hash",
      },
    });

    const zipBuffer = await buildZipBuffer([
      { name: "trip.json", data: "{}" },
    ]);
    const formData = new FormData();
    formData.set(
      "file",
      new File([zipBuffer], "trip.zip", { type: "application/zip" }),
    );

    getToken.mockResolvedValue({ sub: admin.id, role: "administrator" });

    const response = await post(
      new Request("http://localhost/api/trips/restore", {
        method: "POST",
        body: formData,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("MISSING_FILE");
    expect(await prisma.trip.count()).toBe(0);
    expect(await prisma.entry.count()).toBe(0);
  });

  it("rejects non-admins", async () => {
    const viewer = await prisma.user.create({
      data: {
        id: "viewer-1",
        email: "viewer@example.com",
        name: "Viewer",
        role: "viewer",
        passwordHash: "hash",
      },
    });

    getToken.mockResolvedValue({ sub: viewer.id, role: "viewer" });

    const response = await post(
      new Request("http://localhost/api/trips/restore", {
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns dry-run summary even with conflicts", async () => {
    const admin = await prisma.user.create({
      data: {
        id: "admin-3",
        email: "admin3@example.com",
        name: "Admin",
        role: "administrator",
        passwordHash: "hash",
      },
    });

    const meta = {
      schemaVersion: 1,
      tripId: "trip-restore-2",
      appVersion: packageJson.version,
      exportedAt: "2025-01-01T00:00:00.000Z",
      counts: { trip: 1, entries: 2, media: 2 },
    };

    const trip = {
      trip: {
        id: "trip-restore-2",
        title: "Restored Trip",
        description: null,
        startDate: "2025-01-01T00:00:00.000Z",
        endDate: "2025-01-02T00:00:00.000Z",
        coverImageUrl: "/uploads/trips/cover.jpg",
        ownerId: "creator",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      },
      tags: [
        {
          id: "tag-1",
          name: "Beach",
          normalizedName: "beach",
          createdAt: "2025-01-01T00:00:00.000Z",
        },
      ],
    };

    const entries = {
      entries: [
        {
          id: "entry-1",
          tripId: "trip-restore-2",
          title: "Entry",
          text: "Hello",
          entryDate: "2025-01-01T00:00:00.000Z",
          coverImageUrl: "/uploads/entries/cover.jpg",
          tags: trip.tags,
          media: [
            {
              id: "media-1",
              url: "/uploads/entries/photo.jpg",
              createdAt: "2025-01-01T00:00:00.000Z",
            },
          ],
          latitude: null,
          longitude: null,
          locationName: null,
          weatherCondition: null,
          weatherTemperature: null,
          weatherIconCode: null,
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-02T00:00:00.000Z",
        },
        {
          id: "entry-1",
          tripId: "trip-restore-2",
          title: "Entry Duplicate",
          text: "Hello again",
          entryDate: "2025-01-01T00:00:00.000Z",
          coverImageUrl: null,
          tags: [],
          media: [],
          latitude: null,
          longitude: null,
          locationName: null,
          weatherCondition: null,
          weatherTemperature: null,
          weatherIconCode: null,
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-02T00:00:00.000Z",
        },
      ],
    };

    const zipBuffer = await buildRestoreZipWithPayload({
      meta,
      trip,
      entries,
      mediaEntries: [
        { name: "media/trips/cover.jpg", data: "cover" },
        { name: "media/entries/cover.jpg", data: "entry-cover" },
        { name: "media/entries/photo.jpg", data: "photo" },
      ],
    });

    const formData = new FormData();
    formData.set(
      "file",
      new File([zipBuffer], "trip.zip", { type: "application/zip" }),
    );
    formData.set("dryRun", "true");

    getToken.mockResolvedValue({ sub: admin.id, role: "administrator" });

    const response = await post(
      new Request("http://localhost/api/trips/restore", {
        method: "POST",
        body: formData,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.summary.tripId).toBe("trip-restore-2");
    expect(body.data.warnings).toContain("Duplicate entry IDs detected.");
  });

  it("rejects unreferenced media files", async () => {
    const admin = await prisma.user.create({
      data: {
        id: "admin-4",
        email: "admin4@example.com",
        name: "Admin",
        role: "administrator",
        passwordHash: "hash",
      },
    });

    const zipBuffer = await buildRestoreZipWithPayload({
      meta: {
        schemaVersion: 1,
        tripId: "trip-restore-3",
        appVersion: packageJson.version,
        exportedAt: "2025-01-01T00:00:00.000Z",
        counts: { trip: 1, entries: 1, media: 2 },
      },
      trip: {
        trip: {
          id: "trip-restore-3",
          title: "Restored Trip",
          description: null,
          startDate: "2025-01-01T00:00:00.000Z",
          endDate: "2025-01-02T00:00:00.000Z",
          coverImageUrl: "/uploads/trips/cover.jpg",
          ownerId: "creator",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-02T00:00:00.000Z",
        },
        tags: [],
      },
      entries: {
        entries: [
          {
            id: "entry-1",
            tripId: "trip-restore-3",
            title: "Entry",
            text: "Hello",
            entryDate: "2025-01-01T00:00:00.000Z",
            coverImageUrl: null,
            tags: [],
            media: [],
            latitude: null,
            longitude: null,
            locationName: null,
            weatherCondition: null,
            weatherTemperature: null,
            weatherIconCode: null,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-02T00:00:00.000Z",
          },
        ],
      },
      mediaEntries: [
        { name: "media/trips/cover.jpg", data: "cover" },
        { name: "media/extra/unused.jpg", data: "extra" },
      ],
    });

    const formData = new FormData();
    formData.set(
      "file",
      new File([zipBuffer], "trip.zip", { type: "application/zip" }),
    );

    getToken.mockResolvedValue({ sub: admin.id, role: "administrator" });

    const response = await post(
      new Request("http://localhost/api/trips/restore", {
        method: "POST",
        body: formData,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("UNREFERENCED_MEDIA");
  });

  it("rejects incompatible app versions", async () => {
    const admin = await prisma.user.create({
      data: {
        id: "admin-5",
        email: "admin5@example.com",
        name: "Admin",
        role: "administrator",
        passwordHash: "hash",
      },
    });

    const zipBuffer = await buildRestoreZipWithPayload({
      meta: {
        schemaVersion: 1,
        tripId: "trip-restore-4",
        appVersion: "99.0.0",
        exportedAt: "2025-01-01T00:00:00.000Z",
        counts: { trip: 1, entries: 1, media: 0 },
      },
      trip: {
        trip: {
          id: "trip-restore-4",
          title: "Restored Trip",
          description: null,
          startDate: "2025-01-01T00:00:00.000Z",
          endDate: "2025-01-02T00:00:00.000Z",
          coverImageUrl: null,
          ownerId: "creator",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-02T00:00:00.000Z",
        },
        tags: [],
      },
      entries: {
        entries: [
          {
            id: "entry-1",
            tripId: "trip-restore-4",
            title: "Entry",
            text: "Hello",
            entryDate: "2025-01-01T00:00:00.000Z",
            coverImageUrl: null,
            tags: [],
            media: [],
            latitude: null,
            longitude: null,
            locationName: null,
            weatherCondition: null,
            weatherTemperature: null,
            weatherIconCode: null,
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-02T00:00:00.000Z",
          },
        ],
      },
      mediaEntries: [],
    });

    const formData = new FormData();
    formData.set(
      "file",
      new File([zipBuffer], "trip.zip", { type: "application/zip" }),
    );

    getToken.mockResolvedValue({ sub: admin.id, role: "administrator" });

    const response = await post(
      new Request("http://localhost/api/trips/restore", {
        method: "POST",
        body: formData,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("UNSUPPORTED_APP_VERSION");
  });
});
