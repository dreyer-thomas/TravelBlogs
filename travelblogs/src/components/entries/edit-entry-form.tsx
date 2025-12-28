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
import { extractInlineImageUrls } from "../../utils/entry-content";

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
      "Add at least one photo in the text or in the photos section.";
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
  const [inlineUploading, setInlineUploading] = useState(false);
  const [mediaUploadItems, setMediaUploadItems] = useState<UploadItem[]>([]);
  const [inlineUploadItems, setInlineUploadItems] = useState<UploadItem[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

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
    if (
      coverImageUrl &&
      !availableStoryImages.includes(coverImageUrl)
    ) {
      setCoverImageUrl("");
    }
  }, [availableStoryImages, coverImageUrl]);

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
    setErrors((prev) => ({
      ...prev,
      title: value.trim() ? undefined : "Entry title is required.",
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

  const handleTitleBlur = () => {
    if (!title.trim()) {
      setErrors((prev) => ({
        ...prev,
        title: "Entry title is required.",
      }));
    }
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
    setInlineUploading(false);

    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const batchId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const fileIdMap = new Map<File, string>();
    const invalidItems: UploadItem[] = [];
    const uploadItems: UploadItem[] = [];
    const validFiles: File[] = [];

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

      validFiles.push(file);
      uploadItems.push({
        id: fileId,
        file,
        status: "uploading",
        progress: 0,
        canRetry: true,
      });
    });

    setInlineUploadItems((prev) => [...prev, ...invalidItems, ...uploadItems]);

    if (validFiles.length === 0) {
      event.target.value = "";
      return;
    }

    setInlineUploading(true);

    const result = await uploadEntryMediaBatch(validFiles, {
      getFileId: (file) => fileIdMap.get(file) ?? file.name,
      onFileProgress: (file, progress) => {
        const fileId = fileIdMap.get(file) ?? file.name;
        setInlineUploadItems((prev) =>
          prev.map((item) =>
            item.id === fileId
              ? { ...item, status: "uploading", progress }
              : item,
          ),
        );
      },
    });

    if (result.uploads.length > 0) {
      insertInlineImages(result.uploads.map((upload) => upload.url));
    }
    setInlineUploadItems((prev) =>
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

    setInlineUploading(false);
    event.target.value = "";
  };

  const hasFieldErrors = Boolean(
    errors.date || errors.title || errors.text || errors.media,
  );
  const canSubmit = Boolean(
    isValidEntryDate(entryDate) &&
      title.trim() &&
      text.trim() &&
      (mediaUrls.length > 0 || inlineImageUrls.length > 0) &&
      !hasFieldErrors &&
      !submitting &&
      !mediaUploading &&
      !inlineUploading,
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

  const retryInlineUpload = async (item: UploadItem) => {
    setInlineUploadItems((prev) =>
      prev.map((entry) =>
        entry.id === item.id
          ? { ...entry, status: "uploading", progress: 0, message: undefined }
          : entry,
      ),
    );
    setInlineUploading(true);

    const result = await uploadEntryMediaBatch([item.file], {
      getFileId: () => item.id,
      onFileProgress: (_, progress) => {
        setInlineUploadItems((prev) =>
          prev.map((entry) =>
            entry.id === item.id
              ? { ...entry, status: "uploading", progress }
              : entry,
          ),
        );
      },
    });

    if (result.uploads.length > 0) {
      insertInlineImages([result.uploads[0].url]);
      setInlineUploadItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                status: "success",
                progress: 100,
                url: result.uploads[0].url,
              }
            : entry,
        ),
      );
    } else if (result.failures.length > 0) {
      setInlineUploadItems((prev) =>
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

    setInlineUploading(false);
  };

  const removeInlineUpload = (item: UploadItem) => {
    setInlineUploadItems((prev) =>
      prev.filter((entry) => entry.id !== item.id),
    );
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
          mediaUrls,
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
          ref={textAreaRef}
          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
          placeholder="Refine the story..."
        />
        {errors.text ? (
          <p className="mt-2 text-xs text-[#B34A3C]">{errors.text}</p>
        ) : null}
      </label>

      <div className="space-y-2 rounded-xl border border-dashed border-black/10 bg-[#F9F5EF] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B635B]">
            Story image
          </p>
          {coverImageUrl ? (
            <button
              type="button"
              onClick={() => setCoverImageUrl("")}
              className="rounded-full border border-black/10 px-2 py-1 text-[11px] font-semibold text-[#6B635B] transition hover:bg-black/5"
            >
              Clear selection
            </button>
          ) : null}
        </div>
        <p className="text-xs text-[#6B635B]">
          Choose one photo to show on the trip overview.
        </p>
        {availableStoryImages.length === 0 ? (
          <p className="text-xs text-[#6B635B]">
            Add photos to enable story image selection.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {availableStoryImages.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() => setCoverImageUrl(url)}
                className={`group relative h-28 overflow-hidden rounded-xl border transition ${
                  coverImageUrl === url
                    ? "border-[#1F6F78] ring-2 ring-[#1F6F78]/30"
                    : "border-black/10 hover:border-[#1F6F78]/40"
                }`}
              >
                <Image
                  src={url}
                  alt={`Story image option ${index + 1}`}
                  fill
                  sizes="(min-width: 768px) 20vw, 40vw"
                  className="object-cover"
                  loading="lazy"
                  unoptimized={!isOptimizedImage(url)}
                />
                <div
                  className={`absolute inset-0 bg-black/0 transition ${
                    coverImageUrl === url ? "bg-black/20" : "group-hover:bg-black/10"
                  }`}
                />
                {coverImageUrl === url ? (
                  <div className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1F6F78] shadow">
                    Selected
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>

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
          <div className="text-xs text-[#6B635B]">Uploading inline photos…</div>
        ) : null}
        {renderUploadItems(
          inlineUploadItems,
          retryInlineUpload,
          removeInlineUpload,
        )}
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
            Uploading photos…
          </div>
        ) : null}
        {renderUploadItems(
          mediaUploadItems,
          retryMediaUpload,
          removeMediaUpload,
        )}
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
