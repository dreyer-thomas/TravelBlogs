import type { UserRole } from "@prisma/client";
import { compare } from "bcryptjs";

import { prisma } from "./db";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword?: boolean;
};

const creatorUser: AuthUser = {
  id: "creator",
  name: "Creator",
  email: "",
  role: "creator",
};

const readCreatorConfig = () => {
  const email = process.env.CREATOR_EMAIL?.trim() ?? "";
  const password = process.env.CREATOR_PASSWORD?.trim() ?? "";

  return { email, password };
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const validateCredentials = async (
  email: string,
  password: string,
): Promise<AuthUser | null> => {
  const normalizedEmail = normalizeEmail(email);
  const config = readCreatorConfig();
  const configEmail = normalizeEmail(config.email);

  if (configEmail && config.password) {
    if (normalizedEmail === configEmail && password === config.password) {
      return { ...creatorUser, email: configEmail };
    }
  }

  if (!normalizedEmail) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || !user.isActive) {
    return null;
  }

  const isValid = await compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
};
