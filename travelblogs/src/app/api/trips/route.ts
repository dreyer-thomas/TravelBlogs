import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { prisma } from "../../../utils/db";
import { isCoverImageUrl } from "../../../utils/media";
import { ensureActiveAccount, isAdminOrCreator } from "../../../utils/roles";

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

const createTripSchema = z
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

export const GET = async (request: Request) => {
  try {
    const user = await getUser(request);
    if (!user) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }
    const isAdmin = user.role === "administrator";
    const isCreator = user.role === "creator";
    const isViewer = user.role === "viewer";

    if (!isAdmin && !isCreator && !isViewer) {
      return jsonError(403, "FORBIDDEN", "Valid role required.");
    }

    const isActive = await ensureActiveAccount(user.id);
    if (!isActive) {
      return jsonError(403, "FORBIDDEN", "Account is inactive.");
    }

    const tripSelection = {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
      coverImageUrl: true,
      updatedAt: true,
    };

    let tripList: {
      trip: {
        id: string;
        title: string;
        startDate: Date;
        endDate: Date;
        coverImageUrl: string | null;
        updatedAt: Date;
      };
      canEditTrip: boolean;
    }[] = [];

    if (isAdmin) {
      const trips = await prisma.trip.findMany({
        select: tripSelection,
        orderBy: { updatedAt: "desc" },
      });

      tripList = trips.map((trip) => ({
        trip,
        canEditTrip: true,
      }));
    } else if (user.role === "creator") {
      const [ownedTrips, invitedAccess] = await Promise.all([
        prisma.trip.findMany({
          where: {
            ownerId: user.id,
          },
          select: tripSelection,
        }),
        prisma.tripAccess.findMany({
          where: {
            userId: user.id,
            user: {
              isActive: true,
            },
          },
          select: {
            trip: {
              select: tripSelection,
            },
            canContribute: true,
          },
        }),
      ]);

      const tripsById = new Map<
        string,
        { trip: (typeof ownedTrips)[number]; canEditTrip: boolean }
      >();
      ownedTrips.forEach((trip) =>
        tripsById.set(trip.id, { trip, canEditTrip: true }),
      );
      invitedAccess.forEach((access) => {
        const existing = tripsById.get(access.trip.id);
        const canEditTrip = Boolean(access.canContribute);
        if (existing) {
          existing.canEditTrip = existing.canEditTrip || canEditTrip;
          return;
        }
        tripsById.set(access.trip.id, { trip: access.trip, canEditTrip });
      });
      tripList = Array.from(tripsById.values()).sort(
        (a, b) => b.trip.updatedAt.getTime() - a.trip.updatedAt.getTime(),
      );
    } else {
      const invitedAccess = await prisma.tripAccess.findMany({
        where: {
          userId: user.id,
          user: {
            isActive: true,
          },
        },
        select: {
          trip: {
            select: tripSelection,
          },
          canContribute: true,
        },
        orderBy: {
          trip: {
            updatedAt: "desc",
          },
        },
      });

      tripList = invitedAccess.map((access) => ({
        trip: access.trip,
        canEditTrip: Boolean(access.canContribute),
      }));
    }

    return NextResponse.json(
      {
        data: tripList.map(({ trip, canEditTrip }) => ({
          id: trip.id,
          title: trip.title,
          startDate: trip.startDate.toISOString(),
          endDate: trip.endDate.toISOString(),
          coverImageUrl: trip.coverImageUrl,
          updatedAt: trip.updatedAt.toISOString(),
          canEditTrip,
        })),
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to list trips", error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to load trips.");
  }
};

export const POST = async (request: Request) => {
  const user = await getUser(request);
  if (!user) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required.");
  }
  if (!isAdminOrCreator(user.role)) {
    return jsonError(403, "FORBIDDEN", "Creator access required.");
  }
  const isActive = await ensureActiveAccount(user.id);
  if (!isActive) {
    return jsonError(403, "FORBIDDEN", "Account is inactive.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = createTripSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "Trip details are invalid.");
  }

  const coverImageValue = parsed.data.coverImageUrl?.trim();
  const coverImageUrl = coverImageValue === "" ? null : coverImageValue;
  const startDate = parseIsoDate(parsed.data.startDate);
  const endDate = parseIsoDate(parsed.data.endDate);

  if (!startDate || !endDate) {
    return jsonError(400, "VALIDATION_ERROR", "Trip details are invalid.");
  }

  const trip = await prisma.trip.create({
    data: {
      title: parsed.data.title,
      startDate,
      endDate,
      coverImageUrl,
      ownerId: user.id,
    },
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
        createdAt: trip.createdAt.toISOString(),
        updatedAt: trip.updatedAt.toISOString(),
      },
      error: null,
    },
    { status: 201 },
  );
};
