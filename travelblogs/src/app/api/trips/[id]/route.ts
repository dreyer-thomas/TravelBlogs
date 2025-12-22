import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { prisma } from "../../../../utils/db";

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

const updateTripSchema = z
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

export const GET = async () => {
  return NextResponse.json(
    {
      data: null,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Trip detail endpoint is not implemented yet.",
      },
    },
    { status: 501 },
  );
};

export const PATCH = async (
  request: Request,
  { params }: { params: { id: string } },
) => {
  try {
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

    const parsed = updateTripSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Trip details are invalid.");
    }

    const trip = await prisma.trip.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!trip) {
      return jsonError(404, "NOT_FOUND", "Trip not found.");
    }

    if (trip.ownerId !== token.sub) {
      return jsonError(403, "FORBIDDEN", "Not authorized to update this trip.");
    }

    const coverImageUrl =
      parsed.data.coverImageUrl?.trim() === ""
        ? undefined
        : parsed.data.coverImageUrl?.trim();

    const updatedTrip = await prisma.trip.update({
      where: {
        id: params.id,
      },
      data: {
        title: parsed.data.title,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        coverImageUrl,
      },
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
  request: Request,
  { params }: { params: { id: string } },
) => {
  try {
    const token = await getToken({ req: request });
    if (!token?.sub) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }
    if (token.sub !== "creator") {
      return jsonError(403, "FORBIDDEN", "Creator access required.");
    }

    const trip = await prisma.trip.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!trip) {
      return jsonError(404, "NOT_FOUND", "Trip not found.");
    }

    if (trip.ownerId !== token.sub) {
      return jsonError(403, "FORBIDDEN", "Not authorized to delete this trip.");
    }

    const prismaAny = prisma as unknown as {
      entry?: { deleteMany: (args: { where: { tripId: string } }) => Promise<unknown> };
      shareLink?: { deleteMany: (args: { where: { tripId: string } }) => Promise<unknown> };
      tripShareLink?: { deleteMany: (args: { where: { tripId: string } }) => Promise<unknown> };
    };

    const cleanupOperations: Promise<unknown>[] = [];

    if (prismaAny.entry?.deleteMany) {
      cleanupOperations.push(prismaAny.entry.deleteMany({ where: { tripId: params.id } }));
    }

    if (prismaAny.shareLink?.deleteMany) {
      cleanupOperations.push(prismaAny.shareLink.deleteMany({ where: { tripId: params.id } }));
    }

    if (prismaAny.tripShareLink?.deleteMany) {
      cleanupOperations.push(prismaAny.tripShareLink.deleteMany({ where: { tripId: params.id } }));
    }

    const operations = [
      ...cleanupOperations,
      prisma.trip.delete({
        where: {
          id: params.id,
        },
      }),
    ];

    const results = await prisma.$transaction(operations);
    const deletedTrip = results[results.length - 1] as { id: string };

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
