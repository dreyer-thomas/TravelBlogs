import {
  COVER_IMAGE_ALLOWED_MIME_TYPES,
  COVER_IMAGE_FIELD_NAME,
  COVER_IMAGE_MAX_BYTES,
} from "./media";

export const ENTRY_MEDIA_ALLOWED_MIME_TYPES = COVER_IMAGE_ALLOWED_MIME_TYPES;

const ENTRY_MEDIA_ALLOWED_TYPE_SET = new Set<string>(
  ENTRY_MEDIA_ALLOWED_MIME_TYPES,
);

type UploadOptions = {
  onProgress?: (progress: number) => void;
};

type BatchUploadOptions = {
  onFileProgress?: (file: File, progress: number) => void;
  uploadFn?: (file: File, options?: UploadOptions) => Promise<string>;
  strategy?: "sequential" | "parallel";
  getFileId?: (file: File) => string;
};

type BatchUploadResult = {
  uploads: { fileId: string; fileName: string; url: string }[];
  failures: { fileId: string; fileName: string; message: string }[];
};

export const validateEntryMediaFile = (file: File) => {
  if (!ENTRY_MEDIA_ALLOWED_TYPE_SET.has(file.type)) {
    return "Media files must be a JPG, PNG, or WebP file.";
  }
  if (file.size > COVER_IMAGE_MAX_BYTES) {
    return "Media files must be 5MB or less.";
  }
  return null;
};

export const createEntryPreviewUrl = (file: File) => {
  return URL.createObjectURL(file);
};

export const uploadEntryMedia = (file: File, options: UploadOptions = {}) => {
  return new Promise<string>((resolve, reject) => {
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
      reject(new Error("Unable to upload media file."));
    };

    request.onabort = () => {
      reject(new Error("Media upload was cancelled."));
    };

    request.onload = () => {
      const response =
        typeof request.response === "object" && request.response
          ? request.response
          : null;

      if (request.status >= 200 && request.status < 300 && response?.data?.url) {
        resolve(response.data.url as string);
        return;
      }

      const message =
        response?.error?.message ??
        "Unable to upload media file. Please try again.";
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
      const url = await uploadFn(file, {
        onProgress: (progress) => options.onFileProgress?.(file, progress),
      });
      uploads.push({ fileId, fileName: file.name, url });
    } catch (error) {
      failures.push({
        fileId,
        fileName: file.name,
        message:
          error instanceof Error
            ? error.message
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
