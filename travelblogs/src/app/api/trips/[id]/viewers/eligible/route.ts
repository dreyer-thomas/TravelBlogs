import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { prisma } from "../../../../../../utils/db";

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
      role: typeof token.role === "string" ? token.role : null,
    };
  } catch {
    return null;
  }
};

const tripIdSchema = z.object({
  id: z.string().trim().min(1, "Trip id is required."),
});

const requireCreatorTrip = async (
  request: Request,
  params: Promise<{ id: string }> | { id: string },
) => {
  const user = await getUser(request);
  if (!user) {
    return { error: jsonError(401, "UNAUTHORIZED", "Authentication required.") };
  }
  if (user.role !== "creator") {
    return { error: jsonError(403, "FORBIDDEN", "Creator access required.") };
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

  if (trip.ownerId !== user.id) {
    return {
      error: jsonError(403, "FORBIDDEN", "Not authorized to view this trip."),
    };
  }

  return { trip };
};

const formatInvitee = (user: {
  id: string;
  name: string;
  email: string;
  role: "creator" | "viewer";
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const access = await requireCreatorTrip(request, params);
    if (access.error) {
      return access.error;
    }

    const existingAccess = await prisma.tripAccess.findMany({
      where: {
        tripId: access.trip.id,
      },
      select: {
        userId: true,
      },
    });

    const excludedIds = new Set<string>([
      access.trip.ownerId,
      ...existingAccess.map((entry) => entry.userId),
    ]);

    const excludedList = Array.from(excludedIds);

    const eligibleUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          in: ["viewer", "creator"],
        },
        ...(excludedList.length > 0
          ? {
              id: {
                notIn: excludedList,
              },
            }
          : {}),
      },
      orderBy: [
        {
          name: "asc",
        },
        {
          email: "asc",
        },
      ],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        data: eligibleUsers.map((user) => formatInvitee(user)),
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to load eligible invitees", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to load eligible invitees.",
    );
  }
};
