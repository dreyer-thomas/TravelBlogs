import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { prisma } from "../../../../utils/db";
import { ensureActiveAccount } from "../../../../utils/roles";
import {
  compareTripsByStartDate,
  tripAccessOrderBy,
  tripOrderBy,
} from "../../../../utils/trip-ordering";

export const runtime = "nodejs";

const countryCodePattern = /^[A-Z]{2}$/;

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

const getVisibleTrips = async (user: { id: string; role: string | null }) => {
  const tripSelection = {
    id: true,
    title: true,
    startDate: true,
  };

  if (user.role === "administrator") {
    const trips = await prisma.trip.findMany({
      select: tripSelection,
      orderBy: tripOrderBy,
    });
    return trips;
  }

  if (user.role === "creator") {
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
        },
      }),
    ]);

    const tripsById = new Map<string, (typeof ownedTrips)[number]>();
    ownedTrips.forEach((trip) => tripsById.set(trip.id, trip));
    invitedAccess.forEach((access) =>
      tripsById.set(access.trip.id, access.trip),
    );

    return Array.from(tripsById.values()).sort(compareTripsByStartDate);
  }

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
    },
    orderBy: tripAccessOrderBy,
  });

  return invitedAccess.map((access) => access.trip);
};

export const GET = async (request: NextRequest) => {
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

    const visibleTrips = await getVisibleTrips(user);
    if (visibleTrips.length === 0) {
      return NextResponse.json(
        {
          data: { countries: [], tripsByCountry: {} },
          error: null,
        },
        { status: 200 },
      );
    }

    const tripById = new Map(visibleTrips.map((trip) => [trip.id, trip]));
    const entries = await prisma.entry.findMany({
      where: {
        tripId: {
          in: visibleTrips.map((trip) => trip.id),
        },
        countryCode: {
          not: null,
        },
      },
      select: {
        tripId: true,
        countryCode: true,
      },
    });

    const tripsByCountry = new Map<
      string,
      Map<string, { id: string; title: string; startDate: Date }>
    >();
    entries.forEach((entry) => {
      if (!entry.countryCode) {
        return;
      }
      const normalized = entry.countryCode.trim().toUpperCase();
      if (!countryCodePattern.test(normalized)) {
        return;
      }
      const trip = tripById.get(entry.tripId);
      if (!trip) {
        return;
      }
      const countryTrips =
        tripsByCountry.get(normalized) ??
        new Map<string, { id: string; title: string; startDate: Date }>();
      countryTrips.set(trip.id, {
        id: trip.id,
        title: trip.title,
        startDate: trip.startDate,
      });
      tripsByCountry.set(normalized, countryTrips);
    });

    const countries = Array.from(tripsByCountry.keys()).sort();
    const tripsByCountryPayload: Record<string, { id: string; title: string }[]> =
      {};

    countries.forEach((country) => {
      const trips = tripsByCountry.get(country);
      if (!trips) {
        return;
      }
      tripsByCountryPayload[country] = Array.from(trips.values())
        .sort(compareTripsByStartDate)
        .map(({ id, title }) => ({ id, title }));
    });

    return NextResponse.json(
      {
        data: {
          countries,
          tripsByCountry: tripsByCountryPayload,
        },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to load trip map data", error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to load map data.");
  }
};
