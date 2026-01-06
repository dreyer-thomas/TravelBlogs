import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { prisma } from "../../../../../utils/db";
import { hasTripAccess } from "../../../../../utils/trip-access";
import { ensureActiveAccount, isAdminOrCreator } from "../../../../../utils/roles";

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

const getUser = async (request: Request) => {
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

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const { id } = await params;
    const user = await getUser(request);
    if (!user) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }
    const isActive = await ensureActiveAccount(user.id);
    if (!isActive) {
      return jsonError(403, "FORBIDDEN", "Account is inactive.");
    }
    const isAdmin = isAdminOrCreator(user.role) && user.role === "administrator";

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

    if (!isAdmin && trip.ownerId !== user.id) {
      const canView = await hasTripAccess(trip.id, user.id);
      if (!canView) {
        return jsonError(403, "FORBIDDEN", "Not authorized to view this trip.");
      }
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
