"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useTranslation } from "../../utils/use-translation";

type SetPasswordFormProps = {
  /** A token the server found usable, or null to show the "link no longer valid" state. */
  token: string | null;
  /** Translation key for the heading; invitations (18.3) pass their own. */
  headingKey?: string;
  /** Optional translation key for a one-line subtitle under the heading. */
  descriptionKey?: string;
};

const inputClass =
  "mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20";

const MIN_PASSWORD_LENGTH = 8;

const SetPasswordForm = ({
  token,
  headingKey = "auth.setPasswordTitle",
  descriptionKey,
}: SetPasswordFormProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [invalid, setInvalid] = useState(token === null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirmPassword") ?? "");

    if (password.trim().length < MIN_PASSWORD_LENGTH) {
      setError(t("account.passwordMinLength"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/account-tokens/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (response.ok) {
        const body = (await response.json().catch(() => null)) as {
          data?: { type?: string };
        } | null;
        router.replace(
          body?.data?.type === "invite"
            ? "/sign-in?invitationAccepted=1"
            : "/sign-in?passwordReset=1",
        );
        return;
      }

      const body = (await response.json().catch(() => null)) as {
        error?: { code?: string };
      } | null;
      const code = body?.error?.code;
      if (code === "TOKEN_INVALID") {
        setInvalid(true);
      } else if (code === "VALIDATION_ERROR") {
        setError(t("account.passwordMinLength"));
      } else {
        setError(t("auth.setPasswordFailed"));
      }
      setSubmitting(false);
    } catch {
      setError(t("auth.setPasswordFailed"));
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF7F1] px-6">
      <main className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        {invalid ? (
          <>
            <header className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold text-[#2D2A26]">
                {t("auth.linkInvalidTitle")}
              </h1>
              <p className="text-sm text-[#6B635B]">{t("auth.linkInvalidDescription")}</p>
            </header>
            <p className="mt-6 text-center">
              <Link
                href="/forgot-password"
                className="inline-block rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63]"
              >
                {t("auth.requestNewLink")}
              </Link>
            </p>
          </>
        ) : (
          <>
            <header className="space-y-2 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                {t("auth.accountAccess")}
              </p>
              <h1 className="text-3xl font-semibold text-[#2D2A26]">{t(headingKey)}</h1>
              {descriptionKey ? (
                <p className="text-sm text-[#6B635B]">{t(descriptionKey)}</p>
              ) : null}
            </header>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              <label className="block text-sm text-[#2D2A26]">
                {t("auth.newPassword")}
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  className={inputClass}
                />
              </label>

              <label className="block text-sm text-[#2D2A26]">
                {t("auth.confirmPassword")}
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className={inputClass}
                />
              </label>

              {error ? (
                <p className="rounded-xl border border-[#B34A3C]/30 bg-[#B34A3C]/10 px-3 py-2 text-sm text-[#B34A3C]">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? t("auth.savingPassword") : t("auth.savePassword")}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm">
          <Link href="/sign-in" className="text-[#1F6F78] hover:underline">
            {t("auth.backToSignIn")}
          </Link>
        </p>
      </main>
    </div>
  );
};

export default SetPasswordForm;
