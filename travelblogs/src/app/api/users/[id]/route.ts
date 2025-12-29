import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { prisma } from "../../../../utils/db";

export const runtime = "nodejs";

const updateUserSchema = z.object({
  role: z.enum(["creator", "viewer"], {
    errorMap: () => ({ message: "Role must be creator or viewer." }),
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

const getUserId = async (request: Request) => {
  try {
    const token = await getToken({ req: request });
    return token?.sub ?? null;
  } catch {
    return null;
  }
};

const requireAdmin = async (request: Request) => {
  const userId = await getUserId(request);
  if (!userId) {
    return { error: jsonError(401, "UNAUTHORIZED", "Authentication required.") };
  }
  if (userId !== "creator") {
    return { error: jsonError(403, "FORBIDDEN", "Admin access required.") };
  }
  return { userId };
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
