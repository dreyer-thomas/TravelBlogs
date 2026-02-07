import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import ZipStream from "zip-stream";

import { prisma } from "../../../../../utils/db";
import { ensureActiveAccount } from "../../../../../utils/roles";
import {
  buildExportMeta,
  resolveUploadRoot,
  serializeEntries,
  serializeTrip,
} from "../../../../../utils/trip-export";

export const runtime = "nodejs";

const jsonError = (status: number, code: string, message: string) => {
  return NextResponse.json(
    {
      data: null,
      error: { code, message },
    },
    { status },
  );
};

const getUser = async (request: NextRequest) => {
  try {
    const token = await getToken({ req: request });
    if (!token?.sub) {
      return null;
    }
    return {
      id: token.sub,
      role:
        typeof token.role === "string"
          ? token.role
          : token.sub === "creator"
            ? "creator"
            : null,
    };
  } catch {
    return null;
  }
};

const toZipName = (title: string, tripId: string) => {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const safe = base || tripId;
  const date = new Date().toISOString().slice(0, 10);
  return `trip-${safe}-${date}.zip`;
};

const mapUploadUrlToPath = (url: string, uploadRoot: string) => {
  if (!url.startsWith("/uploads/")) {
    return null;
  }
  const relative = url.replace(/^\/uploads\//, "");
  return {
    relative,
    absolute: path.join(uploadRoot, relative),
  };
};

type ExportMediaFile = {
  url: string;
  mapping: {
    relative: string;
    absolute: string;
  };
  size: number;
};

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const url = new URL(request.url);
    const estimateOnly = url.searchParams.get("estimate") === "true";
    const user = await getUser(request);
    if (!user) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }

    const isAdmin = user.role === "administrator";
    const isActive = await ensureActiveAccount(user.id);
    if (!isActive) {
      return jsonError(403, "FORBIDDEN", "Account is inactive.");
    }

    const { id } = await params;

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        tags: true,
        entries: {
          include: {
            media: true,
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
      },
    });

    if (!trip) {
      return jsonError(404, "NOT_FOUND", "Trip not found.");
    }

    if (!isAdmin && trip.ownerId !== user.id) {
      return jsonError(403, "FORBIDDEN", "Not authorized to export this trip.");
    }

    const uploadRoot = resolveUploadRoot();
    const mediaUrls = new Set<string>();

    if (trip.coverImageUrl) {
      mediaUrls.add(trip.coverImageUrl);
    }

    trip.entries.forEach((entry) => {
      if (entry.coverImageUrl) {
        mediaUrls.add(entry.coverImageUrl);
      }
      entry.media.forEach((media) => {
        mediaUrls.add(media.url);
      });
    });

    const mediaFiles = Array.from(mediaUrls)
      .map((url) => ({ url, mapping: mapUploadUrlToPath(url, uploadRoot) }))
      .filter(
        (
          item,
        ): item is {
          url: string;
          mapping: { relative: string; absolute: string };
        } => Boolean(item.mapping),
      );

    const mediaWithStats: ExportMediaFile[] = [];

    for (const item of mediaFiles) {
      try {
        const stats = await fs.stat(item.mapping.absolute);
        mediaWithStats.push({ ...item, size: stats.size });
      } catch {
        return jsonError(404, "MISSING_MEDIA", `Missing media file: ${item.url}`);
      }
    }

    const serializedTrip = serializeTrip(trip);
    const serializedEntries = serializeEntries(
      trip.entries.map((entry) => ({
        id: entry.id,
        tripId: entry.tripId,
        title: entry.title,
        text: entry.text,
        entryDate: entry.createdAt,
        coverImageUrl: entry.coverImageUrl,
        tags: entry.tags.map((entryTag) => entryTag.tag.name),
        latitude: entry.latitude,
        longitude: entry.longitude,
        locationName: entry.locationName,
        weatherCondition: entry.weatherCondition,
        weatherTemperature: entry.weatherTemperature,
        weatherIconCode: entry.weatherIconCode,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })),
    ).map((entry, index) => ({
      ...entry,
      media: trip.entries[index]?.media.map((media) => ({
        id: media.id,
        url: media.url,
        createdAt: media.createdAt.toISOString(),
      })),
      tags: trip.entries[index]?.tags.map((entryTag) => ({
        id: entryTag.tag.id,
        name: entryTag.tag.name,
        normalizedName: entryTag.tag.normalizedName,
        createdAt: entryTag.tag.createdAt.toISOString(),
      })),
    }));

    const exportMeta = buildExportMeta({
      tripId: trip.id,
      entryCount: trip.entries.length,
      mediaCount: mediaWithStats.length,
    });

    if (estimateOnly) {
      const jsonBytes = Buffer.byteLength(
        JSON.stringify({
          meta: exportMeta,
          trip: {
            trip: serializedTrip,
            tags: trip.tags.map((tag) => ({
              id: tag.id,
              name: tag.name,
              normalizedName: tag.normalizedName,
              createdAt: tag.createdAt.toISOString(),
            })),
          },
          entries: { entries: serializedEntries },
        }),
      );
      const mediaBytes = mediaWithStats.reduce(
        (total, item) => total + item.size,
        0,
      );
      return NextResponse.json(
        {
          data: {
            estimate: {
              totalBytes: jsonBytes + mediaBytes,
              jsonBytes,
              mediaBytes,
              mediaCount: mediaWithStats.length,
            },
          },
          error: null,
        },
        { status: 200 },
      );
    }

    const zip = new ZipStream({ forceZip64: true });
    zip.on("error", (error: Error) => {
      console.error("Trip export zip error", error);
    });

    const addEntry = (data: Buffer | NodeJS.ReadableStream, name: string) =>
      new Promise<void>((resolve, reject) => {
        zip.entry(data, { name }, (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

    const fileName = toZipName(trip.title, trip.id);
    const headers = new Headers({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      "Cache-Control": "no-store",
    });
    const response = new Response(Readable.toWeb(zip) as ReadableStream, {
      status: 200,
      headers,
    });

    void (async () => {
      try {
        await addEntry(
          Buffer.from(JSON.stringify(exportMeta, null, 2)),
          "meta.json",
        );
        await addEntry(
          Buffer.from(
            JSON.stringify(
              {
                trip: serializedTrip,
                tags: trip.tags.map((tag) => ({
                  id: tag.id,
                  name: tag.name,
                  normalizedName: tag.normalizedName,
                  createdAt: tag.createdAt.toISOString(),
                })),
              },
              null,
              2,
            ),
          ),
          "trip.json",
        );
        await addEntry(
          Buffer.from(JSON.stringify({ entries: serializedEntries }, null, 2)),
          "entries.json",
        );

        for (const item of mediaWithStats) {
          const entryName = path.posix.join(
            "media",
            item.mapping.relative.replace(/\\/g, "/"),
          );
          await addEntry(
            createReadStream(item.mapping.absolute),
            entryName,
          );
        }

        zip.finalize();
      } catch (error) {
        console.error("Failed to stream trip export", error);
        zip.destroy(error as Error);
      }
    })();

    return response;
  } catch (error) {
    console.error("Failed to export trip", error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to export trip.");
  }
};
