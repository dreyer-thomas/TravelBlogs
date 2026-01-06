import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { prisma } from "../../../../utils/db";
import { extractInlineImageUrls } from "../../../../utils/entry-content";
import { canContributeToTrip, hasTripAccess } from "../../../../utils/trip-access";
import { ensureActiveAccount, isAdminOrCreator } from "../../../../utils/roles";

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

const entryIdSchema = z.object({
  id: z.string().trim().min(1, "Entry id is required."),
});

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

const updateEntrySchema = z
  .object({
    entryDate: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
        message: "Entry date is required.",
      }),
    title: z
      .string()
      .trim()
      .min(1, "Entry title is required.")
      .max(80, "Entry title must be 80 characters or fewer."),
    coverImageUrl: z.string().trim().optional().nullable(),
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const { id } = await params;

    const user = await getUser(request);
    if (!user) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }
    const isActive = await ensureActiveAccount(user.id);
    if (!isActive) {
      return jsonError(403, "FORBIDDEN", "Account is inactive.");
    }
    const entry = await prisma.entry.findUnique({
      where: {
        id,
      },
      include: {
        media: {
          orderBy: {
            createdAt: "asc",
          },
        },
        trip: true,
      },
    });

    if (!entry) {
      return jsonError(404, "NOT_FOUND", "Entry not found.");
    }

    const isAdmin = user.role === "administrator";
    if (!isAdmin && entry.trip.ownerId !== user.id) {
      const canView = await hasTripAccess(entry.tripId, user.id);
      if (!canView) {
        return jsonError(403, "FORBIDDEN", "Not authorized to view this entry.");
      }
    }

    const [previousEntry, nextEntry] = await Promise.all([
      prisma.entry.findFirst({
        where: {
          tripId: entry.tripId,
          createdAt: {
            lt: entry.createdAt,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
        },
      }),
      prisma.entry.findFirst({
        where: {
          tripId: entry.tripId,
          createdAt: {
            gt: entry.createdAt,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json(
      {
        data: {
          id: entry.id,
          tripId: entry.tripId,
          title: entry.title,
          coverImageUrl: entry.coverImageUrl,
          text: entry.text,
          createdAt: entry.createdAt.toISOString(),
          updatedAt: entry.updatedAt.toISOString(),
          media: entry.media.map(
            (item: { id: string; url: string; createdAt: Date }) => ({
            id: item.id,
            url: item.url,
            createdAt: item.createdAt.toISOString(),
          }),
          ),
          navigation: {
            previousEntryId: previousEntry?.id ?? null,
            nextEntryId: nextEntry?.id ?? null,
            previousEntryTitle: previousEntry?.title ?? null,
            nextEntryTitle: nextEntry?.title ?? null,
            previousEntryDate: previousEntry?.createdAt.toISOString() ?? null,
            nextEntryDate: nextEntry?.createdAt.toISOString() ?? null,
          },
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const user = await getUser(request);
    if (!user) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
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

    const isAdmin = user.role === "administrator";
    if (!isAdmin && entry.trip.ownerId !== user.id) {
      const canContribute = await canContributeToTrip(entry.tripId, user.id);
      if (!canContribute) {
        return jsonError(
          403,
          "FORBIDDEN",
          "Not authorized to edit this entry.",
        );
      }
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
    if (
      parsed.data.coverImageUrl &&
        ![
          ...inlineImages,
          ...((nextMediaUrls ??
            entry.media.map((item: { url: string }) => item.url))),
        ]
          .includes(parsed.data.coverImageUrl)
    ) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "Story image must be one of the entry photos.",
      );
    }

    const updated = await prisma.entry.update({
      where: { id },
      data: {
        title: parsed.data.title,
        text: parsed.data.text,
        updatedAt: new Date(),
        ...(parsed.data.coverImageUrl !== undefined
          ? { coverImageUrl: parsed.data.coverImageUrl }
          : {}),
        ...(parsed.data.entryDate
          ? { createdAt: new Date(parsed.data.entryDate) }
          : {}),
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
          title: updated.title,
          coverImageUrl: updated.coverImageUrl,
          text: updated.text,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          media: updated.media.map(
            (item: { id: string; url: string; createdAt: Date }) => ({
            id: item.id,
            url: item.url,
            createdAt: item.createdAt.toISOString(),
          }),
          ),
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
    const parsed = entryIdSchema.safeParse({ id });
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Entry id is required.",
      );
    }

    const entry = await prisma.entry.findUnique({
      where: { id },
      include: { trip: true },
    });

    if (!entry) {
      return jsonError(404, "NOT_FOUND", "Entry not found.");
    }

    if (!isAdmin && entry.trip.ownerId !== user.id) {
      return jsonError(403, "FORBIDDEN", "Not authorized to delete this entry.");
    }

    const deletedEntry = await prisma.entry.delete({
      where: { id },
    });

    return NextResponse.json(
      {
        data: {
          id: deletedEntry.id,
        },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete entry", error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to delete entry.");
  }
};
