"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../utils/use-translation";

type FieldErrors = {
  email?: string;
  name?: string;
  role?: string;
  password?: string;
  form?: string;
};

type FormValues = {
  email: string;
  name: string;
  role: "creator" | "administrator" | "viewer";
  password: string;
};

const getRoleOptions = (t: (key: string) => string): Array<{ value: FormValues["role"]; label: string }> => [
  { value: "creator", label: t('admin.creator') },
  { value: "administrator", label: t('admin.administrator') },
  { value: "viewer", label: t('admin.viewer') },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getErrors = (values: FormValues, t: (key: string) => string) => {
  const nextErrors: FieldErrors = {};

  if (!values.email.trim()) {
    nextErrors.email = t("admin.emailRequired");
  } else if (!emailPattern.test(values.email.trim())) {
    nextErrors.email = t("admin.emailValid");
  }

  if (!values.name.trim()) {
    nextErrors.name = t("admin.nameRequired");
  }

  if (!values.role) {
    nextErrors.role = t("admin.roleRequired");
  }

  if (!values.password.trim()) {
    nextErrors.password = t("admin.passwordRequired");
  } else if (values.password.trim().length < 8) {
    nextErrors.password = t("admin.passwordMinLength");
  }

  return nextErrors;
};

const UserForm = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<FormValues["role"]>("viewer");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const roleOptions = getRoleOptions(t);

  const updateField = (field: keyof FormValues, value: string) => {
    const nextValues: FormValues = {
      email: field === "email" ? value : email,
      name: field === "name" ? value : name,
      role: field === "role" ? (value as FormValues["role"]) : role,
      password: field === "password" ? value : password,
    };

    setErrors({ ...getErrors(nextValues, t) });
  };

  const hasFieldErrors = Boolean(
    errors.email || errors.name || errors.role || errors.password,
  );
  const canSubmit = Boolean(
    email.trim() &&
      name.trim() &&
      password.trim() &&
      !hasFieldErrors &&
      !submitting,
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    const nextErrors = getErrors({ email, name, role, password }, t);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          role,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setErrors({
          form: result.error?.message ?? t("admin.createUserError"),
        });
        setSubmitting(false);
        return;
      }

      setEmail("");
      setName("");
      setRole("viewer");
      setPassword("");
      router.refresh();
    } catch {
      setErrors({
        form: t("admin.createUserError"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm text-[#2D2A26]">
        {t('admin.emailAddress')}
        <input
          name="email"
          type="email"
          value={email}
          onChange={(event) => {
            const nextValue = event.target.value;
            setEmail(nextValue);
            updateField("email", nextValue);
          }}
          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
          placeholder={t("admin.placeholderEmail")}
        />
        {errors.email ? (
          <p className="mt-2 text-xs text-[#B34A3C]">{errors.email}</p>
        ) : null}
      </label>

      <label className="block text-sm text-[#2D2A26]">
        {t('admin.fullName')}
        <input
          name="name"
          type="text"
          value={name}
          onChange={(event) => {
            const nextValue = event.target.value;
            setName(nextValue);
            updateField("name", nextValue);
          }}
          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
          placeholder={t("admin.placeholderName")}
        />
        {errors.name ? (
          <p className="mt-2 text-xs text-[#B34A3C]">{errors.name}</p>
        ) : null}
      </label>

      <label className="block text-sm text-[#2D2A26]">
        {t('admin.role')}
        <select
          name="role"
          value={role}
          onChange={(event) => {
            const nextValue = event.target.value;
            setRole(nextValue as FormValues["role"]);
            updateField("role", nextValue);
          }}
          className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
        >
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.role ? (
          <p className="mt-2 text-xs text-[#B34A3C]">{errors.role}</p>
        ) : null}
      </label>

      <label className="block text-sm text-[#2D2A26]">
        {t('admin.temporaryPassword')}
        <input
          name="password"
          type="password"
          value={password}
          onChange={(event) => {
            const nextValue = event.target.value;
            setPassword(nextValue);
            updateField("password", nextValue);
          }}
          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
          placeholder={t('admin.atLeast8Characters')}
        />
        {errors.password ? (
          <p className="mt-2 text-xs text-[#B34A3C]">{errors.password}</p>
        ) : null}
      </label>

      {errors.form ? (
        <p className="rounded-xl border border-[#B34A3C]/30 bg-[#B34A3C]/10 px-3 py-2 text-sm text-[#B34A3C]">
          {errors.form}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? t('admin.creatingUser') : t('admin.createUser')}
      </button>
    </form>
  );
};

export default UserForm;
