"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Editor } from "@tiptap/core";

import {
  createEntryPreviewUrl,
  ENTRY_MEDIA_ALLOWED_MIME_TYPES,
  uploadEntryMediaBatch,
  validateEntryMediaFile,
} from "../../utils/entry-media";
import { insertEntryImage } from "../../utils/tiptap-image-helpers";
import { useTranslation } from "../../utils/use-translation";
import EntryTagInput from "./entry-tag-input";
import TiptapEditor from "./tiptap-editor";

type FieldErrors = {
  date?: string;
  title?: string;
  text?: string;
  media?: string;
  tags?: string;
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

type CreatedEntryMedia = {
  id: string;
  url: string;
  createdAt: string;
};

type CreatedEntry = {
  id: string;
  tripId: string;
  title: string;
  coverImageUrl?: string | null;
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

const maxTitleLength = 80;
const locationSearchDelayMs = 400;

/**
 * Check if Tiptap JSON content is empty.
 * Empty means: no content, only empty paragraphs, or only whitespace text.
 */
const isEmptyTiptapContent = (content: string): boolean => {
  if (!content || !content.trim()) return true;
  try {
    const parsed = JSON.parse(content);
    if (parsed.type === "doc" && Array.isArray(parsed.content)) {
      if (parsed.content.length === 0) return true;
      // Check if all content is just empty paragraphs
      return parsed.content.every(
        (node: { type: string; content?: Array<{ type: string; text?: string }> }) =>
          node.type === "paragraph" &&
          (!node.content ||
            node.content.length === 0 ||
            node.content.every(
              (c) => c.type === "text" && !c.text?.trim()
            ))
      );
    }
    return false;
  } catch {
    // If not valid JSON, check if plain text is empty
    return !content.trim();
  }
};

const getErrors = (
  entryDate: string,
  title: string,
  text: string,
  mediaUrls: string[],
  t: (key: string) => string,
) => {
  const nextErrors: FieldErrors = {};

  if (!isValidEntryDate(entryDate)) {
    nextErrors.date = t("entries.entryDateRequired");
  }

  if (!title.trim()) {
    nextErrors.title = t("entries.entryTitleRequired");
  }

  if (isEmptyTiptapContent(text)) {
    nextErrors.text = t("entries.entryTextRequired");
  }

  if (mediaUrls.length === 0) {
    nextErrors.media = t("entries.entryMediaRequired");
  }

  return nextErrors;
};

const createFileId = (file: File, index: number, batchId: string) =>
  `${batchId}-${file.name}-${file.size}-${file.lastModified}-${index}`;

const CreateEntryForm = ({ tripId, onEntryCreated }: CreateEntryFormProps) => {
  const { t } = useTranslation();
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [title, setTitle] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaUploadItems, setMediaUploadItems] = useState<UploadItem[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [hoveredImageUrl, setHoveredImageUrl] = useState<string | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<
    Array<{
      id: string;
      latitude: number;
      longitude: number;
      displayName: string;
    }>
  >([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    locationName: string;
  } | null>(null);
  const skipLocationSearchRef = useRef(false);
  const editorRef = useRef<Editor | null>(null);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

  // Inline images are inserted into Tiptap JSON; gallery images remain tracked in mediaUrls.
  const libraryImageUrls = useMemo(() => {
    const seen = new Set<string>();
    return mediaUrls.filter((url) => {
      const value = url.trim();
      if (!value || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }, [mediaUrls]);
  // selectableImageUrls = libraryImageUrls (until Story 9.6 adds inline images)
  const selectableImageUrls = libraryImageUrls;
  const validatedCoverImageUrl = useMemo(() => {
    if (coverImageUrl && selectableImageUrls.includes(coverImageUrl)) {
      return coverImageUrl;
    }
    return "";
  }, [coverImageUrl, selectableImageUrls]);

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
    let isActive = true;

    const loadTags = async () => {
      if (typeof fetch !== "function") {
        return;
      }
      try {
        const response = await fetch(`/api/trips/${tripId}/tags`);
        const result = await response.json().catch(() => null);
        if (!isActive) {
          return;
        }
        if (
          response.ok &&
          Array.isArray(result?.data) &&
          result.data.every((item: unknown) => typeof item === "string")
        ) {
          setTagSuggestions(result.data);
        } else {
          setTagSuggestions([]);
        }
      } catch {
        if (isActive) {
          setTagSuggestions([]);
        }
      }
    };

    void loadTags();

    return () => {
      isActive = false;
    };
  }, [tripId]);

  const updateText = (value: string) => {
    setText(value);
    setErrors((prev) => ({
      ...prev,
      text: isEmptyTiptapContent(value) ? t("entries.entryTextRequired") : undefined,
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
        title: t("entries.entryTitleRequired"),
      }));
    }
  };

  const updateEntryDate = (value: string) => {
    setEntryDate(value);
    setErrors((prev) => ({
      ...prev,
      date: isValidEntryDate(value)
        ? undefined
        : t("entries.entryDateRequired"),
    }));
  };

  const handleDateBlur = () => {
    if (!isValidEntryDate(entryDate)) {
      setErrors((prev) => ({
        ...prev,
        date: t("entries.entryDateRequired"),
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
      const validationError = validateEntryMediaFile(file, t);
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
      translate: t,
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
    if (mediaUrls.length === 0) {
      setErrors((prev) => ({
        ...prev,
        media: t("entries.entryMediaRequired"),
      }));
    }
  };

  const replaceEntryImageIds = (
    content: string,
    urlToIdMap: Map<string, string>,
  ) => {
    if (!content.trim() || urlToIdMap.size === 0) {
      return content;
    }
    try {
      const parsed = JSON.parse(content);
      let updated = false;

      const visitNode = (node: any): any => {
        if (node?.type === "entryImage") {
          const entryMediaId = node.attrs?.entryMediaId;
          const src = node.attrs?.src;
          const nextId =
            (entryMediaId && urlToIdMap.get(entryMediaId)) ||
            (src && urlToIdMap.get(src));
          if (nextId && node.attrs?.entryMediaId !== nextId) {
            updated = true;
            return {
              ...node,
              attrs: { ...node.attrs, entryMediaId: nextId },
              content: Array.isArray(node.content)
                ? node.content.map(visitNode)
                : node.content,
            };
          }
        }
        if (Array.isArray(node?.content)) {
          const newContent = node.content.map(visitNode);
          if (newContent.some((child: any, i: number) => child !== node.content[i])) {
            updated = true;
            return { ...node, content: newContent };
          }
        }
        return node;
      };

      const newParsed = visitNode(parsed);
      return updated ? JSON.stringify(newParsed) : content;
    } catch {
      return content;
    }
  };

  const handleInsertInlineImage = (url: string) => {
    const editor = editorRef.current;
    if (!editor || !url || !url.trim()) {
      return;
    }
    insertEntryImage(editor, url, url, t("entries.entryPhoto"));
  };

  const handleRemoveLibraryImage = (url: string) => {
    setMediaUrls((prev) => prev.filter((item) => item !== url));
    setMediaPreviews((prev) => prev.filter((item) => item !== url));
    setMediaUploadItems((prev) => prev.filter((item) => item.url !== url));
    if (coverImageUrl === url) {
      setCoverImageUrl("");
    }
  };

  const handleLocationSearch = (query: string) => {
    setLocationQuery(query);
  };

  const handleLocationSelect = (result: {
    latitude: number;
    longitude: number;
    displayName: string;
  }) => {
    skipLocationSearchRef.current = true;
    setSelectedLocation({
      latitude: result.latitude,
      longitude: result.longitude,
      locationName: result.displayName,
    });
    setLocationQuery(result.displayName);
    setLocationResults([]);
  };

  const handleClearLocation = () => {
    skipLocationSearchRef.current = true;
    setSelectedLocation(null);
    setLocationQuery("");
    setLocationResults([]);
  };

  const handleUsePhotoLocation = async (imageUrl: string) => {
    // Extract GPS from uploaded image
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Call extractGpsFromImage utility
      const { extractGpsFromImage } = await import("../../utils/entry-location");
      const gpsData = await extractGpsFromImage(buffer);

      if (gpsData) {
        skipLocationSearchRef.current = true;
        setSelectedLocation({
          latitude: gpsData.latitude,
          longitude: gpsData.longitude,
          locationName: t("entries.photoLocation"),
        });
        setLocationQuery(t("entries.photoLocation"));
      }
    } catch {
      // Silently fail if GPS extraction fails
    }
  };

  useEffect(() => {
    const trimmedQuery = locationQuery.trim();

    if (skipLocationSearchRef.current) {
      skipLocationSearchRef.current = false;
      setLocationSearching(false);
      return;
    }

    if (!trimmedQuery) {
      setLocationResults([]);
      setLocationSearching(false);
      return;
    }

    let isActive = true;
    setLocationSearching(true);

    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/locations/search?query=${encodeURIComponent(trimmedQuery)}`,
        );
        const result = await response.json();
        if (!isActive) {
          return;
        }
        if (response.ok && result.data) {
          setLocationResults(result.data);
        } else {
          setLocationResults([]);
        }
      } catch {
        if (isActive) {
          setLocationResults([]);
        }
      } finally {
        if (isActive) {
          setLocationSearching(false);
        }
      }
    }, locationSearchDelayMs);

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [locationQuery]);

  const hasFieldErrors = Boolean(
    errors.date || errors.title || errors.text || errors.media || errors.tags,
  );
  const canSubmit = Boolean(
    isValidEntryDate(entryDate) &&
      !isEmptyTiptapContent(text) &&
      mediaUrls.length > 0 &&
      !hasFieldErrors &&
      !submitting &&
      !mediaUploading,
  );
  const maxCharactersLabel = `${t("entries.maxCharacters")} ${maxTitleLength} ${t("entries.characters")}`;

  const previewLabel = useMemo(() => {
    if (mediaPreviews.length === 0) {
      return "";
    }
    if (mediaPreviews.length === 1) {
      return `1 ${t("entries.mediaPreview")}`;
    }
    return `${mediaPreviews.length} ${t("entries.mediaPreviews")}`;
  }, [mediaPreviews.length, t]);

  const isOptimizedImage = (url: string) => url.startsWith("/");
  const formatUploadStatus = (item: UploadItem) => {
    if (item.status === "uploading") {
      return `${t("entries.uploading")} ${item.progress}%`;
    }
    if (item.status === "success") {
      return t("entries.uploaded");
    }
    if (item.status === "failed") {
      return `${t("entries.failed")}${item.message ? `: ${item.message}` : ""}`;
    }
    return "";
  };

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
            <span>{formatUploadStatus(item)}</span>
            {item.status === "failed" ? (
              <div className="flex items-center gap-2">
                {item.canRetry ? (
                  <button
                    type="button"
                    onClick={() => onRetry(item)}
                    className="rounded-full border border-[#B34A3C]/40 px-2 py-0.5 text-[11px] font-semibold text-[#B34A3C] transition hover:bg-[#B34A3C]/10"
                  >
                    {t("entries.retry")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onRemove(item)}
                  className="rounded-full border border-black/20 px-2 py-0.5 text-[11px] font-semibold text-[#2D2A26] transition hover:bg-black/5"
                >
                  {t("entries.remove")}
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
      translate: t,
    });

    if (result.uploads.length > 0) {
      setMediaUrls((prev) => [...prev, result.uploads[0].url]);
      setMediaUploadItems((prev) =>
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

  const resolveValidationError = (message: string): FieldErrors => {
    if (message === "Entry date is required.") {
      return { date: t("entries.entryDateRequired") };
    }
    if (message === "Entry title is required.") {
      return { title: t("entries.entryTitleRequired") };
    }
    if (message === "Entry title must be 80 characters or fewer.") {
      return { title: t("entries.entryTitleMaxLength") };
    }
    if (message === "Entry text is required.") {
      return { text: t("entries.entryTextRequired") };
    }
    if (
      message === "At least one photo is required." ||
      message === "Media URL is required."
    ) {
      return { media: t("entries.entryMediaRequired") };
    }
    if (message === "Tag is required.") {
      return { tags: t("entries.tagRequired") };
    }
    if (message === "Tag must be 40 characters or fewer.") {
      return { tags: t("entries.tagTooLong") };
    }
    if (message === "Tags must be unique.") {
      return { tags: t("entries.tagsMustBeUnique") };
    }
    return { form: message };
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    const nextErrors = getErrors(
      entryDate,
      title,
      text,
      mediaUrls,
      t,
    );
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);

    try {
      const mergedMediaUrls = Array.from(new Set(mediaUrls));
      const submittedText = text.trim();
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tripId,
          entryDate,
          title: title.trim(),
          coverImageUrl: validatedCoverImageUrl.trim()
            ? validatedCoverImageUrl
            : undefined,
          text: submittedText,
          mediaUrls: mergedMediaUrls,
          tags,
          latitude: selectedLocation?.latitude,
          longitude: selectedLocation?.longitude,
          locationName: selectedLocation?.locationName,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || result?.error) {
        const message =
          result?.error?.message ?? t("entries.entryCreateError");
        if (result?.error?.code === "VALIDATION_ERROR") {
          setErrors(resolveValidationError(message));
        } else {
          setErrors({ form: message });
        }
        setSubmitting(false);
        return;
      }

      const createdEntry = result.data as CreatedEntry;
      let resolvedText = submittedText;
      if (Array.isArray(createdEntry.media) && createdEntry.media.length > 0) {
        const mediaIdByUrl = new Map(
          createdEntry.media.map((item) => [item.url, item.id]),
        );
        const nextText = replaceEntryImageIds(submittedText, mediaIdByUrl);
        if (nextText !== submittedText) {
          try {
            const patchResponse = await fetch(
              `/api/entries/${createdEntry.id}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  entryDate,
                  title: title.trim(),
                  coverImageUrl: validatedCoverImageUrl.trim()
                    ? validatedCoverImageUrl
                    : null,
                  text: nextText,
                  mediaUrls: mergedMediaUrls,
                  tags,
                  latitude: selectedLocation?.latitude ?? null,
                  longitude: selectedLocation?.longitude ?? null,
                  locationName: selectedLocation?.locationName ?? null,
                }),
              },
            );
            const patchResult = await patchResponse.json().catch(() => null);
            if (patchResponse.ok && !patchResult?.error) {
              resolvedText = nextText;
            }
          } catch {
            // Best effort; leave resolvedText as submittedText
          }
        }
      }

      setTitle("");
      setCoverImageUrl("");
      setText("");
      setTags([]);
      setMediaUrls([]);
      setMediaPreviews([]);
      setEntryDate(new Date().toISOString().slice(0, 10));
      onEntryCreated?.({ ...createdEntry, text: resolvedText });
      setSubmitting(false);
    } catch {
      setErrors({
        form: t("entries.entryCreateError"),
      });
      setSubmitting(false);
    }
  };

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm text-[#2D2A26]">
        {t("entries.entryDate")}
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
        {t("entries.entryTitle")}
        <input
          type="text"
          name="title"
          value={title}
          onChange={(event) => updateTitle(event.target.value)}
          onBlur={handleTitleBlur}
          className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
          placeholder={t("entries.headlinePlaceholder")}
        />
        <p className="mt-2 text-xs text-[#6B635B]">
          {maxCharactersLabel}
        </p>
        {errors.title ? (
          <p className="mt-2 text-xs text-[#B34A3C]">{errors.title}</p>
        ) : null}
      </label>

      <div className="block text-sm text-[#2D2A26]">
        <span className="block mb-2">{t("entries.entryText")}</span>
        <TiptapEditor
          initialContent=""
          onChange={updateText}
          onEditorReady={(editor) => {
            editorRef.current = editor;
          }}
          placeholder={t("entries.storyPlaceholder")}
        />
        {errors.text ? (
          <p className="mt-2 text-xs text-[#B34A3C]">{errors.text}</p>
        ) : null}
      </div>

      <EntryTagInput
        value={tags}
        onChange={setTags}
        suggestions={tagSuggestions}
        t={t}
      />
      {errors.tags ? (
        <p className="text-xs text-[#B34A3C]">{errors.tags}</p>
      ) : null}

      <div className="space-y-2 rounded-xl border border-dashed border-black/10 bg-[#F9F5EF] p-3">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B635B]">
            {t("entries.imageLibrary")}
          </div>
          <input
            id="entry-media-upload"
            name="media"
            type="file"
            aria-label={t("entries.imageLibrary")}
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
            {t("entries.choosePhotos")}
          </label>
        </div>
        {mediaUploading ? (
          <div className="text-xs text-[#6B635B]">
            {t("entries.uploadingPhotos")}
          </div>
        ) : null}
        {renderUploadItems(
          mediaUploadItems,
          retryMediaUpload,
          removeMediaUpload,
        )}
        {libraryImageUrls.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {libraryImageUrls.map((url, index) => {
              const isSelected = validatedCoverImageUrl === url;
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
                    alt={`${t("entries.libraryImage")} ${index + 1}`}
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
                        isSelected
                          ? t("entries.clearStoryImage")
                          : t("entries.setStoryImage")
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
                      aria-label={t("entries.insertInline")}
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
                      onClick={() => handleUsePhotoLocation(url)}
                      aria-label={t("entries.usePhotoLocation")}
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
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveLibraryImage(url)}
                      aria-label={t("entries.remove")}
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
                      {t("entries.selected")}
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
        {previewLabel ? (
          <span className="sr-only">{previewLabel}</span>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-[#2D2A26]">
          {t("entries.storyLocation")}
          <input
            type="text"
            value={locationQuery}
            onChange={(e) => handleLocationSearch(e.target.value)}
            placeholder={t("entries.searchLocation")}
            className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:border-[#1F6F78] focus:outline-none focus:ring-2 focus:ring-[#1F6F78]/20"
          />
        </label>
        {locationSearching ? (
          <p className="text-xs text-[#6B635B]">{t("entries.searching")}</p>
        ) : null}
        {locationResults.length > 0 ? (
          <ul className="mt-2 space-y-1 rounded-xl border border-black/10 bg-white p-2">
            {locationResults.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => handleLocationSelect(result)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#1F6F78]/10"
                >
                  {result.displayName}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {selectedLocation ? (
          <div className="mt-2 flex items-center justify-between rounded-xl border border-[#1F6F78]/30 bg-[#1F6F78]/10 px-3 py-2">
            <span className="text-sm text-[#2D2A26]">
              {selectedLocation.locationName}
            </span>
            <button
              type="button"
              onClick={handleClearLocation}
              className="text-xs text-[#B34A3C] hover:underline"
            >
              {t("entries.clearLocation")}
            </button>
          </div>
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
        {submitting ? t("entries.addingEntry") : t("entries.addEntry")}
      </button>
    </form>
  );
};

export default CreateEntryForm;
