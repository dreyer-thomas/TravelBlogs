"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  createEntryPreviewUrl,
  ENTRY_MEDIA_ALLOWED_MIME_TYPES,
  uploadEntryMediaBatch,
  validateEntryMediaFile,
} from "../../utils/entry-media";
import {
  extractInlineImageUrls,
  insertInlineImageAtCursor,
  removeInlineImageByUrl,
} from "../../utils/entry-content";

type FieldErrors = {
  date?: string;
  title?: string;
  text?: string;
  media?: string;
  form?: string;
};

type UploadStatus = "idle" | "uploading" | "success" | "failed";

type UploadItem = {
  id: string;
  file: File;
  previewUrl?: string;
  status: UploadStatus;
  progress: number;
  message?: string;
  url?: string;
  canRetry: boolean;
};

type EditEntryFormProps = {
  tripId: string;
  entryId: string;
  initialEntryDate: string;
  initialTitle: string;
  initialCoverImageUrl?: string | null;
  initialText: string;
  initialMediaUrls: string[];
};

const isValidEntryDate = (value: string) =>
  Boolean(value) && !Number.isNaN(Date.parse(value));

const maxTitleLength = 80;

const toDateInputValue = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toISOString().slice(0, 10);
};

const getErrors = (
  entryDate: string,
  title: string,
  text: string,
  mediaUrls: string[],
  inlineImageUrls: string[],
) => {
  const nextErrors: FieldErrors = {};

  if (!isValidEntryDate(entryDate)) {
    nextErrors.date = "Entry date is required.";
  }

  if (!title.trim()) {
    nextErrors.title = "Entry title is required.";
  }

  if (!text.trim()) {
    nextErrors.text = "Entry text is required.";
  }

  if (mediaUrls.length === 0 && inlineImageUrls.length === 0) {
    nextErrors.media =
      "Add at least one photo in the library or inline text.";
  }

  return nextErrors;
};

const createFileId = (file: File, index: number, batchId: string) =>
  `${batchId}-${file.name}-${file.size}-${file.lastModified}-${index}`;

const EditEntryForm = ({
  tripId,
  entryId,
  initialEntryDate,
  initialTitle,
  initialCoverImageUrl,
  initialText,
  initialMediaUrls,
}: EditEntryFormProps) => {
  const router = useRouter();
  const [entryDate, setEntryDate] = useState(
    toDateInputValue(initialEntryDate),
  );
  const [title, setTitle] = useState(initialTitle ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(
    initialCoverImageUrl ?? "",
  );
  const [text, setText] = useState(initialText);
  const [mediaUrls, setMediaUrls] = useState<string[]>(initialMediaUrls);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>(initialMediaUrls);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaUploadItems, setMediaUploadItems] = useState<UploadItem[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [hoveredImageUrl, setHoveredImageUrl] = useState<string | null>(null);
  const [cursorSelection, setCursorSelection] = useState({
    start: 0,
    end: 0,
  });

  const inlineImageUrls = useMemo(
    () => extractInlineImageUrls(text),
    [text],
  );
  const availableStoryImages = useMemo(() => {
    const urls = [...mediaUrls, ...inlineImageUrls];
    const seen = new Set<string>();
    return urls.filter((url) => {
      const value = url.trim();
      if (!value || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }, [mediaUrls, inlineImageUrls]);
  const libraryImageUrls = useMemo(() => {
    const urls = [...mediaUrls, ...inlineImageUrls];
    const seen = new Set<string>();
    return urls.filter((url) => {
      const value = url.trim();
      if (!value || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }, [mediaUrls, inlineImageUrls]);
  const selectableImageUrls = useMemo(() => {
    const urls = [...availableStoryImages, ...libraryImageUrls];
    const seen = new Set<string>();
    return urls.filter((url) => {
      const value = url.trim();
      if (!value || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }, [availableStoryImages, libraryImageUrls]);

  useEffect(() => {
    return () => {
      mediaPreviews.forEach((preview) => {
        if (preview.startsWith("blob:")) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [mediaPreviews]);

  useEffect(() => {
    if (coverImageUrl && !selectableImageUrls.includes(coverImageUrl)) {
      setCoverImageUrl("");
    }
  }, [coverImageUrl, selectableImageUrls]);

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

  const updateTitle = (value: string) => {
    setTitle(value);
    setErrors((prev) => ({ ...prev, title: undefined }));
  };

  const handleTitleBlur = () => {
    if (!title.trim()) {
      setErrors((prev) => ({
        ...prev,
        title: "Entry title is required.",
      }));
    }
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

  const updateCursorSelection = () => {
    const textarea = textAreaRef.current;
    if (!textarea) {
      return;
    }
    setCursorSelection({
      start: textarea.selectionStart ?? 0,
      end: textarea.selectionEnd ?? 0,
    });
  };

  const handleMediaChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setErrors((prev) => ({ ...prev, media: undefined }));
    setMediaUploading(false);

    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const batchId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const fileIdMap = new Map<File, string>();
    const invalidItems: UploadItem[] = [];
    const uploadItems: UploadItem[] = [];
    const validFiles: File[] = [];
    const nextPreviews: string[] = [];

    files.forEach((file, index) => {
      const fileId = createFileId(file, index, batchId);
      fileIdMap.set(file, fileId);
      const validationError = validateEntryMediaFile(file);
      if (validationError) {
        invalidItems.push({
          id: fileId,
          file,
          status: "failed",
          progress: 0,
          message: validationError,
          canRetry: false,
        });
        return;
      }

      const previewUrl = createEntryPreviewUrl(file);
      nextPreviews.push(previewUrl);
      validFiles.push(file);
      uploadItems.push({
        id: fileId,
        file,
        previewUrl,
        status: "uploading",
        progress: 0,
        canRetry: true,
      });
    });

    setMediaPreviews((prev) => [...prev, ...nextPreviews]);
    setMediaUploadItems((prev) => [...prev, ...invalidItems, ...uploadItems]);

    if (validFiles.length === 0) {
      event.target.value = "";
      return;
    }

    setMediaUploading(true);

    const result = await uploadEntryMediaBatch(validFiles, {
      getFileId: (file) => fileIdMap.get(file) ?? file.name,
      onFileProgress: (file, progress) => {
        const fileId = fileIdMap.get(file) ?? file.name;
        setMediaUploadItems((prev) =>
          prev.map((item) =>
            item.id === fileId
              ? { ...item, status: "uploading", progress }
              : item,
          ),
        );
      },
    });

    if (result.uploads.length > 0) {
      setMediaUrls((prev) => [
        ...prev,
        ...result.uploads.map((upload) => upload.url),
      ]);
      setMediaPreviews((prev) =>
        prev.map((preview) => {
          const item = uploadItems.find(
            (entry) => entry.previewUrl === preview,
          );
          const upload = item
            ? result.uploads.find((entry) => entry.fileId === item.id)
            : null;
          return upload ? upload.url : preview;
        }),
      );
    }

    setMediaUploadItems((prev) =>
      prev.map((item) => {
        const upload = result.uploads.find(
          (entry) => entry.fileId === item.id,
        );
        if (upload) {
          return {
            ...item,
            status: "success",
            progress: 100,
            url: upload.url,
          };
        }
        const failure = result.failures.find(
          (entry) => entry.fileId === item.id,
        );
        if (failure) {
          return {
            ...item,
            status: "failed",
            progress: 0,
            message: failure.message,
            canRetry: true,
          };
        }
        return item;
      }),
    );
    if (result.failures.length > 0) {
      const failedIds = new Set(result.failures.map((failure) => failure.fileId));
      const failedPreviewUrls = uploadItems
        .filter((item) => item.previewUrl && failedIds.has(item.id))
        .map((item) => item.previewUrl as string);
      if (failedPreviewUrls.length > 0) {
        setMediaPreviews((prev) =>
          prev.filter((preview) => !failedPreviewUrls.includes(preview)),
        );
      }
    }

    setMediaUploading(false);
    event.target.value = "";
  };

  const handleMediaBlur = () => {
    if (mediaUrls.length === 0 && inlineImageUrls.length === 0) {
      setErrors((prev) => ({
        ...prev,
        media: "Add at least one photo in the library or inline text.",
      }));
    }
  };

  const handleInsertInlineImage = (url: string) => {
    let nextCursor = cursorSelection.start;

    setText((prev) => {
      const result = insertInlineImageAtCursor(
        prev,
        url,
        cursorSelection.start,
        cursorSelection.end,
      );
      nextCursor = result.nextCursor;
      return result.nextText;
    });

    setErrors((prev) => ({ ...prev, media: undefined, text: undefined }));

    requestAnimationFrame(() => {
      const textarea = textAreaRef.current;
      if (!textarea) {
        return;
      }
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
      setCursorSelection({ start: nextCursor, end: nextCursor });
    });
  };

  const handleRemoveLibraryImage = (url: string) => {
    setMediaUrls((prev) => prev.filter((item) => item !== url));
    setMediaPreviews((prev) => prev.filter((item) => item !== url));
    setMediaUploadItems((prev) => prev.filter((item) => item.url !== url));
    setText((prev) => removeInlineImageByUrl(prev, url));
    if (coverImageUrl === url) {
      setCoverImageUrl("");
    }
  };


  const hasFieldErrors = Boolean(
    errors.date || errors.title || errors.text || errors.media,
  );
  const canSubmit = Boolean(
    isValidEntryDate(entryDate) &&
      text.trim() &&
      (mediaUrls.length > 0 || inlineImageUrls.length > 0) &&
      !hasFieldErrors &&
      !submitting &&
      !mediaUploading,
  );

  const isOptimizedImage = (url: string) => url.startsWith("/");

  const renderUploadItems = (
    items: UploadItem[],
    onRetry: (item: UploadItem) => void,
    onRemove: (item: UploadItem) => void,
  ) => {
    if (items.length === 0) {
      return null;
    }

    return (
      <ul className="mt-2 space-y-1 text-xs text-[#6B635B]">
        {items.map((item) => (
          <li
            key={item.id}
            className={`flex flex-wrap items-center justify-between gap-2 ${item.status === "failed" ? "text-[#B34A3C]" : ""}`}
          >
            <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
            <span>
              {item.status === "uploading"
                ? `Uploading ${item.progress}%`
                : null}
              {item.status === "success" ? "Uploaded" : null}
              {item.status === "failed"
                ? `Failed${item.message ? `: ${item.message}` : ""}`
                : null}
            </span>
            {item.status === "failed" ? (
              <div className="flex items-center gap-2">
                {item.canRetry ? (
                  <button
                    type="button"
                    onClick={() => onRetry(item)}
                    className="rounded-full border border-[#B34A3C]/40 px-2 py-0.5 text-[11px] font-semibold text-[#B34A3C] transition hover:bg-[#B34A3C]/10"
                  >
                    Retry
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onRemove(item)}
                  className="rounded-full border border-black/20 px-2 py-0.5 text-[11px] font-semibold text-[#2D2A26] transition hover:bg-black/5"
                >
                  Remove
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    );
  };

  const retryMediaUpload = async (item: UploadItem) => {
    setMediaUploadItems((prev) =>
      prev.map((entry) =>
        entry.id === item.id
          ? { ...entry, status: "uploading", progress: 0, message: undefined }
          : entry,
      ),
    );
    setMediaUploading(true);

    const result = await uploadEntryMediaBatch([item.file], {
      getFileId: () => item.id,
      onFileProgress: (_, progress) => {
        setMediaUploadItems((prev) =>
          prev.map((entry) =>
            entry.id === item.id
              ? { ...entry, status: "uploading", progress }
              : entry,
          ),
        );
      },
    });

    if (result.uploads.length > 0) {
      const uploaded = result.uploads[0];
      setMediaUrls((prev) => [...prev, uploaded.url]);
      setMediaPreviews((prev) =>
        item.previewUrl
          ? prev.map((preview) =>
              preview === item.previewUrl ? uploaded.url : preview,
            )
          : prev,
      );
      setMediaUploadItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                status: "success",
                progress: 100,
                url: uploaded.url,
              }
            : entry,
        ),
      );
    } else if (result.failures.length > 0) {
      setMediaUploadItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                status: "failed",
                progress: 0,
                message: result.failures[0].message,
                canRetry: true,
              }
            : entry,
        ),
      );
    }

    setMediaUploading(false);
  };

  const removeMediaUpload = (item: UploadItem) => {
    setMediaUploadItems((prev) => prev.filter((entry) => entry.id !== item.id));
    if (item.previewUrl) {
      setMediaPreviews((prev) =>
        prev.filter((preview) => preview !== item.previewUrl),
      );
    }
  };


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    const nextErrors = getErrors(
      entryDate,
      title,
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
      const mergedMediaUrls = Array.from(
        new Set([...mediaUrls, ...inlineImageUrls]),
      );
      const response = await fetch(`/api/entries/${entryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entryDate,
          title: title.trim(),
          coverImageUrl: coverImageUrl ? coverImageUrl : null,
          text: text.trim(),
          mediaUrls: mergedMediaUrls,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || result?.error) {
        const message =
          result?.error?.message ?? "Unable to update entry. Please try again.";
        if (result?.error?.code === "VALIDATION_ERROR") {
          if (message === "Entry date is required.") {
            setErrors({ date: message });
          } else if (message === "Entry title is required.") {
            setErrors({ title: message });
          } else if (message === "Entry title must be 80 characters or fewer.") {
            setErrors({ title: message });
          } else if (message === "Entry text is required.") {
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
        Entry title
        <input
          type="text"
          name="title"
          value={title}
          onChange={(event) => updateTitle(event.target.value)}
          onBlur={handleTitleBlur}
          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
          placeholder="Give the day a headline..."
        />
        <p className="mt-2 text-xs text-[#6B635B]">
          Max {maxTitleLength} characters.
        </p>
        {errors.title ? (
          <p className="mt-2 text-xs text-[#B34A3C]">{errors.title}</p>
        ) : null}
      </label>

      <label className="block text-sm text-[#2D2A26]">
        Entry text
        <textarea
          name="text"
          rows={20}
          value={text}
          onChange={(event) => updateText(event.target.value)}
          onBlur={handleTextBlur}
          onSelect={updateCursorSelection}
          onKeyUp={updateCursorSelection}
          onMouseUp={updateCursorSelection}
          onClick={updateCursorSelection}
          ref={textAreaRef}
          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
          placeholder="Refine the story..."
        />
        {errors.text ? (
          <p className="mt-2 text-xs text-[#B34A3C]">{errors.text}</p>
        ) : null}
      </label>

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

      <div className="space-y-2 rounded-xl border border-dashed border-black/10 bg-[#F9F5EF] p-3">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B635B]">
            Entry image library
          </div>
          <input
            id="entry-media-upload"
            name="media"
            type="file"
            aria-label="Entry image library"
            accept={ENTRY_MEDIA_ALLOWED_MIME_TYPES.join(",")}
            multiple
            onChange={handleMediaChange}
            onBlur={handleMediaBlur}
            className="sr-only"
          />
          <label
            htmlFor="entry-media-upload"
            className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#2D2A26] transition hover:bg-black/5 focus-within:border-[#1F6F78] focus-within:ring-2 focus-within:ring-[#1F6F78]/20"
          >
            Choose photos
          </label>
        </div>
        {mediaUploading ? (
          <div className="text-xs text-[#6B635B]">Uploading photos…</div>
        ) : null}
        {renderUploadItems(
          mediaUploadItems,
          retryMediaUpload,
          removeMediaUpload,
        )}
        {libraryImageUrls.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {libraryImageUrls.map((url, index) => {
              const isSelected = coverImageUrl === url;
              const isPreview = url.startsWith("blob:");
              const canSelect = !isPreview;
              const isHovered = hoveredImageUrl === url;
              return (
                <div
                  key={`${url}-${index}`}
                  onMouseEnter={() => setHoveredImageUrl(url)}
                  onMouseLeave={() => setHoveredImageUrl(null)}
                  className={`group relative h-28 overflow-hidden rounded-xl border bg-[#F2ECE3] transition ${
                    isSelected
                      ? "border-[#1F6F78] ring-2 ring-[#1F6F78]/30"
                      : "border-black/10"
                  }`}
                >
                  <Image
                    src={url}
                    alt={`Library image ${index + 1}`}
                    fill
                    sizes="(min-width: 768px) 25vw, 50vw"
                    className="object-cover"
                    loading="lazy"
                    unoptimized={!isOptimizedImage(url)}
                  />
                  <div
                    className={`pointer-events-none absolute inset-0 transition ${
                      isHovered ? "bg-black/20" : "bg-black/0"
                    }`}
                  />
                  <div
                    className={`absolute inset-x-2 top-2 z-10 flex justify-center gap-2 transition-opacity ${
                      isHovered ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setCoverImageUrl(isSelected ? "" : url)
                      }
                      aria-pressed={isSelected}
                      aria-label={
                        isSelected ? "Clear story image" : "Set as story image"
                      }
                      disabled={!canSelect}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#1F6F78] shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="7" />
                        <line x1="16.65" y1="16.65" x2="21" y2="21" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertInlineImage(url)}
                      aria-label="Insert inline"
                      disabled={!canSelect}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#2D2A26] shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11 4" />
                        <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L13 20" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveLibraryImage(url)}
                      aria-label="Remove"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#B34A3C] shadow transition hover:bg-white"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </div>
                  {isSelected ? (
                    <div
                      className="absolute z-10 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1F6F78] shadow"
                      style={{ bottom: "0.5rem", left: "0.5rem" }}
                    >
                      Selected
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
        {errors.media ? (
          <p className="text-xs text-[#B34A3C]">{errors.media}</p>
        ) : null}
      </div>

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
