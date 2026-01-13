import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { prisma } from "../../../../../utils/db";
import { hasTripAccess } from "../../../../../utils/trip-access";
import { ensureActiveAccount } from "../../../../../utils/roles";

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

const tripIdSchema = z.object({
  id: z.string().trim().min(1, "Trip id is required."),
});

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const user = await getUser(request);
    if (!user) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }
    const isActive = await ensureActiveAccount(user.id);
    if (!isActive) {
      return jsonError(403, "FORBIDDEN", "Account is inactive.");
    }

    const { id } = await params;
    const parsed = tripIdSchema.safeParse({ id });
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Trip id is required.",
      );
    }

    const trip = await prisma.trip.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!trip) {
      return jsonError(404, "NOT_FOUND", "Trip not found.");
    }

    const isAdmin = user.role === "administrator";
    if (!isAdmin && trip.ownerId !== user.id) {
      const canView = await hasTripAccess(trip.id, user.id);
      if (!canView) {
        return jsonError(403, "FORBIDDEN", "Not authorized to view this trip.");
      }
    }

    const tags = await prisma.tag.findMany({
      where: {
        tripId: trip.id,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        name: true,
      },
    });

    return NextResponse.json(
      {
        data: tags.map((tag) => tag.name),
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to load trip tags", error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to load tags.");
  }
};
