import { COVER_IMAGE_FIELD_NAME } from "./media";

type UploadOptions = {
  onProgress?: (progress: number) => void;
  translate?: (key: string) => string;
};

export const uploadCoverImage = (file: File, options: UploadOptions = {}) => {
  const translate = options.translate;
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
      reject(
        new Error(
          translate
            ? translate("trips.coverUploadError")
            : "Unable to upload cover image.",
        ),
      );
    };

    request.onabort = () => {
      reject(
        new Error(
          translate
            ? translate("trips.coverUploadCancelled")
            : "Cover image upload was cancelled.",
        ),
      );
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
        response?.error?.code === "HEIC_UNSUPPORTED"
          ? translate
            ? translate("trips.heicUnsupportedError")
            : "HEIC/HEIF images are not supported on this server yet."
          : response?.error?.message ??
            (translate
              ? translate("trips.coverUploadRetryError")
              : "Unable to upload cover image. Please try again.");
      reject(new Error(message));
    };

    request.send(formData);
  });
};
