"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

const roleOptions: Array<{ value: FormValues["role"]; label: string }> = [
  { value: "creator", label: "Creator" },
  { value: "administrator", label: "Administrator" },
  { value: "viewer", label: "Viewer" },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getErrors = (values: FormValues) => {
  const nextErrors: FieldErrors = {};

  if (!values.email.trim()) {
    nextErrors.email = "Email is required.";
  } else if (!emailPattern.test(values.email.trim())) {
    nextErrors.email = "Email must be valid.";
  }

  if (!values.name.trim()) {
    nextErrors.name = "Name is required.";
  }

  if (!values.role) {
    nextErrors.role = "Role is required.";
  }

  if (!values.password.trim()) {
    nextErrors.password = "Password is required.";
  } else if (values.password.trim().length < 8) {
    nextErrors.password = "Password must be at least 8 characters.";
  }

  return nextErrors;
};

const UserForm = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<FormValues["role"]>("viewer");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field: keyof FormValues, value: string) => {
    const nextValues: FormValues = {
      email: field === "email" ? value : email,
      name: field === "name" ? value : name,
      role: field === "role" ? (value as FormValues["role"]) : role,
      password: field === "password" ? value : password,
    };

    setErrors({ ...getErrors(nextValues) });
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

    const nextErrors = getErrors({ email, name, role, password });
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
          form: result.error?.message ?? "Unable to create the user.",
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
        form: "Unable to create the user.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm text-[#2D2A26]">
        Email address
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
          placeholder="viewer@example.com"
        />
        {errors.email ? (
          <p className="mt-2 text-xs text-[#B34A3C]">{errors.email}</p>
        ) : null}
      </label>

      <label className="block text-sm text-[#2D2A26]">
        Full name
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
          placeholder="Avery Chen"
        />
        {errors.name ? (
          <p className="mt-2 text-xs text-[#B34A3C]">{errors.name}</p>
        ) : null}
      </label>

      <label className="block text-sm text-[#2D2A26]">
        Role
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
        Temporary password
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
          placeholder="At least 8 characters"
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
        {submitting ? "Creating user..." : "Create user"}
      </button>
    </form>
  );
};

export default UserForm;
