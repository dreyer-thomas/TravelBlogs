import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { ensureActiveAccount } from "../../../../utils/roles";

export const runtime = "nodejs";

const minSearchIntervalMs = 1000;
const lastSearchAtByUser = new Map<string, number>();

const searchSchema = z.object({
  query: z.string().trim().min(1, "Search query is required."),
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

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  importance: number;
}

export const GET = async (request: NextRequest) => {
  try {
    const user = await getUser(request);
    if (!user) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }
    const isActive = await ensureActiveAccount(user.id);
    if (!isActive) {
      return jsonError(403, "FORBIDDEN", "Account is inactive.");
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() ?? "";

    const parsed = searchSchema.safeParse({ query });
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Search query is invalid.",
      );
    }

    const now = Date.now();
    const lastSearchAt = lastSearchAtByUser.get(user.id) ?? 0;
    if (now - lastSearchAt < minSearchIntervalMs) {
      return jsonError(
        429,
        "RATE_LIMITED",
        "Please wait before searching again.",
      );
    }
    lastSearchAtByUser.set(user.id, now);

    // Use OpenStreetMap Nominatim API (free, no key required)
    // Rate limit: max 1 request/second per usage policy
    const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
    nominatimUrl.searchParams.set("q", parsed.data.query);
    nominatimUrl.searchParams.set("format", "json");
    nominatimUrl.searchParams.set("limit", "5");
    nominatimUrl.searchParams.set("addressdetails", "1");

    const response = await fetch(nominatimUrl.toString(), {
      headers: {
        "User-Agent": "TravelBlogs/1.0",
      },
    });

    if (!response.ok) {
      console.error(
        `Nominatim API error: ${response.status} ${response.statusText}`,
      );
      return jsonError(
        500,
        "GEOCODING_ERROR",
        "Location search service unavailable.",
      );
    }

    const results = (await response.json()) as NominatimResult[];

    return NextResponse.json(
      {
        data: results.map((result) => ({
          id: result.place_id.toString(),
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          displayName: result.display_name,
          type: result.type,
        })),
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to search locations", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to search locations.",
    );
  }
};
