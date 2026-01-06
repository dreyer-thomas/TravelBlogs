import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { prisma } from "../../../../../../utils/db";
import { ensureActiveAccount, isAdminOrCreator } from "../../../../../../utils/roles";

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

const paramsSchema = z.object({
  id: z.string().trim().min(1, "Trip id is required."),
  userId: z.string().trim().min(1, "User id is required."),
});

const contributorSchema = z.object({
  canContribute: z.boolean(),
});

const requireCreatorTrip = async (
  request: NextRequest,
  params: Promise<{ id: string; userId: string }> | { id: string; userId: string },
) => {
  const user = await getUser(request);
  if (!user) {
    return { error: jsonError(401, "UNAUTHORIZED", "Authentication required.") };
  }
  const isAdmin = user.role === "administrator";
  if (!isAdminOrCreator(user.role)) {
    return { error: jsonError(403, "FORBIDDEN", "Creator access required.") };
  }
  const isActive = await ensureActiveAccount(user.id);
  if (!isActive) {
    return { error: jsonError(403, "FORBIDDEN", "Account is inactive.") };
  }

  const resolved = await params;
  const parsed = paramsSchema.safeParse(resolved);
  if (!parsed.success) {
    return {
      error: jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Trip id is required.",
      ),
    };
  }

  const trip = await prisma.trip.findUnique({
    where: { id: parsed.data.id },
    select: {
      id: true,
      ownerId: true,
    },
  });

  if (!trip) {
    return { error: jsonError(404, "NOT_FOUND", "Trip not found.") };
  }

  if (!isAdmin && trip.ownerId !== user.id) {
    return {
      error: jsonError(403, "FORBIDDEN", "Not authorized to view this trip."),
    };
  }

  return { trip, params: parsed.data };
};

const formatAccess = (access: {
  id: string;
  tripId: string;
  userId: string;
  canContribute: boolean;
  createdAt: Date;
  user: { id: string; name: string; email: string };
}) => ({
  id: access.id,
  tripId: access.tripId,
  userId: access.userId,
  canContribute: access.canContribute,
  createdAt: access.createdAt.toISOString(),
  user: {
    id: access.user.id,
    name: access.user.name,
    email: access.user.email,
  },
});

export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> | { id: string; userId: string } },
) => {
  try {
    const access = await requireCreatorTrip(request, params);
    if (access.error) {
      return access.error;
    }

    const existing = await prisma.tripAccess.findUnique({
      where: {
        tripId_userId: {
          tripId: access.trip.id,
          userId: access.params.userId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
      },
    });

    if (!existing) {
      return jsonError(404, "NOT_FOUND", "Invite not found.");
    }

    await prisma.tripAccess.delete({
      where: {
        tripId_userId: {
          tripId: access.trip.id,
          userId: access.params.userId,
        },
      },
    });

    return NextResponse.json(
      {
        data: formatAccess(existing),
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to remove invite", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to remove invite.",
    );
  }
};

export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> | { id: string; userId: string } },
) => {
  try {
    const access = await requireCreatorTrip(request, params);
    if (access.error) {
      return access.error;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const parsed = contributorSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Contributor access is invalid.",
      );
    }

    const existing = await prisma.tripAccess.findUnique({
      where: {
        tripId_userId: {
          tripId: access.trip.id,
          userId: access.params.userId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
      },
    });

    if (!existing) {
      return jsonError(404, "NOT_FOUND", "Invite not found.");
    }

    const isActive = Boolean(existing.user.isActive);
    if (!isActive) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "Viewer is inactive.",
      );
    }

    const updated = await prisma.tripAccess.update({
      where: {
        tripId_userId: {
          tripId: access.trip.id,
          userId: access.params.userId,
        },
      },
      data: {
        canContribute: parsed.data.canContribute,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        data: formatAccess(updated),
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to update contributor access", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to update contributor access.",
    );
  }
};
