import { prisma } from "./db";

export const hasTripAccess = async (tripId: string, userId: string) => {
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
