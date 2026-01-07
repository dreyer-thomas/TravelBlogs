import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@prisma/client";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { prisma } from "../../../../../utils/db";
import { ensureActiveAccount, isAdminOrCreator } from "../../../../../utils/roles";

export const runtime = "nodejs";

const jsonError = (status: number, code: string, message: string) => {
  return NextResponse.json(
    {
      data: null,
      error: { code, message },
    },
    { status },
  );
};

const getUser = async (request: NextRequest) => {
  try {
    const token = await getToken({ req: request });
    if (!token?.sub) {
      return null;
    }
    return {
      id: token.sub,
      role:
        typeof token.role === "string"
          ? token.role
          : token.sub === "creator"
            ? "creator"
            : null,
    };
  } catch {
    return null;
  }
};

const tripIdSchema = z.object({
  id: z.string().trim().min(1, "Trip id is required."),
});

const transferSchema = z.object({
  userId: z.string().trim().min(1, "Target user is required."),
});

const requireOwnerOrAdmin = async (
  request: NextRequest,
  params: Promise<{ id: string }> | { id: string },
) => {
  const user = await getUser(request);
  if (!user) {
    return { error: jsonError(401, "UNAUTHORIZED", "Authentication required.") };
  }
  const isAdmin = user.role === "administrator";
  if (!isAdminOrCreator(user.role)) {
    return {
      error: jsonError(403, "FORBIDDEN", "Owner or admin access required."),
    };
  }
  const isActive = await ensureActiveAccount(user.id);
  if (!isActive) {
    return { error: jsonError(403, "FORBIDDEN", "Account is inactive.") };
  }

  const { id } = await params;
  const parsed = tripIdSchema.safeParse({ id });
  if (!parsed.success) {
    return {
      error: jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Trip id is required.",
      ),
    };
  }

  const trip = await prisma.trip.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
    },
  });

  if (!trip) {
    return { error: jsonError(404, "NOT_FOUND", "Trip not found.") };
  }

  if (!isAdmin && trip.ownerId !== user.id) {
    return {
      error: jsonError(403, "FORBIDDEN", "Owner or admin access required."),
    };
  }

  return { trip };
};

const formatEligibleOwner = (user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const access = await requireOwnerOrAdmin(request, params);
    if (access.error) {
      return access.error;
    }

    const eligibleOwners = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          in: ["creator", "administrator"],
        },
        id: {
          not: access.trip.ownerId,
        },
      },
      orderBy: [
        { name: "asc" },
        { email: "asc" },
      ],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        data: eligibleOwners.map(formatEligibleOwner),
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to load eligible owners", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to load eligible owners.",
    );
  }
};

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const access = await requireOwnerOrAdmin(request, params);
    if (access.error) {
      return access.error;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const parsed = transferSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Target user is required.",
      );
    }

    if (parsed.data.userId === access.trip.ownerId) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "Selected user already owns this trip.",
      );
    }

    const newOwner = await prisma.user.findFirst({
      where: {
        id: parsed.data.userId,
        isActive: true,
        role: {
          in: ["creator", "administrator"],
        },
      },
      select: {
        id: true,
      },
    });

    if (!newOwner) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "Transfer target must be an active creator or administrator.",
      );
    }

    const updated = await prisma.trip.update({
      where: { id: access.trip.id },
      data: {
        ownerId: newOwner.id,
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    return NextResponse.json(
      {
        data: updated,
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to transfer ownership", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to transfer ownership.",
    );
  }
};
