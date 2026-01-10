export const COVER_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const COVER_IMAGE_FIELD_NAME = "file";
export const COVER_IMAGE_PUBLIC_PATH = "/uploads/trips";

export const COVER_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

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
  return null;
};

export const validateCoverImageFile = (
  file: File,
  translate?: (key: string) => string,
) => {
  if (!COVER_IMAGE_ALLOWED_TYPE_SET.has(file.type)) {
    return translate
      ? translate("trips.coverImageTypeError")
      : "Cover image must be a JPG, PNG, or WebP file.";
  }
  if (file.size > COVER_IMAGE_MAX_BYTES) {
    return translate
      ? translate("trips.coverImageSizeError")
      : "Cover image must be 5MB or less.";
  }
  return null;
};

export const isCoverImageUrl = (value: string) => {
  return value.startsWith(`${COVER_IMAGE_PUBLIC_PATH}/`);
};

export const createCoverPreviewUrl = (file: File) => {
  return URL.createObjectURL(file);
};
