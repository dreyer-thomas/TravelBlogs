import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { prisma } from "../../../../utils/db";
import {
  formatEntryFormatSummary,
  getEntryFormatStatus,
} from "../../../../utils/entry-format";
import { ensureActiveAccount } from "../../../../utils/roles";

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
  try {
    const isActive = await ensureActiveAccount(auth.userId);
    if (!isActive) {
      return { error: jsonError(403, "FORBIDDEN", "Account is inactive.") };
    }
  } catch (error) {
    console.error("Failed to verify account status", error);
    return { error: jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to verify account.") };
  }
  if (auth.role !== "administrator") {
    return { error: jsonError(403, "FORBIDDEN", "Admin access required.") };
  }
  return auth;
};

export const GET = async (request: NextRequest) => {
  try {
    const auth = await requireAdministrator(request);
    if ("error" in auth) {
      return auth.error;
    }

    // Limit to 10,000 entries to prevent memory exhaustion
    // For larger datasets, implement pagination
    const entries = await prisma.entry.findMany({
      select: {
        id: true,
        text: true,
      },
      take: 10000,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const statuses = getEntryFormatStatus(entries);
    const summary = formatEntryFormatSummary(statuses);
    const entriesByFormat = statuses.reduce(
      (accumulator, status) => {
        if (status.format === "tiptap") {
          accumulator.tiptap.push(status.entryId);
        } else {
          accumulator.plain.push(status.entryId);
        }
        return accumulator;
      },
      { plain: [] as string[], tiptap: [] as string[] },
    );

    return NextResponse.json(
      {
        data: {
          summary,
          entries: entriesByFormat,
        },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to load migration diagnostics", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to load entry diagnostics.",
    );
  }
};
