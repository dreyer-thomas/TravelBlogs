import type { PreferredLanguage } from "@prisma/client";

import { prisma } from "./db";
import { buildSetPasswordUrl, createAccountToken, hashAccountToken } from "./account-token";
import { describeSendFailure, sendEmail } from "./email";
import { getTranslation } from "./i18n";

type InvitationRecipient = {
  id: string;
  email: string;
  name: string;
  preferredLanguage: PreferredLanguage;
};

/**
 * Sends an invitation mail with a fresh 7-day `invite` token (Story 18.3), used by both
 * `POST /api/users` and `POST /api/users/[id]/invitations`.
 *
 * Order matters: create the token, send, and only then invalidate the user's older invite tokens
 * (those created before this one). A failed send deletes the new token and leaves any earlier link
 * working.
 *
 * Never throws for a send failure - it logs one safe line and returns `{ sent: false }`. Nothing here
 * logs the address, the name, the token, the link or the mail text. A Prisma error while creating the
 * token does throw; the routes' own catch handles it.
 */
export const sendInvitation = async (
  user: InvitationRecipient,
): Promise<{ sent: boolean }> => {
  if (buildSetPasswordUrl("probe") === null) {
    console.error("invitation: NEXTAUTH_URL not set; invitation mail not sent");
    return { sent: false };
  }

  const raw = await createAccountToken(user.id, "invite");
  const tokenHash = hashAccountToken(raw);
  const link = buildSetPasswordUrl(raw) as string;
  const locale = user.preferredLanguage;

  try {
    await sendEmail({
      to: user.email,
      subject: getTranslation("email.invitation.subject", locale),
      // Function replacements: `$&` and friends in a typed name must not be interpreted.
      text: getTranslation("email.invitation.body", locale)
        .replace("{{name}}", () => user.name)
        .replace("{{url}}", () => link),
    });
  } catch (error) {
    await prisma.accountToken.deleteMany({ where: { tokenHash } }).catch(() => undefined);
    console.error("invitation: invitation mail not sent", describeSendFailure(error));
    return { sent: false };
  }

  // Only tokens created before this one: two overlapping resends must not invalidate each other's
  // links, and an older send that finishes late must not kill a newer link. The mail is already out,
  // so a failure here is logged and still reported as sent - the admin must not resend because of it.
  try {
    const created = await prisma.accountToken.findUnique({
      where: { tokenHash },
      select: { id: true, createdAt: true },
    });
    if (created) {
      await prisma.accountToken.updateMany({
        where: {
          userId: user.id,
          type: "invite",
          usedAt: null,
          // Ties within one millisecond are broken by id: a cuid starts with the timestamp and a
          // per-process counter, so a later token always sorts after an earlier one.
          OR: [
            { createdAt: { lt: created.createdAt } },
            { createdAt: created.createdAt, id: { lt: created.id } },
          ],
        },
        data: { usedAt: new Date() },
      });
    }
  } catch (error) {
    console.error("invitation: older invitation links not invalidated", describeSendFailure(error));
  }

  return { sent: true };
};
