import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { prisma } from "../../../../../utils/db";
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

const inviteSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Email is required.")
      .email("Email must be valid.")
      .transform((value) => value.toLowerCase())
      .optional(),
    userId: z.string().trim().min(1, "User id is required.").optional(),
  })
  .refine((data) => Boolean(data.email || data.userId), {
    message: "Invite details are invalid.",
  });

const requireCreatorTrip = async (
  request: NextRequest,
  params: Promise<{ id: string }> | { id: string },
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

  const { id } = await params;
  const parsed = tripIdSchema.safeParse({ id });
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
    where: { id },
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

  return { trip };
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

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const access = await requireCreatorTrip(request, params);
    if (access.error) {
      return access.error;
    }

    const viewers = await prisma.tripAccess.findMany({
      where: { tripId: access.trip.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(
      {
        data: viewers.map((viewer) => formatAccess(viewer)),
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to load trip viewers", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to load viewers.",
    );
  }
};

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
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

    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Invite details are invalid.");
    }

    const userLookup = parsed.data.userId
      ? { id: parsed.data.userId }
      : { email: parsed.data.email ?? "" };

    const user = await prisma.user.findUnique({
      where: userLookup,
    });

    if (!user || !user.isActive) {
      return jsonError(404, "NOT_FOUND", "User not found.");
    }

    if (
      user.role !== "viewer" &&
      user.role !== "creator" &&
      user.role !== "administrator"
    ) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "User must be a creator, administrator, or viewer.",
      );
    }

    const existing = await prisma.tripAccess.findUnique({
      where: {
        tripId_userId: {
          tripId: access.trip.id,
          userId: user.id,
        },
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

    if (existing) {
      return NextResponse.json(
        {
          data: formatAccess(existing),
          error: null,
        },
        { status: 200 },
      );
    }

    const created = await prisma.tripAccess.create({
      data: {
        tripId: access.trip.id,
        userId: user.id,
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
        data: formatAccess(created),
        error: null,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to invite viewer", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to invite viewer.",
    );
  }
};
