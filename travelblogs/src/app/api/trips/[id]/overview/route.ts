import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { prisma } from "../../../../../utils/db";

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

const getUserId = async (request: Request) => {
  try {
    const token = await getToken({ req: request });
    return token?.sub ?? null;
  } catch {
    return null;
  }
};

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const { id } = await params;
    const userId = await getUserId(request);

    const trip = await prisma.trip.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        coverImageUrl: true,
        ownerId: true,
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
            media: {
              orderBy: {
                createdAt: "asc",
              },
              select: {
                url: true,
              },
            },
          },
        },
      },
    });

    if (!trip) {
      return jsonError(404, "NOT_FOUND", "Trip not found.");
    }

    if (trip.ownerId !== "creator" && userId !== trip.ownerId) {
      return jsonError(403, "FORBIDDEN", "Not authorized to view this trip.");
    }

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
          })),
        },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to load trip overview", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to load trip overview.",
    );
  }
};
