import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createWriteStream, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import StreamZip from "node-stream-zip";

import { prisma } from "../../../../utils/db";
import { ensureActiveAccount, isAdminRole } from "../../../../utils/roles";
import { resolveUploadRoot } from "../../../../utils/trip-export";
import {
  normalizeMediaPath,
  validateRestoreArchive,
} from "../../../../utils/trip-restore";

export const runtime = "nodejs";

const RESTORE_FILE_FIELD_NAME = "file";
const REQUIRED_ZIP_FILES = ["meta.json", "trip.json", "entries.json"];

const jsonError = (status: number, code: string, message: string) =>
  NextResponse.json(
    {
      data: null,
      error: { code, message },
    },
    { status },
  );

const getUser = async (request: NextRequest) => {
  try {
    const token = await getToken({ req: request });
    if (!token?.sub) {
      return null;
    }
    return {
      id: token.sub,
      role: typeof token.role === "string" ? token.role : null,
    };
  } catch {
    return null;
  }
};

const mapUploadUrlToRelativePath = (url: string) => {
  if (!url.startsWith("/uploads/")) {
    return null;
  }
  return url.replace(/^\/uploads\//, "");
};

type StreamZipAsync = {
  entryData: (name: string) => Promise<Buffer>;
  entries: () => Promise<Record<string, unknown>>;
  stream: (
    entryName: string,
    callback: (error: Error | null, stream?: NodeJS.ReadableStream) => void,
  ) => void;
  close: () => Promise<void>;
};

const loadZipJson = async (zip: StreamZipAsync, name: string) => {
  const data = await zip.entryData(name);
  return JSON.parse(data.toString("utf-8")) as unknown;
};

const streamZipEntryToFile = async (
  zip: StreamZipAsync,
  entryName: string,
  destination: string,
) => {
  const stream = await new Promise<NodeJS.ReadableStream>((resolve, reject) => {
    zip.stream(entryName, (error, zipStream) => {
      if (error || !zipStream) {
        reject(error ?? new Error("Unable to read zip entry."));
        return;
      }
      resolve(zipStream);
    });
  });
  await pipeline(stream, createWriteStream(destination));
};

const writeZipEntryToFile = async (
  zip: StreamZipAsync,
  entryName: string,
  destination: string,
) => {
  if (process.env.NODE_ENV === "test") {
    const data = await zip.entryData(entryName);
    await fs.writeFile(destination, data);
    return;
  }
  await streamZipEntryToFile(zip, entryName, destination);
};

const toDate = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const POST = async (request: NextRequest) => {
  const user = await getUser(request);
  if (!user) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required.");
  }
  if (!isAdminRole(user.role)) {
    return jsonError(403, "FORBIDDEN", "Admin access required.");
  }
  const isActive = await ensureActiveAccount(user.id);
  if (!isActive) {
    return jsonError(403, "FORBIDDEN", "Account is inactive.");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError(400, "INVALID_FORM_DATA", "Invalid form submission.");
  }

  const file = formData.get(RESTORE_FILE_FIELD_NAME);
  if (!(file instanceof File)) {
    return jsonError(400, "VALIDATION_ERROR", "Restore ZIP file is required.");
  }
  const dryRun =
    typeof formData.get("dryRun") === "string" &&
    formData.get("dryRun") === "true";

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "trip-restore-"));
  const zipPath = path.join(tempDir, "restore.zip");

  try {
    const stream = Readable.fromWeb(file.stream() as ReadableStream);
    await pipeline(stream, createWriteStream(zipPath));
  } catch (error) {
    await fs.rm(tempDir, { recursive: true, force: true });
    console.error("Failed to write restore zip", error);
    return jsonError(400, "INVALID_ZIP", "Unable to read restore archive.");
  }

  const zip = new StreamZip.async({ file: zipPath });

  try {
    const entriesMap = await zip.entries();
    const entryNames = Object.keys(entriesMap);

    for (const required of REQUIRED_ZIP_FILES) {
      if (!entryNames.includes(required)) {
        return jsonError(
          400,
          "MISSING_FILE",
          `Missing required file: ${required}.`,
        );
      }
    }

    let meta: unknown;
    let tripPayload: unknown;
    let entriesPayload: unknown;
    try {
      meta = await loadZipJson(zip, "meta.json");
      tripPayload = await loadZipJson(zip, "trip.json");
      entriesPayload = await loadZipJson(zip, "entries.json");
    } catch (error) {
      console.error("Failed to parse restore metadata", error);
      return jsonError(400, "INVALID_JSON", "Restore archive is invalid.");
    }

    const validation = validateRestoreArchive({
      entries: entryNames,
      files: {
        meta,
        trip: tripPayload,
        entries: entriesPayload,
      },
    });

    if (validation.error) {
      return jsonError(400, validation.error.code, validation.error.message);
    }

    const conflictMessages = [
      validation.summary.conflicts.entries.length
        ? "Duplicate entry IDs detected."
        : null,
      validation.summary.conflicts.tags.length
        ? "Duplicate tag IDs detected."
        : null,
      validation.summary.conflicts.media.length
        ? "Duplicate media IDs detected."
        : null,
      validation.summary.conflicts.mediaUrls.length
        ? "Duplicate media URLs detected."
        : null,
    ].filter(Boolean) as string[];

    const expectedMedia = new Set<string>();
    const invalidMediaUrls: string[] = [];
    const addMediaUrl = (url?: string | null) => {
      if (!url) {
        return;
      }
      const relative = mapUploadUrlToRelativePath(url);
      if (relative) {
        const normalized = normalizeMediaPath(relative);
        if (!normalized) {
          invalidMediaUrls.push(url);
          return;
        }
        expectedMedia.add(normalized);
      }
    };

    addMediaUrl(validation.data.trip.coverImageUrl ?? null);
    validation.data.entries.forEach((entry) => {
      addMediaUrl(entry.coverImageUrl ?? null);
      entry.media.forEach((media) => addMediaUrl(media.url));
    });

    if (invalidMediaUrls.length > 0) {
      return jsonError(
        400,
        "INVALID_MEDIA_PATH",
        "Export contains invalid media paths.",
      );
    }

    const unexpectedMedia = validation.data.mediaPaths.filter(
      (mediaPath) => !expectedMedia.has(mediaPath),
    );

    for (const relative of expectedMedia) {
      if (!validation.data.mediaPaths.includes(relative)) {
        return jsonError(
          400,
          "MISSING_MEDIA",
          `Missing media file for ${relative}.`,
        );
      }
    }

    if (dryRun) {
      return NextResponse.json(
        {
          data: {
            summary: validation.summary,
            warnings: [
              ...conflictMessages,
              ...(unexpectedMedia.length > 0
                ? ["Export contains unreferenced media files."]
                : []),
            ],
          },
          error: null,
        },
        { status: 200 },
      );
    }

    if (conflictMessages.length > 0) {
      return jsonError(409, "CONFLICT", conflictMessages.join(" "));
    }

    if (unexpectedMedia.length > 0) {
      return jsonError(
        400,
        "UNREFERENCED_MEDIA",
        "Export contains media files not referenced by trip data.",
      );
    }

    const existingTrip = await prisma.trip.findUnique({
      where: { id: validation.data.trip.id },
      select: { id: true },
    });
    if (existingTrip) {
      return jsonError(409, "CONFLICT", "Trip ID already exists.");
    }

    const entryIds = validation.data.entries.map((entry) => entry.id);
    const tagIds = validation.data.tags.map((tag) => tag.id);
    const mediaIds = validation.data.entries.flatMap((entry) =>
      entry.media.map((media) => media.id),
    );

    const [existingEntries, existingTags, existingMedia] = await Promise.all([
      entryIds.length
        ? prisma.entry.findMany({
            where: { id: { in: entryIds } },
            select: { id: true },
          })
        : Promise.resolve([]),
      tagIds.length
        ? prisma.tag.findMany({
            where: { id: { in: tagIds } },
            select: { id: true },
          })
        : Promise.resolve([]),
      mediaIds.length
        ? prisma.entryMedia.findMany({
            where: { id: { in: mediaIds } },
            select: { id: true },
          })
        : Promise.resolve([]),
    ]);

    if (existingEntries.length > 0) {
      return jsonError(409, "CONFLICT", "Entry ID already exists.");
    }
    if (existingTags.length > 0) {
      return jsonError(409, "CONFLICT", "Tag ID already exists.");
    }
    if (existingMedia.length > 0) {
      return jsonError(409, "CONFLICT", "Media ID already exists.");
    }

    const uploadRootResolved = resolveUploadRoot();
    await fs.mkdir(uploadRootResolved, { recursive: true });

    for (const mediaPath of validation.data.mediaPaths) {
      const destination = path.join(uploadRootResolved, mediaPath);
      try {
        await fs.stat(destination);
        return jsonError(
          409,
          "CONFLICT",
          `Media file already exists at ${mediaPath}.`,
        );
      } catch {
        // ok
      }
    }

    const mediaToRestore = Array.from(expectedMedia);
    const writtenFiles: string[] = [];
    try {
      for (const mediaPath of mediaToRestore) {
        const destination = path.join(uploadRootResolved, mediaPath);
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await writeZipEntryToFile(zip, `media/${mediaPath}`, destination);
        writtenFiles.push(destination);
      }
    } catch (error) {
      await Promise.all(
        writtenFiles.map((filePath) =>
          fs.rm(filePath, { force: true }).catch(() => undefined),
        ),
      );
      console.error("Failed to restore media files", error);
      return jsonError(500, "MEDIA_WRITE_FAILED", "Unable to restore media.");
    }
 

    try {
      await prisma.$transaction(async (tx) => {
        await tx.trip.create({
          data: {
            id: validation.data.trip.id,
            title: validation.data.trip.title,
            startDate: new Date(validation.data.trip.startDate),
            endDate: new Date(validation.data.trip.endDate),
            coverImageUrl: validation.data.trip.coverImageUrl ?? null,
            ownerId: validation.data.trip.ownerId,
            createdAt:
              toDate(validation.data.trip.createdAt) ?? new Date(),
            updatedAt:
              toDate(validation.data.trip.updatedAt) ?? new Date(),
          },
        });

        if (validation.data.tags.length > 0) {
          await tx.tag.createMany({
            data: validation.data.tags.map((tag) => ({
              id: tag.id,
              tripId: validation.data.trip.id,
              name: tag.name,
              normalizedName: tag.normalizedName,
              createdAt: new Date(tag.createdAt),
            })),
          });
        }

        if (validation.data.entries.length > 0) {
          await tx.entry.createMany({
            data: validation.data.entries.map((entry) => ({
              id: entry.id,
              tripId: entry.tripId,
              title: entry.title,
              text: entry.text,
              coverImageUrl: entry.coverImageUrl ?? null,
              latitude: entry.latitude ?? null,
              longitude: entry.longitude ?? null,
              locationName: entry.locationName ?? null,
              weatherCondition: entry.weatherCondition ?? null,
              weatherTemperature: entry.weatherTemperature ?? null,
              weatherIconCode: entry.weatherIconCode ?? null,
              createdAt:
                toDate(entry.entryDate) ??
                toDate(entry.createdAt) ??
                new Date(),
              updatedAt:
                toDate(entry.updatedAt) ??
                toDate(entry.entryDate) ??
                new Date(),
            })),
          });
        }

        const mediaData = validation.data.entries.flatMap((entry) =>
          entry.media.map((media) => ({
            id: media.id,
            entryId: entry.id,
            url: media.url,
            createdAt: new Date(media.createdAt),
          })),
        );

        if (mediaData.length > 0) {
          await tx.entryMedia.createMany({ data: mediaData });
        }

        const entryTagData = validation.data.entries.flatMap((entry) =>
          entry.tags.map((tag) => ({
            entryId: entry.id,
            tagId: tag.id,
          })),
        );

        if (entryTagData.length > 0) {
          await tx.entryTag.createMany({ data: entryTagData });
        }
      });
    } catch (error) {
      await Promise.all(
        writtenFiles.map((filePath) =>
          fs.rm(filePath, { force: true }).catch(() => undefined),
        ),
      );
      console.error("Trip restore failed", error);
      return jsonError(
        500,
        "INTERNAL_SERVER_ERROR",
        "Unable to restore trip.",
      );
    }

    return NextResponse.json(
      {
        data: {
          summary: validation.summary,
          tripId: validation.data.trip.id,
        },
        error: null,
      },
      { status: 201 },
    );
  } finally {
    await zip.close().catch(() => undefined);
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};
