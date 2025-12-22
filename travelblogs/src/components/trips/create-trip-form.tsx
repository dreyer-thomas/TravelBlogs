"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FieldErrors = {
  title?: string;
  startDate?: string;
  endDate?: string;
  coverImageUrl?: string;
  form?: string;
};

type FormValues = {
  title: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string;
};

const getErrors = (values: FormValues) => {
  const nextErrors: FieldErrors = {};

  if (!values.title.trim()) {
    nextErrors.title = "Title is required.";
  }

  if (!values.startDate) {
    nextErrors.startDate = "Start date is required.";
  }

  if (!values.endDate) {
    nextErrors.endDate = "End date is required.";
  }

  if (values.startDate && values.endDate) {
    const start = new Date(values.startDate);
    const end = new Date(values.endDate);
    if (start > end) {
      nextErrors.endDate = "End date must be after the start date.";
    }
  }

  if (values.coverImageUrl.trim() && !values.coverImageUrl.startsWith("http")) {
    nextErrors.coverImageUrl = "Cover image must be a valid URL.";
  }

  return nextErrors;
};

const CreateTripForm = () => {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field: keyof FormValues, value: string) => {
    const nextValues: FormValues = {
      title: field === "title" ? value : title,
      startDate: field === "startDate" ? value : startDate,
      endDate: field === "endDate" ? value : endDate,
      coverImageUrl: field === "coverImageUrl" ? value : coverImageUrl,
    };

    setErrors({ ...getErrors(nextValues) });
  };

  const hasFieldErrors = Boolean(
    errors.title || errors.startDate || errors.endDate || errors.coverImageUrl,
  );
  const canSubmit = Boolean(
    title.trim() && startDate && endDate && !hasFieldErrors && !submitting,
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    const nextErrors = getErrors({ title, startDate, endDate, coverImageUrl });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);

    const payload = {
      title: title.trim(),
      startDate,
      endDate,
      coverImageUrl: coverImageUrl.trim() || undefined,
    };

    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setErrors({
          form: result.error?.message ?? "Unable to create trip. Please try again.",
        });
        setSubmitting(false);
        return;
      }

      router.push(`/trips/${result.data.id}`);
    } catch {
      setErrors({
        form: "Unable to create trip. Please try again.",
      });
      setSubmitting(false);
    }
  };

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm text-[#2D2A26]">
        Trip title
        <input
          name="title"
          type="text"
          value={title}
          onChange={(event) => {
            const nextValue = event.target.value;
            setTitle(nextValue);
            updateField("title", nextValue);
          }}
          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
          placeholder="Spring in Kyoto"
        />
        {errors.title ? (
          <p className="mt-2 text-xs text-[#B34A3C]">{errors.title}</p>
        ) : null}
      </label>

      <label className="block text-sm text-[#2D2A26]">
        Start date
        <input
          name="startDate"
          type="date"
          value={startDate}
          onChange={(event) => {
            const nextValue = event.target.value;
            setStartDate(nextValue);
            updateField("startDate", nextValue);
          }}
          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
        />
        {errors.startDate ? (
          <p className="mt-2 text-xs text-[#B34A3C]">{errors.startDate}</p>
        ) : null}
      </label>

      <label className="block text-sm text-[#2D2A26]">
        End date
        <input
          name="endDate"
          type="date"
          value={endDate}
          onChange={(event) => {
            const nextValue = event.target.value;
            setEndDate(nextValue);
            updateField("endDate", nextValue);
          }}
          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
        />
        {errors.endDate ? (
          <p className="mt-2 text-xs text-[#B34A3C]">{errors.endDate}</p>
        ) : null}
      </label>

      <label className="block text-sm text-[#2D2A26]">
        Cover image URL (optional)
        <input
          name="coverImageUrl"
          type="url"
          value={coverImageUrl}
          onChange={(event) => {
            const nextValue = event.target.value;
            setCoverImageUrl(nextValue);
            updateField("coverImageUrl", nextValue);
          }}
          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
          placeholder="https://"
        />
        {errors.coverImageUrl ? (
          <p className="mt-2 text-xs text-[#B34A3C]">{errors.coverImageUrl}</p>
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
        {submitting ? "Creating trip..." : "Create trip"}
      </button>
    </form>
  );
};

export default CreateTripForm;
