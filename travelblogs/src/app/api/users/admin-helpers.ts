import { prisma } from "../../../utils/db";
import { isAdminOrCreator } from "../../../utils/roles";

const hasDefaultCreatorAccount = () =>
  Boolean(process.env.CREATOR_EMAIL?.trim() && process.env.CREATOR_PASSWORD?.trim());

export const countActiveAdmins = async (excludeUserId?: string) => {
  const admins = await prisma.user.findMany({
    where: {
      role: "administrator",
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });

  const defaultCreator = await prisma.user.findUnique({
    where: { id: "creator" },
    select: { isActive: true },
  });

  const includesCreator = admins.some((user) => user.id === "creator");
  const excludeCreator = excludeUserId === "creator";
  const baselineCreator =
    hasDefaultCreatorAccount() &&
    !includesCreator &&
    !excludeCreator &&
    defaultCreator?.isActive !== false
      ? 1
      : 0;

  return admins.length + baselineCreator;
};

type AuthContext = {
  userId: string;
  role: string | null;
};

export const isAdminRole = (role: string | null | undefined) =>
  role === "administrator";

export const isAdminUser = (auth: AuthContext | null) =>
  Boolean(auth && (auth.userId === "creator" || isAdminOrCreator(auth.role)));
