import { NextResponse, type NextRequest } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { prisma } from "../../../../../../utils/db";
import {
  isBotUserAgent,
  recordEntryView,
  recordTripView,
} from "../../../../../../utils/view-counter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cacheHeaders = {
  "Cache-Control": "no-store",
};

const bodySchema = z.object({
  entryId: z.string().min(1).optional(),
});

const jsonError = (status: number, code: string, message: string) => {
  return NextResponse.json(
    {
      data: null,
      error: { code, message },
    },
    { status, headers: cacheHeaders },
  );
};

const jsonCounted = (counted: boolean) => {
  return NextResponse.json(
    {
      data: { counted },
      error: null,
    },
    { status: 200, headers: cacheHeaders },
  );
};

/**
 * Fails closed: if the session cannot be read — a missing or rotated
 * `NEXTAUTH_SECRET`, an undecryptable cookie — the request is treated as
 * signed in and is not counted. Failing open would silently record every
 * editor's own page load as an anonymous view, inflating the figure with no
 * signal that anything is wrong.
 */
const hasSession = async (request: NextRequest) => {
  try {
    const token = await getToken({ req: request });
    return Boolean(token);
  } catch (error) {
    console.error("Failed to read session while recording view", error);
    return true;
  }
};

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } },
) => {
  try {
    noStore();
    const { token } = await params;

    if (!token) {
      return jsonError(404, "NOT_FOUND", "Share link not found.");
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(rawBody ?? {});

    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid request body.");
    }

    const { entryId } = parsed.data;

    const shareLink = await prisma.tripShareLink.findUnique({
      where: { token },
      select: { tripId: true },
    });

    if (!shareLink) {
      return jsonError(404, "NOT_FOUND", "Share link not found.");
    }

    if (entryId) {
      const entry = await prisma.entry.findUnique({
        where: { id: entryId },
        select: { tripId: true },
      });

      if (!entry || entry.tripId !== shareLink.tripId) {
        return jsonError(404, "NOT_FOUND", "Entry not found.");
      }
    }

    // Signed-in readers are editors of the blog, not audience; do not count them.
    if (await hasSession(request)) {
      return jsonCounted(false);
    }

    // The User-Agent is inspected in memory only and never stored or logged.
    if (isBotUserAgent(request.headers.get("user-agent"))) {
      return jsonCounted(false);
    }

    if (entryId) {
      await recordEntryView(entryId);
    } else {
      await recordTripView(shareLink.tripId);
    }

    return jsonCounted(true);
  } catch (error) {
    console.error("Failed to record view", error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to record view.");
  }
};
