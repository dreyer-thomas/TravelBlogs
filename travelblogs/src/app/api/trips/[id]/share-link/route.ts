import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";

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

const getRequestOrigin = (request: NextRequest) => {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  if (host) {
    return `${proto}://${host}`;
  }
  return request.nextUrl.origin;
};

const buildShareUrl = (request: NextRequest, token: string) => {
  return `${getRequestOrigin(request)}/trips/share/${token}`;
};

const createShareLink = async (tripId: string) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = randomBytes(32).toString("base64url");
    try {
      return await prisma.tripShareLink.create({
        data: {
          tripId,
          token,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }
  return null;
};

const rotateShareLink = async (tripId: string) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = randomBytes(32).toString("base64url");
    try {
      return await prisma.tripShareLink.update({
        where: { tripId },
        data: {
          token,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          continue;
        }
        if (error.code === "P2025") {
          return null;
        }
      }
      throw error;
    }
  }
  return null;
};

const revokeShareLink = async (tripId: string) => {
  try {
    await prisma.tripShareLink.delete({
      where: { tripId },
    });
    return true;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return false;
    }
    throw error;
  }
};

const requireTripAccess = async (
  request: NextRequest,
  params: Promise<{ id: string }> | { id: string },
) => {
  const user = await getUser(request);
  if (!user) {
    return { error: jsonError(401, "UNAUTHORIZED", "Authentication required.") };
  }
  const isAdmin = user.role === "administrator";
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
    const canView = await hasTripAccess(trip.id, user.id);
    if (!canView) {
      return {
        error: jsonError(
          403,
          "FORBIDDEN",
          "Not authorized to view this trip.",
        ),
      };
    }
  }

  return { trip, user };
};

const requireOwnerTrip = async (
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
      error: jsonError(403, "FORBIDDEN", "Not authorized to share this trip."),
    };
  }

  return { trip, user };
};

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const access = await requireTripAccess(request, params);
    if (access.error) {
      return access.error;
    }

    const existing = await prisma.tripShareLink.findUnique({
      where: { tripId: access.trip.id },
    });

    if (!existing) {
      return jsonError(404, "NOT_FOUND", "Share link not found.");
    }

    return NextResponse.json(
      {
        data: {
          shareUrl: buildShareUrl(request, existing.token),
          token: existing.token,
          tripId: access.trip.id,
        },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to load share link", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to load share link.",
    );
  }
};

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const access = await requireTripAccess(request, params);
    if (access.error) {
      return access.error;
    }

    const existing = await prisma.tripShareLink.findUnique({
      where: { tripId: access.trip.id },
    });

    if (existing) {
      return NextResponse.json(
        {
          data: {
            shareUrl: buildShareUrl(request, existing.token),
            token: existing.token,
            tripId: access.trip.id,
          },
          error: null,
        },
        { status: 200 },
      );
    }

    const created = await createShareLink(access.trip.id);
    if (!created) {
      return jsonError(
        500,
        "INTERNAL_SERVER_ERROR",
        "Unable to create share link.",
      );
    }

    return NextResponse.json(
      {
        data: {
          shareUrl: buildShareUrl(request, created.token),
          token: created.token,
            tripId: access.trip.id,
          },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to create share link", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to create share link.",
    );
  }
};

export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const access = await requireOwnerTrip(request, params);
    if (access.error) {
      return access.error;
    }

    const existing = await prisma.tripShareLink.findUnique({
      where: { tripId: access.trip.id },
    });

    if (!existing) {
      return jsonError(404, "NOT_FOUND", "Share link not found.");
    }

    const rotated = await rotateShareLink(access.trip.id);
    if (!rotated) {
      return jsonError(
        500,
        "INTERNAL_SERVER_ERROR",
        "Unable to regenerate share link.",
      );
    }

    return NextResponse.json(
      {
        data: {
          shareUrl: buildShareUrl(request, rotated.token),
          token: rotated.token,
          tripId: access.trip.id,
        },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to regenerate share link", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to regenerate share link.",
    );
  }
};

export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const access = await requireOwnerTrip(request, params);
    if (access.error) {
      return access.error;
    }

    const existing = await prisma.tripShareLink.findUnique({
      where: { tripId: access.trip.id },
    });

    if (!existing) {
      return jsonError(404, "NOT_FOUND", "Share link not found.");
    }

    const revoked = await revokeShareLink(access.trip.id);
    if (!revoked) {
      return jsonError(404, "NOT_FOUND", "Share link not found.");
    }

    return NextResponse.json(
      {
        data: {
          revoked: true,
          tripId: access.trip.id,
        },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to revoke share link", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to revoke share link.",
    );
  }
};
