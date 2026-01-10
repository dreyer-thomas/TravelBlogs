"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslation } from "../../utils/use-translation";

type FieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  form?: string;
};

type FormValues = {
  currentPassword: string;
  newPassword: string;
};

type ChangePasswordFormProps = {
  userId: string;
  userEmail: string;
  callbackUrl: string;
  mustChangePassword: boolean;
};

const getErrors = (values: FormValues, t: (key: string) => string) => {
  const nextErrors: FieldErrors = {};

  if (!values.currentPassword.trim()) {
    nextErrors.currentPassword = t('account.currentPasswordRequired');
  }

  if (!values.newPassword.trim()) {
    nextErrors.newPassword = t('account.newPasswordRequired');
  } else if (values.newPassword.trim().length < 8) {
    nextErrors.newPassword = t('account.passwordMinLength');
  }

  return nextErrors;
};

const ChangePasswordForm = ({
  userId,
  userEmail,
  callbackUrl,
  mustChangePassword,
}: ChangePasswordFormProps) => {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field: keyof FormValues, value: string) => {
    const nextValues: FormValues = {
      currentPassword:
        field === "currentPassword" ? value : currentPassword,
      newPassword: field === "newPassword" ? value : newPassword,
    };

    setErrors({ ...getErrors(nextValues, t) });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    const nextErrors = getErrors({ currentPassword, newPassword }, t);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/users/${userId}/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setErrors({
          form: result.error?.message ?? t('account.updatePasswordError'),
        });
        setSubmitting(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        redirect: false,
        email: userEmail,
        password: newPassword,
        callbackUrl,
      });

      if (!signInResult || signInResult.error) {
        setErrors({
          form: t('account.passwordUpdatedSessionError'),
        });
        setSubmitting(false);
        router.push(
          `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        );
        return;
      }

      router.push(signInResult.url ?? callbackUrl);
    } catch {
      setErrors({
        form: t('account.updatePasswordError'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      {mustChangePassword ? (
        <p className="rounded-xl border border-[#B34A3C]/20 bg-[#B34A3C]/10 px-3 py-2 text-sm text-[#B34A3C]">
          {t('account.temporaryPasswordMustUpdate')}
        </p>
      ) : null}

      <label className="block text-sm text-[#2D2A26]">
        {t('account.currentPassword')}
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => {
            const nextValue = event.target.value;
            setCurrentPassword(nextValue);
            updateField("currentPassword", nextValue);
          }}
          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
          placeholder={t('account.placeholderPassword')}
        />
        {errors.currentPassword ? (
          <p className="mt-2 text-xs text-[#B34A3C]">
            {errors.currentPassword}
          </p>
        ) : null}
      </label>

      <label className="block text-sm text-[#2D2A26]">
        {t('account.newPassword')}
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => {
            const nextValue = event.target.value;
            setNewPassword(nextValue);
            updateField("newPassword", nextValue);
          }}
          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
          placeholder={t('account.placeholderNewPassword')}
        />
        {errors.newPassword ? (
          <p className="mt-2 text-xs text-[#B34A3C]">
            {errors.newPassword}
          </p>
        ) : null}
      </label>

      {errors.form ? (
        <p className="rounded-xl border border-[#B34A3C]/30 bg-[#B34A3C]/10 px-3 py-2 text-sm text-[#B34A3C]">
          {errors.form}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? t('account.updatingPassword') : t('account.changePassword')}
      </button>
    </form>
  );
};

export default ChangePasswordForm;
