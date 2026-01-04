"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

const SignInPage = () => {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/trips";
  const authError = searchParams.get("error");
  const formatAuthError = (code?: string | null) => {
    switch (code) {
      case "INVALID_CREDENTIALS":
      case "CredentialsSignin":
        return "Invalid email or password.";
      case "ACCOUNT_INACTIVE":
        return "Your account is inactive. Contact an admin.";
      case "ACCOUNT_NOT_FOUND":
        return "Account not found or has been removed.";
      default:
        return code ? "Unable to sign in. Please try again." : null;
    }
  };
  const authErrorMessage = formatAuthError(authError);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setError("Email and password are required.");
      setSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl,
    });

    if (!result) {
      setError("Unable to sign in. Please try again.");
      setSubmitting(false);
      return;
    }

    if (result.error) {
      setError(formatAuthError(result.error));
      setSubmitting(false);
      return;
    }

    router.push(result.url ?? callbackUrl);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF7F1] px-6">
      <main className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        <header className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
            Account Access
          </p>
          <h1 className="text-3xl font-semibold text-[#2D2A26]">Sign in</h1>
          <p className="text-sm text-[#6B635B]">
            Use your account to access the trips you have permission to view.
          </p>
        </header>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-[#2D2A26]">
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
              placeholder="you@example.com"
            />
          </label>

          <label className="block text-sm text-[#2D2A26]">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
              placeholder="••••••••"
            />
          </label>

          {error ?? authErrorMessage ? (
            <p className="rounded-xl border border-[#B34A3C]/30 bg-[#B34A3C]/10 px-3 py-2 text-sm text-[#B34A3C]">
              {error ?? authErrorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </main>
    </div>
  );
};

export default SignInPage;
