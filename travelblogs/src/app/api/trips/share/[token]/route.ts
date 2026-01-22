import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";

import { prisma } from "../../../../../utils/db";
import { sortTagNames } from "../../../../../utils/tag-sort";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cacheHeaders = {
  "Cache-Control": "no-store",
};

const jsonError = (status: number, code: string, message: string) => {
  return NextResponse.json(
    {
      data: null,
      error: { code, message },
    },
    { status, headers: cacheHeaders },
  );
};

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ token: string }> | { token: string } },
) => {
  try {
    noStore();
    const { token } = await params;

    if (!token) {
      return jsonError(404, "NOT_FOUND", "Share link not found.");
    }

    const shareLink = await prisma.tripShareLink.findUnique({
      where: { token },
      select: {
        trip: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            coverImageUrl: true,
            entries: {
              orderBy: {
                createdAt: "desc",
              },
              select: {
                id: true,
                tripId: true,
                title: true,
                createdAt: true,
                coverImageUrl: true,
                latitude: true,
                longitude: true,
                locationName: true,
                countryCode: true,
                media: {
                  orderBy: {
                    createdAt: "asc",
                  },
                  select: {
                    url: true,
                  },
                },
                tags: {
                  select: {
                    tag: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!shareLink?.trip) {
      return jsonError(404, "NOT_FOUND", "Share link not found.");
    }

    const trip = shareLink.trip;

    return NextResponse.json(
      {
        data: {
          trip: {
            id: trip.id,
            title: trip.title,
            startDate: trip.startDate.toISOString(),
            endDate: trip.endDate.toISOString(),
            coverImageUrl: trip.coverImageUrl,
          },
          entries: trip.entries.map((entry) => ({
            id: entry.id,
            tripId: entry.tripId,
            title: entry.title,
            createdAt: entry.createdAt.toISOString(),
            coverImageUrl: entry.coverImageUrl,
            media: entry.media.map((item) => ({ url: item.url })),
            tags: sortTagNames(entry.tags.map((item) => item.tag.name)),
              location:
                entry.latitude !== null && entry.longitude !== null
                  ? {
                      latitude: entry.latitude,
                      longitude: entry.longitude,
                      label: entry.locationName,
                      countryCode: entry.countryCode,
                    }
                  : null,
          })),
        },
        error: null,
      },
      { status: 200, headers: cacheHeaders },
    );
  } catch (error) {
    console.error("Failed to load shared trip", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to load shared trip.",
    );
  }
};
