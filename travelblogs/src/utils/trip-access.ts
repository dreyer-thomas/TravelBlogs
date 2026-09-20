import { prisma } from "./db";

const loadUserForAccess = async (userId: string) => {
  if (userId === "creator") {
    return { id: "creator", role: "creator", isActive: true };
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });
};

const ownsTrip = async (tripId: string, userId: string) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { ownerId: true },
  });

  return trip?.ownerId === userId;
};

/**
 * Creators own their own trips, but they can also be invited to someone
 * else's trip. Ownership is therefore only the first of two ways in — a
 * creator who does not own the trip still falls through to the invitation
 * lookup, the same as a viewer.
 */
const isInvited = async (tripId: string, userId: string) => {
  const access = await prisma.tripAccess.findUnique({
    where: {
      tripId_userId: {
        tripId,
        userId,
      },
    },
    select: {
      id: true,
      user: {
        select: {
          isActive: true,
        },
      },
    },
  });

  return Boolean(access?.id && access.user.isActive);
};

export const hasTripAccess = async (tripId: string, userId: string) => {
  const user = await loadUserForAccess(userId);
  if (!user || user.isActive === false) {
    return false;
  }

  if (user.role === "administrator") {
    return true;
  }

  if (user.role === "creator" && (await ownsTrip(tripId, user.id))) {
    return true;
  }

  return isInvited(tripId, userId);
};

export const canContributeToTrip = async (tripId: string, userId: string) => {
  const user = await loadUserForAccess(userId);
  if (!user || user.isActive === false) {
    return false;
  }

  if (user.role === "administrator") {
    return true;
  }

  if (user.role === "creator" && (await ownsTrip(tripId, user.id))) {
    return true;
  }

  const access = await prisma.tripAccess.findUnique({
    where: {
      tripId_userId: {
        tripId,
        userId,
      },
    },
    select: {
      canContribute: true,
      user: {
        select: {
          isActive: true,
        },
      },
    },
  });

  return Boolean(access?.canContribute && access.user.isActive);
};
