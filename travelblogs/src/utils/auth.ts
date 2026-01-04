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

type AuthSuccess = {
  success: true;
  user: AuthUser;
};

type AuthFailure = {
  success: false;
  errorCode:
    | "INVALID_CREDENTIALS"
    | "ACCOUNT_INACTIVE"
    | "ACCOUNT_NOT_FOUND";
  message: string;
};

type AuthResult = AuthSuccess | AuthFailure;

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
): Promise<AuthResult> => {
  const normalizedEmail = normalizeEmail(email);
  const config = readCreatorConfig();
  const configEmail = normalizeEmail(config.email);

  if (configEmail && config.password) {
    if (normalizedEmail === configEmail && password === config.password) {
      return { success: true, user: { ...creatorUser, email: configEmail } };
    }
  }

  if (!normalizedEmail) {
    return {
      success: false,
      errorCode: "INVALID_CREDENTIALS",
      message: "Invalid email or password.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return {
      success: false,
      errorCode: "ACCOUNT_NOT_FOUND",
      message: "Account not found or has been removed.",
    };
  }

  if (!user.isActive) {
    return {
      success: false,
      errorCode: "ACCOUNT_INACTIVE",
      message: "Your account is inactive. Contact an admin.",
    };
  }

  const isValid = await compare(password, user.passwordHash);
  if (!isValid) {
    return {
      success: false,
      errorCode: "INVALID_CREDENTIALS",
      message: "Invalid email or password.",
    };
  }

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  };
};
