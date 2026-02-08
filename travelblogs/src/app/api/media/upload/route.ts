import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";

import {
  COVER_IMAGE_FIELD_NAME,
  COVER_IMAGE_PUBLIC_PATH,
  getCoverImageExtension,
  isHeicMimeType,
  isVideoMimeType,
  validateCoverImageFile,
} from "../../../../utils/media";
import { ensureActiveAccount, isAdminOrCreator } from "../../../../utils/roles";
import { extractGpsFromImage } from "../../../../utils/entry-location";
import { compressImage } from "../../../../utils/compress-image";

export const runtime = "nodejs";

// Allow large file uploads (100MB for videos)
export const maxDuration = 60; // 60 seconds timeout for large uploads

const jsonError = (status: number, code: string, message: string) => {
  return NextResponse.json(
    {
      data: null,
      error: { code, message },
    },
    { status },
  );
};

const getUser = async (request: NextRequest) => {
  try {
    const token = await getToken({ req: request });
    if (!token?.sub) {
      return null;
    }
    return {
      id: token.sub,
      role:
        typeof token.role === "string"
          ? token.role
          : token.sub === "creator"
            ? "creator"
            : null,
    };
  } catch {
    return null;
  }
};

const resolveUploadDir = () => {
  const configured = process.env.MEDIA_UPLOAD_DIR?.trim();
  if (configured) {
    return configured;
  }
  return path.join(process.cwd(), "public", "uploads");
};

type UploadSuccess = {
  fileName: string;
  url: string;
  mediaType: "image" | "video";
  location: { latitude: number; longitude: number } | null;
  filePath: string;
};

type UploadFailure = {
  fileName: string;
  code?: string;
  message: string;
  isServerError?: boolean;
};

const HEIC_UNSUPPORTED_CODE = "HEIC_UNSUPPORTED";
const HEIC_UNSUPPORTED_MESSAGE = "trips.heicUnsupportedError";

const uploadFile = async (
  file: File,
  uploadDir: string,
): Promise<{ upload?: UploadSuccess; failure?: UploadFailure }> => {
  const validationError = validateCoverImageFile(file);
  if (validationError) {
    return {
      failure: {
        fileName: file.name,
        message: validationError,
      },
    };
  }

  const isVideo = isVideoMimeType(file.type);
  const isHeic = isHeicMimeType(file.type);
  const extension = getCoverImageExtension(file.type);
  if (!extension) {
    return {
      failure: {
        fileName: file.name,
        message:
          "Cover image must be a JPG, PNG, WebP, HEIC, HEIF, MP4, WebM, or MOV file.",
      },
    };
  }

  try {
    const prefix = isVideo ? "video" : "photo";
    let finalExtension = extension;
    const buffer = Buffer.from(await file.arrayBuffer());
    let finalBuffer: Buffer<ArrayBufferLike> = buffer;

    if (!isVideo) {
      try {
        const compressed = await compressImage(buffer, { forceJpeg: isHeic });
        finalBuffer = compressed.buffer;
        if (isHeic) {
          finalExtension = "jpg";
        }
        if (compressed.wasCompressed) {
          console.log(
            `[Image Compression] ${file.name}: ${buffer.length} -> ${compressed.buffer.length}`,
          );
        }
      } catch (error) {
        if (isHeic) {
          return {
            failure: {
              fileName: file.name,
              code: HEIC_UNSUPPORTED_CODE,
              message: HEIC_UNSUPPORTED_MESSAGE,
            },
          };
        } else {
          console.warn("[Image Compression] Upload compression failed:", error);
        }
      }
    }

    const safeName = `${prefix}-${Date.now()}-${crypto.randomUUID()}.${finalExtension}`;
    const filePath = path.join(uploadDir, safeName);
    await fs.writeFile(filePath, finalBuffer);

    const location = isVideo ? null : await extractGpsFromImage(finalBuffer);

    return {
      upload: {
        fileName: file.name,
        url: `${COVER_IMAGE_PUBLIC_PATH}/${safeName}`,
        mediaType: isVideo ? "video" : "image",
        location,
        filePath,
      },
    };
  } catch (error) {
    console.error("Failed to upload cover image", error);
    return {
      failure: {
        fileName: file.name,
        message: "Unable to upload image.",
        isServerError: true,
      },
    };
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const user = await getUser(request);
    if (!user) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }
    if (!isAdminOrCreator(user.role)) {
      return jsonError(403, "FORBIDDEN", "Creator access required.");
    }
    const isActive = await ensureActiveAccount(user.id);
    if (!isActive) {
      return jsonError(403, "FORBIDDEN", "Account is inactive.");
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error("Failed to parse form data:", error);
      // Check if it's a body size error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("Body exceeded") || errorMessage.includes("PayloadTooLargeError")) {
        return jsonError(413, "PAYLOAD_TOO_LARGE", "File size exceeds server limit. Maximum total upload size is 100MB.");
      }
      return jsonError(400, "INVALID_FORM_DATA", "Invalid form submission.");
    }

    const files = formData
      .getAll(COVER_IMAGE_FIELD_NAME)
      .filter((entry): entry is File => entry instanceof File);
    if (files.length === 0) {
      return jsonError(400, "VALIDATION_ERROR", "Cover image file is required.");
    }

    // MEDIA_UPLOAD_DIR can point to a NAS-mounted path; ensure it is web-served.
    const uploadRoot = resolveUploadDir();
    const uploadDir = path.join(uploadRoot, "trips");
    await fs.mkdir(uploadDir, { recursive: true });

    if (files.length === 1) {
      const result = await uploadFile(files[0], uploadDir);
      if (result.failure) {
        const status = result.failure.isServerError ? 500 : 400;
        const code =
          result.failure.code ??
          (result.failure.isServerError
            ? "INTERNAL_SERVER_ERROR"
            : "VALIDATION_ERROR");
        return jsonError(status, code, result.failure.message);
      }

      return NextResponse.json(
        {
          data: {
            url: result.upload?.url ?? null,
            mediaType: result.upload?.mediaType ?? null,
            location: result.upload?.location ?? null,
          },
          error: null,
        },
        { status: 201 },
      );
    }

    const results = await Promise.all(
      files.map((file) => uploadFile(file, uploadDir)),
    );

    const uploads = results
      .map((result) => result.upload)
      .filter((upload): upload is UploadSuccess => Boolean(upload));
    const failures = results
      .map((result) => result.failure)
      .filter((failure): failure is UploadFailure => Boolean(failure))
      .map(({ fileName, message, code }) => ({ fileName, message, code }));

    const heicFailure = failures.find(
      (failure) => failure.code === HEIC_UNSUPPORTED_CODE,
    );
    if (heicFailure) {
      await Promise.all(
        uploads.map((upload) => fs.rm(upload.filePath, { force: true })),
      );
      return jsonError(400, heicFailure.code, heicFailure.message);
    }

    return NextResponse.json(
      {
        data: {
          uploads: uploads.map((upload) => ({
            fileName: upload.fileName,
            url: upload.url,
            mediaType: upload.mediaType,
            location: upload.location,
          })),
          failures,
        },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to upload cover image", error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to upload image.");
  }
};
