import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { prisma } from "../../../../utils/db";
import {
  countActiveAdmins,
  isAdminRole,
  isAdminUser,
} from "../admin-helpers";

export const runtime = "nodejs";

const updateUserSchema = z.object({
  role: z.enum(["creator", "administrator", "viewer"], {
    errorMap: () => ({
      message: "Role must be creator, administrator, or viewer.",
    }),
  }),
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
    return "User details are invalid.";
  }

  return messages.join(" ");
};

const getAuthContext = async (request: Request) => {
  try {
    const token = await getToken({ req: request });
    if (!token?.sub) {
      return null;
    }
    return {
      userId: token.sub,
      role: typeof token.role === "string" ? token.role : null,
    };
  } catch {
    return null;
  }
};

const requireAdmin = async (request: Request) => {
  const auth = await getAuthContext(request);
  if (!auth) {
    return { error: jsonError(401, "UNAUTHORIZED", "Authentication required.") };
  }
  if (!isAdminUser(auth)) {
    return { error: jsonError(403, "FORBIDDEN", "Admin access required.") };
  }
  return { userId: auth.userId };
};

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const { id } = await params;
    if (auth.userId === id) {
      return jsonError(403, "FORBIDDEN", "Cannot change your own role.");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        formatValidationError(parsed.error),
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return jsonError(404, "NOT_FOUND", "User not found.");
    }

    if (id === "creator") {
      return jsonError(403, "FORBIDDEN", "Cannot change creator role.");
    }

    const isTargetAdmin = isAdminRole(existing.role);
    if (
      isTargetAdmin &&
      existing.isActive &&
      !isAdminRole(parsed.data.role)
    ) {
      const remainingAdmins = await countActiveAdmins(existing.id);
      if (remainingAdmins < 1) {
        return jsonError(
          403,
          "FORBIDDEN",
          "Cannot remove the last active admin.",
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        role: parsed.data.role,
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
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to update user role", error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to update user.");
  }
};

export const DELETE = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const { id } = await params;
    if (id === "creator") {
      return jsonError(403, "FORBIDDEN", "Cannot delete creator account.");
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, isActive: true },
    });

    if (!existing) {
      return jsonError(404, "NOT_FOUND", "User not found.");
    }

    if (isAdminRole(existing.role) && existing.isActive) {
      const remainingAdmins = await countActiveAdmins(existing.id);
      if (remainingAdmins < 1) {
        return jsonError(
          403,
          "FORBIDDEN",
          "Cannot delete the last active admin.",
        );
      }
    }

    const ownedTrip = await prisma.trip.findFirst({
      where: { ownerId: id },
      select: { id: true },
    });

    if (ownedTrip) {
      return jsonError(
        409,
        "USER_HAS_TRIPS",
        "User owns trips. Reassign trips before deleting.",
      );
    }

    const deleted = await prisma.user.delete({
      where: { id },
      select: { id: true },
    });

    return NextResponse.json(
      {
        data: { id: deleted.id },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete user", error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to delete user.");
  }
};
