import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";

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

const tripIdSchema = z.object({
  id: z.string().trim().min(1, "Trip id is required."),
});

const getRequestOrigin = (request: Request) => {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  if (host) {
    return `${proto}://${host}`;
  }
  const requestUrl = new URL(request.url);
  return requestUrl.origin;
};

const buildShareUrl = (request: Request, token: string) => {
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

const requireCreatorTrip = async (
  request: Request,
  params: Promise<{ id: string }> | { id: string },
) => {
  const userId = await getUserId(request);
  if (!userId) {
    return { error: jsonError(401, "UNAUTHORIZED", "Authentication required.") };
  }
  if (userId !== "creator") {
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

  if (trip.ownerId !== userId) {
    return {
      error: jsonError(403, "FORBIDDEN", "Not authorized to share this trip."),
    };
  }

  return { trip };
};

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const access = await requireCreatorTrip(request, params);
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
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const access = await requireCreatorTrip(request, params);
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
