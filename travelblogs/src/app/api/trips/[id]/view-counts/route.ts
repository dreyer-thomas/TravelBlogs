import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { prisma } from "../../../../../utils/db";
import { canContributeToTrip } from "../../../../../utils/trip-access";
import { ensureActiveAccount } from "../../../../../utils/roles";
import { getTripViewCounts } from "../../../../../utils/view-counter";

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

const getUser = async (request: NextRequest) => {
  try {
    const token = await getToken({ req: request });
    if (!token?.sub) {
      return null;
    }
    // Only the id is needed: authorization runs entirely through
    // `canContributeToTrip`, which loads the role itself.
    return { id: token.sub };
  } catch {
    return null;
  }
};

/**
 * View counts are an editor's metric: they are gated on the same contributor
 * permission that unlocks the edit affordances (see Story 5.18), not on read
 * access. A read-only viewer can open the trip but must not learn how often it
 * was read, and an anonymous caller is refused before any counter is touched.
 */
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

    const trip = await prisma.trip.findUnique({
      where: { id },
      select: { id: true, ownerId: true },
    });

    if (!trip) {
      return jsonError(404, "NOT_FOUND", "Trip not found.");
    }

    const canContribute =
      trip.ownerId === user.id
        ? true
        : await canContributeToTrip(trip.id, user.id);

    if (!canContribute) {
      return jsonError(
        403,
        "FORBIDDEN",
        "Not authorized to view counts for this trip.",
      );
    }

    const counts = await getTripViewCounts(trip.id);

    return NextResponse.json({ data: counts, error: null }, { status: 200 });
  } catch (error) {
    console.error("Failed to load trip view counts", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to load view counts.",
    );
  }
};
