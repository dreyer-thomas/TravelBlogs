import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { compare, hash } from "bcryptjs";

import { prisma } from "../../../../../utils/db";

export const runtime = "nodejs";

const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .trim()
    .min(1, "Current password is required."),
  newPassword: z
    .string()
    .trim()
    .min(8, "Password must be at least 8 characters."),
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

const formatValidationError = (error: z.ZodError) => {
  const messages = Array.from(
    new Set(error.issues.map((issue) => issue.message).filter(Boolean)),
  );

  if (messages.length === 0) {
    return "Password details are invalid.";
  }

  return messages.join(" ");
};

const getUserId = async (request: Request) => {
  try {
    const token = await getToken({ req: request });
    return token?.sub ?? null;
  } catch {
    return null;
  }
};

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }

    const { id } = await params;
    if (userId === "creator") {
      return jsonError(
        403,
        "FORBIDDEN",
        "Creator password is managed in environment configuration.",
      );
    }
    if (userId !== id) {
      return jsonError(403, "FORBIDDEN", "Cannot change another user's password.");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        formatValidationError(parsed.error),
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return jsonError(404, "NOT_FOUND", "User not found.");
    }

    const isValid = await compare(parsed.data.currentPassword, user.passwordHash);
    if (!isValid) {
      return jsonError(403, "FORBIDDEN", "Current password is incorrect.");
    }

    const passwordHash = await hash(parsed.data.newPassword, 12);
    const updated = await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    return NextResponse.json(
      {
        data: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          role: updated.role,
          isActive: updated.isActive,
          mustChangePassword: updated.mustChangePassword,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to change password", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to change password.",
    );
  }
};
