import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { prisma } from "../../../../utils/db";
import { isCoverImageUrl } from "../../../../utils/media";
import { canContributeToTrip, hasTripAccess } from "../../../../utils/trip-access";
import { ensureActiveAccount, isAdminOrCreator } from "../../../../utils/roles";

export const runtime = "nodejs";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const parseIsoDate = (value: string) => {
  if (!isoDatePattern.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

const jsonError = (status: number, code: string, message: string) => {
  return NextResponse.json(
    {
      data: null,
      error: { code, message },
    },
    { status },
  );
};

const updateTripSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required."),
    startDate: z
      .string()
      .trim()
      .min(1, "Start date is required.")
      .refine(parseIsoDate, { message: "Start date must be an ISO date." }),
    endDate: z
      .string()
      .trim()
      .min(1, "End date is required.")
      .refine(parseIsoDate, { message: "End date must be an ISO date." }),
    coverImageUrl: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine(
        (value) => value === undefined || value === "" || isCoverImageUrl(value),
        { message: "Cover image must come from the upload endpoint." },
      ),
  })
  .refine(
    (data) => {
      return Boolean(parseIsoDate(data.startDate) && parseIsoDate(data.endDate));
    },
    { message: "Dates must be valid ISO strings." },
  )
  .refine(
    (data) => {
      const start = parseIsoDate(data.startDate);
      const end = parseIsoDate(data.endDate);
      return Boolean(start && end && start <= end);
    },
    { message: "Start date must be before end date." },
  );

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

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const user = await getUser(request);
    if (!user) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }
    const isAdmin = user.role === "administrator";
    const isActive = await ensureActiveAccount(user.id);
    if (!isActive) {
      return jsonError(403, "FORBIDDEN", "Account is inactive.");
    }
    const { id } = await params;

    const trip = await prisma.trip.findUnique({
      where: {
        id,
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

    const owner = await prisma.user.findUnique({
      where: { id: trip.ownerId },
      select: { name: true },
    });

    return NextResponse.json(
      {
        data: {
          id: trip.id,
          title: trip.title,
          startDate: trip.startDate.toISOString(),
          endDate: trip.endDate.toISOString(),
          coverImageUrl: trip.coverImageUrl,
          ownerId: trip.ownerId,
          ownerName:
            owner?.name ?? (trip.ownerId === "creator" ? "Creator" : null),
          createdAt: trip.createdAt.toISOString(),
          updatedAt: trip.updatedAt.toISOString(),
        },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch trip detail", error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to load trip.");
  }
};

export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const user = await getUser(request);
    if (!user) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }
    const isAdmin = user.role === "administrator";
    if (!isAdmin && user.role !== "creator" && user.role !== "viewer") {
      return jsonError(403, "FORBIDDEN", "Valid role required.");
    }
    const isActive = await ensureActiveAccount(user.id);
    if (!isActive) {
      return jsonError(403, "FORBIDDEN", "Account is inactive.");
    }

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const parsed = updateTripSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Trip details are invalid.");
    }

    const trip = await prisma.trip.findUnique({
      where: {
        id,
      },
    });

    if (!trip) {
      return jsonError(404, "NOT_FOUND", "Trip not found.");
    }

    if (!isAdmin && trip.ownerId !== user.id) {
      const canContribute = await canContributeToTrip(trip.id, user.id);
      if (!canContribute) {
        return jsonError(
          403,
          "FORBIDDEN",
          "Not authorized to update this trip.",
        );
      }
    }

    const startDate = parseIsoDate(parsed.data.startDate);
    const endDate = parseIsoDate(parsed.data.endDate);

    if (!startDate || !endDate) {
      return jsonError(400, "VALIDATION_ERROR", "Trip details are invalid.");
    }

    const coverImageValue = parsed.data.coverImageUrl?.trim();
    const coverImageUrl =
      coverImageValue === "" ? null : coverImageValue;

    const updatedTrip = await prisma.trip.update({
      where: {
        id,
      },
      data: {
        title: parsed.data.title,
        startDate,
        endDate,
        ...(parsed.data.coverImageUrl !== undefined
          ? { coverImageUrl }
          : {}),
      },
    });

    const owner = await prisma.user.findUnique({
      where: { id: updatedTrip.ownerId },
      select: { name: true },
    });

    return NextResponse.json(
      {
        data: {
          id: updatedTrip.id,
          title: updatedTrip.title,
          startDate: updatedTrip.startDate.toISOString(),
          endDate: updatedTrip.endDate.toISOString(),
          coverImageUrl: updatedTrip.coverImageUrl,
          ownerId: updatedTrip.ownerId,
          ownerName:
            owner?.name ??
            (updatedTrip.ownerId === "creator" ? "Creator" : null),
          createdAt: updatedTrip.createdAt.toISOString(),
          updatedAt: updatedTrip.updatedAt.toISOString(),
        },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to update trip", error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to update trip.");
  }
};

export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const user = await getUser(request);
    if (!user) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }
    if (!isAdminOrCreator(user.role)) {
      return jsonError(403, "FORBIDDEN", "Creator access required.");
    }
    const isAdmin = user.role === "administrator";
    const isActive = await ensureActiveAccount(user.id);
    if (!isActive) {
      return jsonError(403, "FORBIDDEN", "Account is inactive.");
    }

    const { id } = await params;

    const trip = await prisma.trip.findUnique({
      where: {
        id,
      },
    });

    if (!trip) {
      return jsonError(404, "NOT_FOUND", "Trip not found.");
    }

    if (!isAdmin && trip.ownerId !== user.id) {
      return jsonError(403, "FORBIDDEN", "Not authorized to delete this trip.");
    }

    let deletedTrip: { id: string };

    const prismaAny = prisma as unknown as {
      entry?: { deleteMany: (args: { where: { tripId: string } }) => Promise<unknown> };
      shareLink?: { deleteMany: (args: { where: { tripId: string } }) => Promise<unknown> };
      tripShareLink?: { deleteMany: (args: { where: { tripId: string } }) => Promise<unknown> };
      trip: { delete: (args: { where: { id: string } }) => Promise<{ id: string }> };
    };

    const hasCleanup =
      Boolean(prismaAny.entry?.deleteMany) ||
      Boolean(prismaAny.shareLink?.deleteMany) ||
      Boolean(prismaAny.tripShareLink?.deleteMany);

    if (hasCleanup) {
      const prismaTransaction = prisma as unknown as {
        $transaction: (fn: (tx: typeof prisma) => Promise<{ id: string }>) => Promise<{ id: string }>;
      };
      deletedTrip = await prismaTransaction.$transaction(async (tx) => {
        const txAny = tx as unknown as typeof prismaAny;
        if (txAny.entry?.deleteMany) {
          await txAny.entry.deleteMany({ where: { tripId: id } });
        }
        if (txAny.shareLink?.deleteMany) {
          await txAny.shareLink.deleteMany({ where: { tripId: id } });
        }
        if (txAny.tripShareLink?.deleteMany) {
          await txAny.tripShareLink.deleteMany({ where: { tripId: id } });
        }
        return txAny.trip.delete({ where: { id } });
      });
    } else {
      deletedTrip = await prismaAny.trip.delete({ where: { id } });
    }

    return NextResponse.json(
      {
        data: {
          id: deletedTrip.id,
        },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete trip", error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to delete trip.");
  }
};
