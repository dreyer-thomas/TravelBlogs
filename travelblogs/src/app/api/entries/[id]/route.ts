import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { prisma } from "../../../../utils/db";
import { extractInlineImageUrls } from "../../../../utils/entry-content";

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

const updateEntrySchema = z
  .object({
    text: z.string().trim().min(1, "Entry text is required."),
    mediaUrls: z
      .array(z.string().trim().min(1, "Media URL is required."))
      .optional(),
  })
  .superRefine((data, ctx) => {
    const inlineImages = extractInlineImageUrls(data.text);
    if (
      data.mediaUrls &&
      data.mediaUrls.length === 0 &&
      inlineImages.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one photo is required.",
        path: ["mediaUrls"],
      });
    }
  });

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }
    if (userId !== "creator") {
      return jsonError(403, "FORBIDDEN", "Creator access required.");
    }

    const { id } = await params;

    const entry = await prisma.entry.findUnique({
      where: {
        id,
      },
      include: {
        media: true,
        trip: true,
      },
    });

    if (!entry) {
      return jsonError(404, "NOT_FOUND", "Entry not found.");
    }

    if (entry.trip.ownerId !== userId) {
      return jsonError(403, "FORBIDDEN", "Not authorized to view this entry.");
    }

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
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to load entry", error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to load entry.");
  }
};

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }
    if (userId !== "creator") {
      return jsonError(403, "FORBIDDEN", "Creator access required.");
    }

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const parsed = updateEntrySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Entry details are invalid.",
      );
    }

    const entry = await prisma.entry.findUnique({
      where: { id },
      include: { trip: true, media: true },
    });

    if (!entry) {
      return jsonError(404, "NOT_FOUND", "Entry not found.");
    }

    if (entry.trip.ownerId !== userId) {
      return jsonError(403, "FORBIDDEN", "Not authorized to edit this entry.");
    }

    const inlineImages = extractInlineImageUrls(parsed.data.text);
    const nextMediaUrls = parsed.data.mediaUrls;
    const hasMedia =
      nextMediaUrls !== undefined
        ? nextMediaUrls.length > 0
        : entry.media.length > 0;
    if (!hasMedia && inlineImages.length === 0) {
      return jsonError(400, "VALIDATION_ERROR", "At least one photo is required.");
    }

    const updated = await prisma.entry.update({
      where: { id },
      data: {
        text: parsed.data.text,
        updatedAt: new Date(),
        ...(nextMediaUrls !== undefined
          ? {
              media: {
                deleteMany: {},
                create: nextMediaUrls.map((url) => ({ url })),
              },
            }
          : {}),
      },
      include: {
        media: true,
      },
    });

    return NextResponse.json(
      {
        data: {
          id: updated.id,
          tripId: updated.tripId,
          text: updated.text,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          media: updated.media.map((item) => ({
            id: item.id,
            url: item.url,
            createdAt: item.createdAt.toISOString(),
          })),
        },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to update entry", error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to update entry.");
  }
};
