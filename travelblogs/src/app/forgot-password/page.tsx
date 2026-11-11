"use client";

import Link from "next/link";
import { useState } from "react";

import { useTranslation } from "../../utils/use-translation";

const inputClass =
  "mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20";

const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    if (!email) {
      setError(t("auth.resetEmailRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/password-resets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSent(true);
        return;
      }

      setError(
        response.status === 400
          ? t("auth.resetEmailInvalid")
          : t("auth.resetRequestFailed"),
      );
    } catch {
      setError(t("auth.resetRequestFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF7F1] px-6">
      <main className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        <header className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
            {t("auth.accountAccess")}
          </p>
          <h1 className="text-3xl font-semibold text-[#2D2A26]">
            {t("auth.forgotPasswordTitle")}
          </h1>
          {sent ? null : (
            <p className="text-sm text-[#6B635B]">
              {t("auth.forgotPasswordDescription")}
            </p>
          )}
        </header>

        {sent ? (
          <p
            role="status"
            className="mt-6 rounded-xl border border-[#1F6F78]/30 bg-[#1F6F78]/10 px-3 py-2 text-sm text-[#1F6F78]"
          >
            {t("auth.resetLinkSent")}
          </p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <label className="block text-sm text-[#2D2A26]">
              {t("auth.email")}
              <input
                name="email"
                type="email"
                autoComplete="email"
                className={inputClass}
                placeholder={t("auth.emailPlaceholder")}
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
              {submitting ? t("auth.sendingResetLink") : t("auth.sendResetLink")}
            </button>
          </form>
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

export default ForgotPasswordPage;
