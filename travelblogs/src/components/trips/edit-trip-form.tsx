"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  COVER_IMAGE_ALLOWED_MIME_TYPES,
  createCoverPreviewUrl,
  validateCoverImageFile,
} from "../../utils/media";
import { uploadCoverImage } from "../../utils/cover-upload";
import { useTranslation } from "../../utils/use-translation";

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

type EditTripFormProps = {
  tripId: string;
  initialValues: FormValues;
};

const getErrors = (values: FormValues, t: (key: string) => string) => {
  const nextErrors: FieldErrors = {};

  if (!values.title.trim()) {
    nextErrors.title = t("trips.titleRequired");
  }

  if (!values.startDate) {
    nextErrors.startDate = t("trips.startDateRequired");
  }

  if (!values.endDate) {
    nextErrors.endDate = t("trips.endDateRequired");
  }

  if (values.startDate && values.endDate) {
    const start = new Date(values.startDate);
    const end = new Date(values.endDate);
    if (start > end) {
      nextErrors.endDate = t("trips.endDateAfterStart");
    }
  }

  return nextErrors;
};

const EditTripForm = ({ tripId, initialValues }: EditTripFormProps) => {
  const router = useRouter();
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialValues.title);
  const [startDate, setStartDate] = useState(initialValues.startDate);
  const [endDate, setEndDate] = useState(initialValues.endDate);
  const [coverImageUrl, setCoverImageUrl] = useState(
    initialValues.coverImageUrl,
  );
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(
    initialValues.coverImageUrl ? initialValues.coverImageUrl : null,
  );
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);

  const updateField = (field: keyof FormValues, value: string) => {
    const nextValues: FormValues = {
      title: field === "title" ? value : title,
      startDate: field === "startDate" ? value : startDate,
      endDate: field === "endDate" ? value : endDate,
      coverImageUrl: field === "coverImageUrl" ? value : coverImageUrl,
    };

    setErrors({ ...getErrors(nextValues, t) });
  };

  const handleCoverChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setErrors((prev) => ({ ...prev, coverImageUrl: undefined }));

    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setCoverPreviewUrl(coverImageUrl ? coverImageUrl : null);
      return;
    }

    const validationError = validateCoverImageFile(file, t);
    if (validationError) {
      setErrors((prev) => ({ ...prev, coverImageUrl: validationError }));
      return;
    }

    setCoverPreviewUrl(createCoverPreviewUrl(file));
    setCoverUploading(true);
    setCoverUploadProgress(0);

    try {
      const uploadedUrl = await uploadCoverImage(file, {
        onProgress: setCoverUploadProgress,
        translate: t,
      });
      setCoverImageUrl(uploadedUrl);
      setCoverUploadProgress(100);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        coverImageUrl:
          error instanceof Error
            ? error.message
            : t("trips.coverUploadError"),
      }));
      setCoverUploadProgress(0);
    } finally {
      setCoverUploading(false);
    }
  };

  const hasFieldErrors = Boolean(
    errors.title || errors.startDate || errors.endDate || errors.coverImageUrl,
  );
  const canSubmit = Boolean(
    title.trim() &&
      startDate &&
      endDate &&
      !hasFieldErrors &&
      !submitting &&
      !coverUploading,
  );

  const isOptimizedImage = (url: string) => url.startsWith("/");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    const nextErrors = getErrors({ title, startDate, endDate, coverImageUrl }, t);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);

    const payload = {
      title: title.trim(),
      startDate,
      endDate,
      coverImageUrl: coverImageUrl.trim() === "" ? "" : coverImageUrl.trim(),
    };

    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setErrors({
          form: result.error?.message ?? t("trips.updateTripError"),
        });
        setSubmitting(false);
        return;
      }

      router.push(`/trips/${tripId}`);
      router.refresh();
    } catch {
      setErrors({
        form: t("trips.updateTripError"),
      });
      setSubmitting(false);
    }
  };

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm text-[#2D2A26]">
        {t('trips.tripTitle')}
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
          placeholder={t("trips.placeholderTitle")}
        />
        {errors.title ? (
          <p className="mt-2 text-xs text-[#B34A3C]">{errors.title}</p>
        ) : null}
      </label>

      <label className="block text-sm text-[#2D2A26]">
        {t('trips.startDate')}
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
        {t('trips.endDate')}
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
        {t('trips.coverImageOptional')}
        <input
          name="coverImage"
          type="file"
          accept={COVER_IMAGE_ALLOWED_MIME_TYPES.join(",")}
          onChange={handleCoverChange}
          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
        />
        <p className="mt-2 text-xs text-[#6B635B]">
          {t("trips.fileFormatHint")}
        </p>
        {coverPreviewUrl ? (
          <div className="mt-3 overflow-hidden rounded-xl border border-black/10 bg-[#F2ECE3]">
            <Image
              src={coverPreviewUrl}
              alt={t("trips.coverPreviewAlt")}
              width={1200}
              height={720}
              className="h-40 w-full object-cover"
              unoptimized={!isOptimizedImage(coverPreviewUrl)}
            />
          </div>
        ) : null}
        {coverUploading ? (
          <div className="mt-2 text-xs text-[#6B635B]">
            {t("trips.uploading")} {coverUploadProgress}%
          </div>
        ) : null}
        {errors.coverImageUrl ? (
          <p className="mt-2 text-xs text-[#B34A3C]">
            {errors.coverImageUrl}
          </p>
        ) : null}
      </label>

      {errors.form ? (
        <p className="rounded-xl border border-[#B34A3C]/30 bg-[#B34A3C]/10 px-3 py-2 text-sm text-[#B34A3C]">
          {errors.form}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-[#1F6F78] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? `${t('trips.saveChanges')}...` : t('trips.saveChanges')}
        </button>
        <button
          type="button"
          className="text-sm font-semibold text-[#6B635B] hover:text-[#2D2A26]"
          onClick={() => router.push(`/trips/${tripId}`)}
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
};

export default EditTripForm;
