"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  createEntryPreviewUrl,
  ENTRY_MEDIA_ALLOWED_MIME_TYPES,
  uploadEntryMedia,
  validateEntryMediaFile,
} from "../../utils/entry-media";
import { extractInlineImageUrls } from "../../utils/entry-content";

type FieldErrors = {
  text?: string;
  media?: string;
  form?: string;
};

type EditEntryFormProps = {
  tripId: string;
  entryId: string;
  initialText: string;
  initialMediaUrls: string[];
};

const getErrors = (
  text: string,
  mediaUrls: string[],
  inlineImageUrls: string[],
) => {
  const nextErrors: FieldErrors = {};

  if (!text.trim()) {
    nextErrors.text = "Entry text is required.";
  }

  if (mediaUrls.length === 0 && inlineImageUrls.length === 0) {
    nextErrors.media =
      "Add at least one photo in the text or in the photos section.";
  }

  return nextErrors;
};

const EditEntryForm = ({
  tripId,
  entryId,
  initialText,
  initialMediaUrls,
}: EditEntryFormProps) => {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [mediaUrls, setMediaUrls] = useState<string[]>(initialMediaUrls);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>(initialMediaUrls);
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
    setMediaPreviews((prev) => [...prev, ...nextPreviews]);
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

      setMediaUrls((prev) => [...prev, ...uploadedUrls]);
      setMediaPreviews((prev) => {
        const kept = prev.filter((preview) => !preview.startsWith("blob:"));
        return [...kept, ...uploadedUrls];
      });
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
      setMediaUrls((prev) => prev);
      setMediaPreviews((prev) => prev.filter((preview) => !preview.startsWith("blob:")));
      setMediaUploadProgress(0);
    } finally {
      setMediaUploading(false);
      event.target.value = "";
    }
  };

  const handleRemoveMedia = (url: string) => {
    setMediaUrls((prev) => prev.filter((item) => item !== url));
    setMediaPreviews((prev) => prev.filter((item) => item !== url));
    if (mediaUrls.length <= 1 && inlineImageUrls.length === 0) {
      setErrors((prev) => ({
        ...prev,
        media: "Add at least one photo in the text or in the photos section.",
      }));
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

  const hasFieldErrors = Boolean(errors.text || errors.media);
  const canSubmit = Boolean(
    text.trim() &&
      (mediaUrls.length > 0 || inlineImageUrls.length > 0) &&
      !hasFieldErrors &&
      !submitting &&
      !mediaUploading &&
      !inlineUploading,
  );

  const isOptimizedImage = (url: string) => url.startsWith("/");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    const nextErrors = getErrors(text, mediaUrls, inlineImageUrls);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/entries/${entryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
          mediaUrls,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || result?.error) {
        const message =
          result?.error?.message ?? "Unable to update entry. Please try again.";
        if (result?.error?.code === "VALIDATION_ERROR") {
          if (message === "Entry text is required.") {
            setErrors({ text: message });
          } else if (
            message === "At least one photo is required." ||
            message === "Media URL is required."
          ) {
            setErrors({ media: message });
          } else {
            setErrors({ form: message });
          }
        } else {
          setErrors({ form: message });
        }
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      router.push(`/trips/${tripId}/entries/${entryId}`);
      router.refresh();
    } catch {
      setErrors({
        form: "Unable to update entry. Please try again.",
      });
      setSubmitting(false);
    }
  };

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm text-[#2D2A26]">
        Entry text
        <textarea
          name="text"
          rows={6}
          value={text}
          onChange={(event) => updateText(event.target.value)}
          onBlur={handleTextBlur}
          ref={textAreaRef}
          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
          placeholder="Refine the story..."
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
          Add more photos inline so they appear between paragraphs.
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
          Upload extra photos or remove existing ones from the gallery.
        </p>
        {mediaPreviews.length > 0 ? (
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {mediaPreviews.map((preview) => (
              <div
                key={preview}
                className="group relative h-28 overflow-hidden rounded-xl border border-black/10 bg-[#F2ECE3]"
              >
                <Image
                  src={preview}
                  alt="Entry media preview"
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover"
                  loading="lazy"
                  unoptimized={!isOptimizedImage(preview)}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveMedia(preview)}
                  className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-[#1F6F78] shadow-sm transition hover:bg-white"
                >
                  Remove
                </button>
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
        {submitting ? "Saving updates..." : "Save entry"}
      </button>
    </form>
  );
};

export default EditEntryForm;
