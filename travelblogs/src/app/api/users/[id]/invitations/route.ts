import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { prisma } from "../../../../../utils/db";
import { describeSendFailure } from "../../../../../utils/email";
import { sendInvitation } from "../../../../../utils/invitation";
import { isAdminUser } from "../../admin-helpers";

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

const requireAdmin = async (request: NextRequest) => {
  const auth = await getAuthContext(request);
  if (!auth) {
    return { error: jsonError(401, "UNAUTHORIZED", "Authentication required.") };
  }
  if (!isAdminUser(auth)) {
    return { error: jsonError(403, "FORBIDDEN", "Admin access required.") };
  }
  return { userId: auth.userId };
};

const isCreatorAccount = (user: { id: string; email: string }) => {
  if (user.id === "creator") {
    return true;
  }
  const creatorEmail = process.env.CREATOR_EMAIL?.trim().toLowerCase();
  return Boolean(creatorEmail) && user.email.trim().toLowerCase() === creatorEmail;
};

/**
 * Story 18.3: sends a fresh invitation mail to a user who has not set a password yet. Earlier
 * invitation links stop working only once the new mail is out (see `sendInvitation`).
 */
export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) => {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        invitationPending: true,
        preferredLanguage: true,
      },
    });

    if (!user) {
      return jsonError(404, "NOT_FOUND", "User not found.");
    }
    if (isCreatorAccount(user)) {
      return jsonError(
        403,
        "FORBIDDEN",
        "The creator account is managed in environment configuration.",
      );
    }
    if (!user.invitationPending) {
      return jsonError(
        409,
        "INVITATION_NOT_PENDING",
        "This user has already accepted the invitation.",
      );
    }
    if (!user.isActive) {
      return jsonError(
        409,
        "USER_INACTIVE",
        "Activate the user before resending the invitation.",
      );
    }

    const { sent } = await sendInvitation(user);
    if (!sent) {
      return jsonError(502, "INVITATION_NOT_SENT", "The invitation email could not be sent.");
    }

    return NextResponse.json({ data: { invitationSent: true }, error: null }, { status: 201 });
  } catch (error) {
    console.error("Failed to resend invitation", describeSendFailure(error));
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to resend the invitation.");
  }
};
