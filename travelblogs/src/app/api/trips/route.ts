import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { prisma } from "../../../utils/db";
import { isCoverImageUrl } from "../../../utils/media";

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

const getUserId = async (request: Request) => {
  try {
    const token = await getToken({ req: request });
    return token?.sub ?? null;
  } catch {
    return null;
  }
};

export const GET = async (request: Request) => {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }
    if (userId !== "creator") {
      return jsonError(403, "FORBIDDEN", "Creator access required.");
    }

    const trips = await prisma.trip.findMany({
      where: {
        ownerId: userId,
      },
      // Most-recent updates first for list ordering.
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        coverImageUrl: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        data: trips.map((trip) => ({
          id: trip.id,
          title: trip.title,
          startDate: trip.startDate.toISOString(),
          endDate: trip.endDate.toISOString(),
          coverImageUrl: trip.coverImageUrl,
          updatedAt: trip.updatedAt.toISOString(),
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
  let userId: string | null = null;
  try {
    const token = await getToken({ req: request });
    userId = token?.sub ?? null;
  } catch {
    userId = null;
  }

  if (!userId) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required.");
  }
  if (userId !== "creator") {
    return jsonError(403, "FORBIDDEN", "Creator access required.");
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
      ownerId: userId,
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
