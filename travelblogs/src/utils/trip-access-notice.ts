import type { PreferredLanguage } from "@prisma/client";

import { prisma } from "./db";
import { isCreatorAccount } from "./account-token";
import { describeSendFailure, sendEmail } from "./email";
import { getTranslation } from "./i18n";

type TripAccessRecipient = {
  id: string;
  email: string;
  name: string;
  preferredLanguage: PreferredLanguage;
  invitationPending: boolean;
};

export type TripAccessNoticeInput = {
  tripId: string;
  tripTitle: string;
  actorId: string;
  recipient: TripAccessRecipient;
  canContribute: boolean;
};

/**
 * The authenticated trip page a trip-access mail links to (Story 18.4) - never the share link. Null
 * when `NEXTAUTH_URL` is unset or not a valid URL, so no mail goes out with a broken link.
 */
export const buildTripUrl = (tripId: string): string | null => {
  const base = process.env.NEXTAUTH_URL?.trim();
  if (!base) {
    return null;
  }
  try {
    return new URL(`/trips/${encodeURIComponent(tripId)}`, base).toString();
  } catch {
    return null;
  }
};

/**
 * No mail to the person who added themselves, to the trip's owner, or to the env-managed creator
 * account (Epic 18 non-goal).
 */
export const shouldNotifyTripAccess = ({
  actorId,
  ownerId,
  recipient,
}: {
  actorId: string;
  ownerId: string;
  recipient: { id: string; email: string };
}) => recipient.id !== actorId && recipient.id !== ownerId && !isCreatorAccount(recipient);

/**
 * One pass with a function replacement: `$&` in a typed name stays literal, and placeholder-looking
 * text inside a value is never expanded again.
 */
const fillTemplate = (template: string, values: Record<string, string>) =>
  template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values[key] ?? match);

/**
 * Builds and sends the trip-access mail. Throws when it could not be sent; `startTripAccessNotice`
 * turns that into one safe log line. Nothing here logs the address, a name, the title, the link or
 * the text.
 */
export const sendTripAccessNotice = async (input: TripAccessNoticeInput): Promise<void> => {
  const url = buildTripUrl(input.tripId);
  if (url === null) {
    console.error("trip-access-notice: NEXTAUTH_URL not set; trip access mail not sent");
    return;
  }

  const { recipient } = input;
  const locale = recipient.preferredLanguage;
  const actor = await prisma.user.findUnique({
    where: { id: input.actorId },
    select: { name: true },
  });
  const actorName = actor?.name ?? getTranslation("email.tripAccess.someone", locale);

  const values = {
    name: recipient.name,
    actor: actorName,
    trip: input.tripTitle,
    role: getTranslation(
      input.canContribute ? "email.tripAccess.roleContributor" : "email.tripAccess.roleViewer",
      locale,
    ),
    url,
    pending: recipient.invitationPending
      ? `${getTranslation("email.tripAccess.pendingInvitation", locale)}\n\n`
      : "",
  };

  // A header must never carry a line break.
  const subjectValues = {
    ...values,
    actor: actorName.replace(/\s+/g, " ").trim(),
    trip: input.tripTitle.replace(/\s+/g, " ").trim(),
  };

  await sendEmail({
    to: recipient.email,
    subject: fillTemplate(getTranslation("email.tripAccess.subject", locale), subjectValues),
    text: fillTemplate(getTranslation("email.tripAccess.body", locale), values),
  });
};

/**
 * What the route calls, without awaiting. The `.catch` is mandatory - an unhandled rejection would
 * put the raw error (which can carry the recipient) in the journal. Returns the caught promise so
 * tests can await it.
 */
export const startTripAccessNotice = (input: TripAccessNoticeInput): Promise<void> =>
  sendTripAccessNotice(input).catch((error: unknown) => {
    console.error("trip-access-notice: trip access mail not sent", describeSendFailure(error));
  });
