import { prisma } from "./db";

export const hasTripAccess = async (tripId: string, userId: string) => {
  const access = await prisma.tripAccess.findUnique({
    where: {
      tripId_userId: {
        tripId,
        userId,
      },
    },
    select: { id: true },
  });

  return Boolean(access);
};
