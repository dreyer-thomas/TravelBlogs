import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { prisma } from "../../../../../utils/db";
import { countActiveAdmins, isAdminRole } from "../../admin-helpers";

export const runtime = "nodejs";

const updateStatusSchema = z.object({
  isActive: z.boolean({
    message: "Active status must be true or false.",
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
    return "User status is invalid.";
  }

  return messages.join(" ");
};

const getAuthContext = async (request: NextRequest) => {
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

const requireAdministrator = async (request: NextRequest) => {
  const auth = await getAuthContext(request);
  if (!auth) {
    return { error: jsonError(401, "UNAUTHORIZED", "Authentication required.") };
  }
  if (auth.role !== "administrator") {
    return { error: jsonError(403, "FORBIDDEN", "Admin access required.") };
  }
  return { userId: auth.userId, role: auth.role };
};

export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const auth = await requireAdministrator(request);
    if (auth.error) {
      return auth.error;
    }

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const parsed = updateStatusSchema.safeParse(body);
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

    const isTargetAdmin = isAdminRole(existing.role) || existing.id === "creator";
    const isDeactivating =
      isTargetAdmin && existing.isActive && parsed.data.isActive === false;
    if (isTargetAdmin && isDeactivating) {
      const remainingAdmins = await countActiveAdmins(existing.id);
      if (remainingAdmins < 1) {
        return jsonError(
          403,
          "FORBIDDEN",
          "Cannot deactivate the last active admin.",
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        isActive: parsed.data.isActive,
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
    console.error("Failed to update user status", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to update user status.",
    );
  }
};
