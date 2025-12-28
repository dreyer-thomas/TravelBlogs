import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { prisma } from "../../../utils/db";
import { extractInlineImageUrls } from "../../../utils/entry-content";

export const runtime = "nodejs";

const createEntrySchema = z
  .object({
    tripId: z.string().trim().min(1, "Trip is required."),
    entryDate: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
        message: "Entry date is required.",
      }),
    text: z.string().trim().min(1, "Entry text is required."),
    mediaUrls: z
      .array(z.string().trim().min(1, "Media URL is required."))
      .optional()
      .default([]),
  })
  .superRefine((data, ctx) => {
    const inlineImages = extractInlineImageUrls(data.text);
    if (data.mediaUrls.length === 0 && inlineImages.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one photo is required.",
        path: ["mediaUrls"],
      });
    }
  });

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

export const POST = async (request: Request) => {
  try {
    const userId = await getUserId(request);
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

    const parsed = createEntrySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Entry details are invalid.",
      );
    }

    const trip = await prisma.trip.findUnique({
      where: {
        id: parsed.data.tripId,
      },
    });

    if (!trip) {
      return jsonError(404, "NOT_FOUND", "Trip not found.");
    }

    if (trip.ownerId !== userId) {
      return jsonError(403, "FORBIDDEN", "Not authorized to add entries.");
    }

    const createdAt = parsed.data.entryDate
      ? new Date(parsed.data.entryDate)
      : new Date();
    const entry = await prisma.entry.create({
      data: {
        tripId: parsed.data.tripId,
        text: parsed.data.text,
        createdAt,
        updatedAt: createdAt,
        media: {
          create: parsed.data.mediaUrls.map((url) => ({ url })),
        },
      },
      include: {
        media: true,
      },
    });

    return NextResponse.json(
      {
        data: {
          id: entry.id,
          tripId: entry.tripId,
          text: entry.text,
          createdAt: entry.createdAt.toISOString(),
          updatedAt: entry.updatedAt.toISOString(),
          media: entry.media.map((item) => ({
            id: item.id,
            url: item.url,
            createdAt: item.createdAt.toISOString(),
          })),
        },
        error: null,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create entry", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to create entry.",
    );
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

    const url = new URL(request.url);
    const tripId = url.searchParams.get("tripId")?.trim() ?? "";
    if (!tripId) {
      return jsonError(400, "VALIDATION_ERROR", "Trip id is required.");
    }

    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
      },
    });

    if (!trip) {
      return jsonError(404, "NOT_FOUND", "Trip not found.");
    }

    if (trip.ownerId !== userId) {
      return jsonError(403, "FORBIDDEN", "Not authorized to view entries.");
    }

    const entries = await prisma.entry.findMany({
      where: {
        tripId,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        media: true,
      },
    });

    return NextResponse.json(
      {
        data: entries.map((entry) => ({
          id: entry.id,
          tripId: entry.tripId,
          text: entry.text,
          createdAt: entry.createdAt.toISOString(),
          updatedAt: entry.updatedAt.toISOString(),
          media: entry.media.map((item) => ({
            id: item.id,
            url: item.url,
            createdAt: item.createdAt.toISOString(),
          })),
        })),
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to load entries", error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to load entries.");
  }
};
