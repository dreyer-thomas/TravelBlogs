import {
  COVER_IMAGE_ALLOWED_MIME_TYPES,
  COVER_IMAGE_FIELD_NAME,
  COVER_IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
  isVideoMimeType,
} from "./media";

export const ENTRY_MEDIA_ALLOWED_MIME_TYPES = COVER_IMAGE_ALLOWED_MIME_TYPES;

const ENTRY_MEDIA_ALLOWED_TYPE_SET = new Set<string>(
  ENTRY_MEDIA_ALLOWED_MIME_TYPES,
);

type UploadOptions = {
  onProgress?: (progress: number) => void;
  translate?: (key: string) => string;
};

type UploadedMedia = {
  url: string;
  mediaType: "image" | "video";
};

type BatchUploadOptions = {
  onFileProgress?: (file: File, progress: number) => void;
  uploadFn?: (file: File, options?: UploadOptions) => Promise<UploadedMedia>;
  strategy?: "sequential" | "parallel";
  getFileId?: (file: File) => string;
  translate?: (key: string) => string;
};

type BatchUploadResult = {
  uploads: {
    fileId: string;
    fileName: string;
    url: string;
    mediaType: "image" | "video";
  }[];
  failures: { fileId: string; fileName: string; message: string }[];
};

export const validateEntryMediaFile = (
  file: File,
  translate?: (key: string) => string,
) => {
  if (!ENTRY_MEDIA_ALLOWED_TYPE_SET.has(file.type)) {
    return translate
      ? translate("entries.mediaTypeError")
      : "Media files must be a JPG, PNG, WebP, MP4, WebM, or MOV file.";
  }
  const isVideo = isVideoMimeType(file.type);
  const maxBytes = isVideo ? VIDEO_MAX_BYTES : COVER_IMAGE_MAX_BYTES;
  if (file.size > maxBytes) {
    if (translate) {
      return translate(
        isVideo ? "entries.videoSizeError" : "entries.photoSizeError",
      );
    }
    return isVideo
      ? "Video must be 100MB or less."
      : "Photo must be 15MB or less.";
  }
  return null;
};

export const createEntryPreviewUrl = (file: File) => {
  return URL.createObjectURL(file);
};

export const uploadEntryMedia = (
  file: File,
  options: UploadOptions = {},
) => {
  const translate = options.translate;
  return new Promise<UploadedMedia>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const formData = new FormData();

    formData.append(COVER_IMAGE_FIELD_NAME, file);

    request.open("POST", "/api/media/upload");
    request.responseType = "json";

    if (request.upload && options.onProgress) {
      request.upload.onprogress = (event) => {
        if (!event.lengthComputable) {
          return;
        }
        const percent = Math.round((event.loaded / event.total) * 100);
        options.onProgress?.(percent);
      };
    }

    request.onerror = () => {
      reject(
        new Error(
          translate
            ? translate("entries.mediaUploadError")
            : "Unable to upload media file.",
        ),
      );
    };

    request.onabort = () => {
      reject(
        new Error(
          translate
            ? translate("entries.mediaUploadCancelled")
            : "Media upload was cancelled.",
        ),
      );
    };

    request.onload = () => {
      const response =
        typeof request.response === "object" && request.response
          ? request.response
          : null;

      if (request.status >= 200 && request.status < 300 && response?.data?.url) {
        const responseMediaType =
          response?.data?.mediaType === "video" ||
          response?.data?.mediaType === "image"
            ? response.data.mediaType
            : null;
        const mediaType =
          responseMediaType ?? (isVideoMimeType(file.type) ? "video" : "image");
        resolve({ url: response.data.url as string, mediaType });
        return;
      }

      const message =
        response?.error?.message ??
        (translate
          ? translate("entries.mediaUploadRetryError")
          : "Unable to upload media file. Please try again.");
      reject(new Error(message));
    };

    request.send(formData);
  });
};

export const uploadEntryMediaBatch = async (
  files: File[],
  options: BatchUploadOptions = {},
): Promise<BatchUploadResult> => {
  const uploads: BatchUploadResult["uploads"] = [];
  const failures: BatchUploadResult["failures"] = [];
  const uploadFn = options.uploadFn ?? uploadEntryMedia;
  const getFileId = options.getFileId ?? ((file) => file.name);

  const uploadSingle = async (file: File) => {
    const fileId = getFileId(file);
    try {
      const upload = await uploadFn(file, {
        onProgress: (progress) => options.onFileProgress?.(file, progress),
        translate: options.translate,
      });
      uploads.push({
        fileId,
        fileName: file.name,
        url: upload.url,
        mediaType: upload.mediaType,
      });
    } catch (error) {
      failures.push({
        fileId,
        fileName: file.name,
        message:
          error instanceof Error
            ? error.message
            : options.translate
              ? options.translate("entries.mediaUploadError")
              : "Unable to upload media file.",
      });
    }
  };

  if (options.strategy === "parallel") {
    await Promise.all(files.map((file) => uploadSingle(file)));
    return { uploads, failures };
  }

  for (const file of files) {
    await uploadSingle(file);
  }

  return { uploads, failures };
};
