import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";

import { prisma } from "../../../../../../../utils/db";
import { sortTagNames } from "../../../../../../../utils/tag-sort";

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
  {
    params,
  }: {
    params: Promise<{ token: string; entryId: string }> | {
      token: string;
      entryId: string;
    };
  },
) => {
  try {
    noStore();
    const { token, entryId } = await params;

    if (!token || !entryId) {
      return jsonError(404, "NOT_FOUND", "Share link not found.");
    }

    const shareLink = await prisma.tripShareLink.findUnique({
      where: { token },
      select: {
        tripId: true,
      },
    });

    if (!shareLink) {
      return jsonError(404, "NOT_FOUND", "Share link not found.");
    }

    const entry = await prisma.entry.findUnique({
      where: { id: entryId },
      include: {
        media: {
          orderBy: {
            createdAt: "asc",
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!entry || entry.tripId !== shareLink.tripId) {
      return jsonError(404, "NOT_FOUND", "Share link not found.");
    }

    const [previousEntry, nextEntry] = await Promise.all([
      prisma.entry.findFirst({
        where: {
          tripId: entry.tripId,
          createdAt: {
            lt: entry.createdAt,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
        },
      }),
      prisma.entry.findFirst({
        where: {
          tripId: entry.tripId,
          createdAt: {
            gt: entry.createdAt,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json(
      {
        data: {
          id: entry.id,
          tripId: entry.tripId,
          title: entry.title,
          text: entry.text,
          createdAt: entry.createdAt.toISOString(),
          coverImageUrl: entry.coverImageUrl ?? null,
          media: entry.media.map((item) => ({
            id: item.id,
            url: item.url,
            createdAt: item.createdAt.toISOString(),
          })),
          tags: sortTagNames(
            entry.tags.map((item) => item.tag.name),
          ),
          location:
            entry.latitude !== null && entry.longitude !== null
              ? {
                  latitude: entry.latitude,
                  longitude: entry.longitude,
                  label: entry.locationName,
                }
              : null,
          navigation: {
            previousEntryId: previousEntry?.id ?? null,
            nextEntryId: nextEntry?.id ?? null,
            previousEntryTitle: previousEntry?.title ?? null,
            nextEntryTitle: nextEntry?.title ?? null,
            previousEntryDate: previousEntry?.createdAt.toISOString() ?? null,
            nextEntryDate: nextEntry?.createdAt.toISOString() ?? null,
          },
        },
        error: null,
      },
      { status: 200, headers: cacheHeaders },
    );
  } catch (error) {
    console.error("Failed to load shared entry", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to load shared entry.",
    );
  }
};
