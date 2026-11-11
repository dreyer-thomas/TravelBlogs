import type { Metadata } from "next";
import { connection } from "next/server";

import SetPasswordForm from "../../components/account/set-password-form";
import { findUsableAccountToken } from "../../utils/account-token";

// The token is in the URL: never send it on as a Referer, never index the page.
export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

type SetPasswordPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

/**
 * Lands from a reset (18.2) or invitation (18.3) mail. Decides only what to render; the password
 * write checks the token again, atomically.
 */
const SetPasswordPage = async ({ searchParams }: SetPasswordPageProps) => {
  await connection();
  const { token } = await searchParams;
  const raw = typeof token === "string" ? token : null;
  const usable = raw ? await findUsableAccountToken(raw) : null;

  // Only a usable token reveals its type; an unknown or stale link shows the same invalid state for both.
  const isInvitation = usable?.type === "invite";

  return (
    <SetPasswordForm
      token={usable ? raw : null}
      headingKey={isInvitation ? "auth.acceptInvitationTitle" : undefined}
      descriptionKey={isInvitation ? "auth.acceptInvitationDescription" : undefined}
    />
  );
};

export default SetPasswordPage;
