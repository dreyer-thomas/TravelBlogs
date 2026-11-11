import { prisma } from "./db";
import {
  buildSetPasswordUrl,
  createAccountToken,
  hashAccountToken,
  isTokenEligibleUser,
} from "./account-token";
import { describeSendFailure, sendEmail } from "./email";
import { getTranslation } from "./i18n";

/** A known address gets at most one reset mail per this window, however often the form is sent. */
export const PASSWORD_RESET_THROTTLE_MS = 5 * 60 * 1000;

const hasValidBaseUrl = () => buildSetPasswordUrl("probe") !== null;

/**
 * The background half of `POST /api/password-resets` (Story 18.2). Returns silently for unknown,
 * inactive and creator addresses - the caller has already answered the same thing for all of them.
 * Throws when the mail could not be sent; `startPasswordReset` turns that into one safe log line.
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, email: true, isActive: true, preferredLanguage: true },
  });

  if (!isTokenEligibleUser(user)) {
    return;
  }

  const recent = await prisma.accountToken.findFirst({
    where: {
      userId: user.id,
      type: "reset",
      usedAt: null,
      expiresAt: { gt: new Date() },
      createdAt: { gt: new Date(Date.now() - PASSWORD_RESET_THROTTLE_MS) },
    },
    select: { id: true },
  });
  if (recent) {
    return;
  }

  if (!hasValidBaseUrl()) {
    console.error("password-reset: NEXTAUTH_URL not set; reset mail not sent");
    return;
  }

  const raw = await createAccountToken(user.id, "reset");
  const link = buildSetPasswordUrl(raw) as string;
  const locale = user.preferredLanguage;

  try {
    await sendEmail({
      to: user.email,
      subject: getTranslation("email.passwordReset.subject", locale),
      text: getTranslation("email.passwordReset.body", locale).replace("{{url}}", () => link),
    });
  } catch (error) {
    // The mail never left: drop its token so it does not throttle the user's next attempt.
    await prisma.accountToken
      .deleteMany({ where: { tokenHash: hashAccountToken(raw) } })
      .catch(() => undefined);
    throw error;
  }
};

/**
 * What the route calls: fire and forget. The `.catch` is mandatory - an unhandled rejection would put
 * the raw error (which can carry the recipient) in the journal.
 */
export const startPasswordReset = (email: string) => {
  void requestPasswordReset(email).catch((error: unknown) => {
    console.error("password-reset: reset mail not sent", describeSendFailure(error));
  });
};
