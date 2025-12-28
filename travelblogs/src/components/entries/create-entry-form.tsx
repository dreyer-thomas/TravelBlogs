"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

import {
  createEntryPreviewUrl,
  ENTRY_MEDIA_ALLOWED_MIME_TYPES,
  uploadEntryMedia,
  validateEntryMediaFile,
} from "../../utils/entry-media";
import { extractInlineImageUrls } from "../../utils/entry-content";

type FieldErrors = {
  date?: string;
  text?: string;
  media?: string;
  form?: string;
};

type CreatedEntryMedia = {
  id: string;
  url: string;
  createdAt: string;
};

type CreatedEntry = {
  id: string;
  tripId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  media: CreatedEntryMedia[];
};

type CreateEntryFormProps = {
  tripId: string;
  onEntryCreated?: (entry: CreatedEntry) => void;
};

const isValidEntryDate = (value: string) =>
  Boolean(value) && !Number.isNaN(Date.parse(value));

const getErrors = (
  entryDate: string,
  text: string,
  mediaUrls: string[],
  inlineImageUrls: string[],
) => {
  const nextErrors: FieldErrors = {};

  if (!isValidEntryDate(entryDate)) {
    nextErrors.date = "Entry date is required.";
  }

  if (!text.trim()) {
    nextErrors.text = "Entry text is required.";
  }

  if (mediaUrls.length === 0 && inlineImageUrls.length === 0) {
    nextErrors.media =
      "Add at least one photo in the text or in the photos section.";
  }

  return nextErrors;
};

const CreateEntryForm = ({ tripId, onEntryCreated }: CreateEntryFormProps) => {
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [text, setText] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaUploadProgress, setMediaUploadProgress] = useState(0);
  const [inlineUploading, setInlineUploading] = useState(false);
  const [inlineUploadProgress, setInlineUploadProgress] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const inlineImageUrls = useMemo(
    () => extractInlineImageUrls(text),
    [text],
  );

  useEffect(() => {
    return () => {
      mediaPreviews.forEach((preview) => {
        if (preview.startsWith("blob:")) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [mediaPreviews]);

  const updateText = (value: string) => {
    setText(value);
    setErrors((prev) => ({
      ...prev,
      text: value.trim() ? undefined : "Entry text is required.",
      media:
        value.trim() && extractInlineImageUrls(value).length > 0
          ? undefined
          : prev.media,
    }));
  };

  const updateEntryDate = (value: string) => {
    setEntryDate(value);
    setErrors((prev) => ({
      ...prev,
      date: isValidEntryDate(value) ? undefined : "Entry date is required.",
    }));
  };

  const handleDateBlur = () => {
    if (!isValidEntryDate(entryDate)) {
      setErrors((prev) => ({
        ...prev,
        date: "Entry date is required.",
      }));
    }
  };

  const handleTextBlur = () => {
    if (!text.trim()) {
      setErrors((prev) => ({
        ...prev,
        text: "Entry text is required.",
      }));
    }
  };

  const handleMediaChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setErrors((prev) => ({ ...prev, media: undefined }));
    setMediaUploadProgress(0);

    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      setMediaUrls([]);
      setMediaPreviews([]);
      setErrors((prev) => ({
        ...prev,
        media:
          inlineImageUrls.length === 0
            ? "Add at least one photo in the text or in the photos section."
            : undefined,
      }));
      return;
    }

    const validationError =
      files.map((file) => validateEntryMediaFile(file)).find(Boolean) ?? null;
    if (validationError) {
      setErrors((prev) => ({
        ...prev,
        media: validationError,
      }));
      event.target.value = "";
      return;
    }

    const nextPreviews = files.map((file) => createEntryPreviewUrl(file));
    setMediaPreviews(nextPreviews);
    setMediaUploading(true);
    setMediaUploadProgress(0);

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const url = await uploadEntryMedia(file, {
          onProgress: setMediaUploadProgress,
        });
        uploadedUrls.push(url);
      }

      setMediaUrls(uploadedUrls);
      setMediaUploadProgress(100);
      setErrors((prev) => ({ ...prev, media: undefined }));
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        media:
          error instanceof Error
            ? error.message
            : "Unable to upload media files.",
      }));
      setMediaUrls([]);
      setMediaPreviews([]);
      setMediaUploadProgress(0);
    } finally {
      setMediaUploading(false);
    }
  };

  const handleMediaBlur = () => {
    if (mediaUrls.length === 0 && inlineImageUrls.length === 0) {
      setErrors((prev) => ({
        ...prev,
        media: "Add at least one photo in the text or in the photos section.",
      }));
    }
  };

  const insertInlineImages = (urls: string[]) => {
    if (urls.length === 0) {
      return;
    }

    setText((prev) => {
      const textarea = textAreaRef.current;
      const selectionStart = textarea?.selectionStart ?? prev.length;
      const selectionEnd = textarea?.selectionEnd ?? prev.length;
      const before = prev.slice(0, selectionStart);
      const after = prev.slice(selectionEnd);
      const snippet = urls.map((url) => `![Photo](${url})`).join("\n");
      const needsLeadingBreak = before.length > 0 && !before.endsWith("\n");
      const needsTrailingBreak = after.length > 0 && !after.startsWith("\n");
      const formattedSnippet = `${needsLeadingBreak ? "\n" : ""}${snippet}${needsTrailingBreak ? "\n" : ""}`;
      const nextText = before + formattedSnippet + after;

      requestAnimationFrame(() => {
        if (textarea) {
          const cursor = selectionStart + formattedSnippet.length;
          textarea.focus();
          textarea.setSelectionRange(cursor, cursor);
        }
      });

      return nextText;
    });

    setErrors((prev) => ({ ...prev, media: undefined, text: undefined }));
  };

  const handleInlineMediaChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setErrors((prev) => ({ ...prev, media: undefined }));
    setInlineUploadProgress(0);

    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const validationError =
      files.map((file) => validateEntryMediaFile(file)).find(Boolean) ?? null;
    if (validationError) {
      setErrors((prev) => ({
        ...prev,
        media: validationError,
      }));
      return;
    }

    setInlineUploading(true);
    setInlineUploadProgress(0);

    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const url = await uploadEntryMedia(file, {
          onProgress: setInlineUploadProgress,
        });
        uploadedUrls.push(url);
      }

      insertInlineImages(uploadedUrls);
      setInlineUploadProgress(100);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        media:
          error instanceof Error
            ? error.message
            : "Unable to upload inline photos.",
      }));
      setInlineUploadProgress(0);
    } finally {
      setInlineUploading(false);
      event.target.value = "";
    }
  };

  const hasFieldErrors = Boolean(errors.date || errors.text || errors.media);
  const canSubmit = Boolean(
    isValidEntryDate(entryDate) &&
      text.trim() &&
      (mediaUrls.length > 0 || inlineImageUrls.length > 0) &&
      !hasFieldErrors &&
      !submitting &&
      !mediaUploading &&
      !inlineUploading,
  );

  const previewLabel = useMemo(() => {
    if (mediaPreviews.length === 0) {
      return "";
    }
    if (mediaPreviews.length === 1) {
      return "1 media preview";
    }
    return `${mediaPreviews.length} media previews`;
  }, [mediaPreviews.length]);

  const isOptimizedImage = (url: string) => url.startsWith("/");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    const nextErrors = getErrors(
      entryDate,
      text,
      mediaUrls,
      inlineImageUrls,
    );
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tripId,
          entryDate,
          text: text.trim(),
          mediaUrls,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || result?.error) {
        setErrors({
          form:
            result?.error?.message ??
            "Unable to create entry. Please try again.",
        });
        setSubmitting(false);
        return;
      }

      setText("");
      setMediaUrls([]);
      setMediaPreviews([]);
      setMediaUploadProgress(0);
      setInlineUploadProgress(0);
      setEntryDate(new Date().toISOString().slice(0, 10));
      onEntryCreated?.(result.data as CreatedEntry);
      setSubmitting(false);
    } catch {
      setErrors({
        form: "Unable to create entry. Please try again.",
      });
      setSubmitting(false);
    }
  };

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm text-[#2D2A26]">
        Entry date
        <input
          type="date"
          name="entryDate"
          value={entryDate}
          onChange={(event) => updateEntryDate(event.target.value)}
          onBlur={handleDateBlur}
          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
        />
        {errors.date ? (
          <p className="mt-2 text-xs text-[#B34A3C]">{errors.date}</p>
        ) : null}
      </label>

      <label className="block text-sm text-[#2D2A26]">
        Entry text
        <textarea
          name="text"
          rows={4}
          value={text}
          onChange={(event) => updateText(event.target.value)}
          onBlur={handleTextBlur}
          ref={textAreaRef}
          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
          placeholder="Share what happened today..."
        />
        {errors.text ? (
          <p className="mt-2 text-xs text-[#B34A3C]">{errors.text}</p>
        ) : null}
      </label>

      <div className="space-y-2 rounded-xl border border-dashed border-black/10 bg-[#F9F5EF] p-3">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B635B]">
          Inline photos
          <input
            name="inlineMedia"
            type="file"
            accept={ENTRY_MEDIA_ALLOWED_MIME_TYPES.join(",")}
            multiple
            onChange={handleInlineMediaChange}
            className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
          />
        </label>
        <p className="text-xs text-[#6B635B]">
          Add photos right into your story so they appear between text
          paragraphs.
        </p>
        {inlineUploading ? (
          <div className="text-xs text-[#6B635B]">
            Uploading inline photo… {inlineUploadProgress}%
          </div>
        ) : null}
        {inlineImageUrls.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {inlineImageUrls.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="relative h-20 overflow-hidden rounded-xl border border-black/10 bg-[#F2ECE3]"
              >
                <Image
                  src={url}
                  alt={`Inline photo ${index + 1}`}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover"
                  loading="lazy"
                  unoptimized={!isOptimizedImage(url)}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <label className="block text-sm text-[#2D2A26]">
        Photos section
        <input
          name="media"
          type="file"
          accept={ENTRY_MEDIA_ALLOWED_MIME_TYPES.join(",")}
          multiple
          onChange={handleMediaChange}
          onBlur={handleMediaBlur}
          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
        />
        <p className="mt-2 text-xs text-[#6B635B]">
          JPG, PNG, or WebP up to 5MB each. Add extra photos to the gallery.
        </p>
        {mediaPreviews.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
            {mediaPreviews.map((preview, index) => (
              <div
                key={`${preview}-${index}`}
                className="relative h-28 overflow-hidden rounded-xl border border-black/10 bg-[#F2ECE3]"
              >
                <Image
                  src={preview}
                  alt={`Media preview ${index + 1}`}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover"
                  loading="lazy"
                  unoptimized={!isOptimizedImage(preview)}
                />
              </div>
            ))}
          </div>
        ) : null}
        {mediaUploading ? (
          <div className="mt-2 text-xs text-[#6B635B]">
            Uploading… {mediaUploadProgress}%
          </div>
        ) : null}
        {errors.media ? (
          <p className="mt-2 text-xs text-[#B34A3C]">{errors.media}</p>
        ) : null}
        {previewLabel ? (
          <span className="sr-only">{previewLabel}</span>
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
        {submitting ? "Adding entry..." : "Add entry"}
      </button>
    </form>
  );
};

export default CreateEntryForm;
