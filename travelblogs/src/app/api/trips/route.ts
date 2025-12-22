import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { prisma } from "../../../utils/db";

export const runtime = "nodejs";

const createTripSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required."),
    startDate: z.string().trim().min(1, "Start date is required."),
    endDate: z.string().trim().min(1, "End date is required."),
    coverImageUrl: z.string().trim().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return !Number.isNaN(start.valueOf()) && !Number.isNaN(end.valueOf());
    },
    { message: "Dates must be valid ISO strings." },
  )
  .refine(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
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

export const POST = async (request: Request) => {
  const token = await getToken({ req: request });
  if (!token?.sub) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required.");
  }
  if (token.sub !== "creator") {
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

  const coverImageUrl =
    parsed.data.coverImageUrl?.trim() === ""
      ? undefined
      : parsed.data.coverImageUrl?.trim();

  const trip = await prisma.trip.create({
    data: {
      title: parsed.data.title,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      coverImageUrl,
      ownerId: token.sub,
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
