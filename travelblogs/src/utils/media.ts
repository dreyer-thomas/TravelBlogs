export const COVER_IMAGE_MAX_BYTES = 15 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const COVER_IMAGE_FIELD_NAME = "file";
export const COVER_IMAGE_PUBLIC_PATH = "/uploads/trips";

export const COVER_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/webm",
  "video/quicktime", // MOV files
] as const;

export const HEIC_MIME_TYPES = ["image/heic", "image/heif"] as const;

const COVER_IMAGE_ALLOWED_TYPE_SET = new Set<string>(
  COVER_IMAGE_ALLOWED_MIME_TYPES,
);

export const getCoverImageExtension = (mimeType: string) => {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }
  if (mimeType === "image/png") {
    return "png";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  if (mimeType === "image/heic" || mimeType === "image/heif") {
    return "jpg";
  }
  if (mimeType === "video/mp4") {
    return "mp4";
  }
  if (mimeType === "video/webm") {
    return "webm";
  }
  if (mimeType === "video/quicktime") {
    return "mov";
  }
  return null;
};

export const isVideoMimeType = (mimeType: string) => {
  return mimeType.startsWith("video/");
};

export const isHeicMimeType = (mimeType: string) => {
  return (HEIC_MIME_TYPES as readonly string[]).includes(mimeType);
};

const VIDEO_FILE_EXTENSIONS = new Set<string>(["mp4", "webm", "mov"]);

export const getMediaTypeFromUrl = (url: string): "image" | "video" => {
  const sanitized = url.split("?")[0]?.split("#")[0] ?? "";
  const extension = sanitized.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_FILE_EXTENSIONS.has(extension) ? "video" : "image";
};

export const validateCoverImageFile = (
  file: File,
  translate?: (key: string) => string,
) => {
  if (!COVER_IMAGE_ALLOWED_TYPE_SET.has(file.type)) {
    return translate
      ? translate("trips.coverImageTypeError")
      : "Cover image must be a JPG, PNG, WebP, HEIC, HEIF, MP4, WebM, or MOV file.";
  }
  const isVideo = isVideoMimeType(file.type);
  const maxBytes = isVideo ? VIDEO_MAX_BYTES : COVER_IMAGE_MAX_BYTES;
  if (file.size > maxBytes) {
    if (translate) {
      return translate(
        isVideo ? "trips.coverVideoSizeError" : "trips.coverImageSizeError",
      );
    }
    return isVideo
      ? "Video must be 100MB or less."
      : "Cover image must be 15MB or less.";
  }
  return null;
};

export const isCoverImageUrl = (value: string) => {
  return value.startsWith(`${COVER_IMAGE_PUBLIC_PATH}/`);
};

export const createCoverPreviewUrl = (file: File) => {
  return URL.createObjectURL(file);
};
