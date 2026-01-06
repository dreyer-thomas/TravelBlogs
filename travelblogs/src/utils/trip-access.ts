import { prisma } from "./db";
import { isAdminOrCreator } from "./roles";

const loadUserForAccess = async (userId: string) => {
  if (userId === "creator") {
    return { id: "creator", role: "creator", isActive: true };
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });
};

export const hasTripAccess = async (tripId: string, userId: string) => {
  const user = await loadUserForAccess(userId);
  if (!user || user.isActive === false) {
    return false;
  }

  if (user.role === "administrator") {
    return true;
  }

  if (user.role === "creator") {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { ownerId: true },
    });
    return trip?.ownerId === user.id;
  }

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

export const canContributeToTrip = async (tripId: string, userId: string) => {
  const user = await loadUserForAccess(userId);
  if (!user || user.isActive === false) {
    return false;
  }

  if (user.role === "administrator") {
    return true;
  }

  if (user.role === "creator") {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { ownerId: true },
    });
    return trip?.ownerId === user.id;
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
