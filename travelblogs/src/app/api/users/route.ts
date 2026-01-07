import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { hash } from "bcryptjs";

import { prisma } from "../../../utils/db";
import { isAdminUser } from "./admin-helpers";

export const runtime = "nodejs";

const createUserSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Email must be valid."),
  name: z.string().trim().min(1, "Name is required."),
  role: z.enum(["creator", "administrator", "viewer"]),
  password: z.string().trim().min(8, "Password must be at least 8 characters."),
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

const readCreatorConfig = () => {
  const email = process.env.CREATOR_EMAIL?.trim() ?? "";
  const password = process.env.CREATOR_PASSWORD?.trim() ?? "";

  if (!email || !password) {
    return null;
  }

  return { email, password };
};

const ensureDefaultCreator = async () => {
  const creatorConfig = readCreatorConfig();
  if (!creatorConfig) {
    return null;
  }

  const existing = await prisma.user.findUnique({
    where: { id: "creator" },
  });

  if (!existing) {
    const passwordHash = await hash(creatorConfig.password, 12);
    return prisma.user.create({
      data: {
        id: "creator",
        email: creatorConfig.email,
        name: "Default creator",
        role: "creator",
        passwordHash,
      },
    });
  }

  if (
    existing.email !== creatorConfig.email ||
    existing.name !== "Default creator" ||
    existing.role !== "creator"
  ) {
    return prisma.user.update({
      where: { id: "creator" },
      data: {
        email: creatorConfig.email,
        name: "Default creator",
        role: "creator",
      },
    });
  }

  return existing;
};

const requireAdmin = async (request: NextRequest) => {
  const auth = await getAuthContext(request);
  if (!auth) {
    return { error: jsonError(401, "UNAUTHORIZED", "Authentication required.") };
  }
  if (!isAdminUser(auth)) {
    return { error: jsonError(403, "FORBIDDEN", "Admin access required.") };
  }
  return { userId: auth.userId, role: auth.role };
};

export const GET = async (request: NextRequest) => {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    await ensureDefaultCreator();

    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        data: users.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        })),
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to list users", error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to load users.");
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        formatValidationError(parsed.error),
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (existing) {
      return jsonError(409, "DUPLICATE_USER", "Email already exists.");
    }

    const passwordHash = await hash(parsed.data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        passwordHash,
        mustChangePassword: true,
      },
    });

    return NextResponse.json(
      {
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        error: null,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2002") {
        return jsonError(409, "DUPLICATE_USER", "Email already exists.");
      }
    }
    console.error("Failed to create user", error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to create user.");
  }
};
