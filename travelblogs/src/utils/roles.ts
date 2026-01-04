import { prisma } from "./db";

export const isAdminRole = (role: string | null | undefined) =>
  role === "administrator";

export const isAdminOrCreator = (role: string | null | undefined) =>
  role === "creator" || role === "administrator";

export const ensureActiveAccount = async (userId: string) => {
  if (userId === "creator") {
    return true;
  }

  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true },
  });

  return account?.isActive !== false;
};
