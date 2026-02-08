'use server'

import { getServerSession } from "next-auth";
import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";

import {
  COVER_IMAGE_PUBLIC_PATH,
  getCoverImageExtension,
  isHeicMimeType,
  isVideoMimeType,
  validateCoverImageFile,
} from "../utils/media";
import { extractGpsFromImage } from "../utils/entry-location";
import { authOptions } from "../utils/auth-options";
import { ensureActiveAccount, isAdminOrCreator } from "../utils/roles";
import { compressImage } from "../utils/compress-image";

const HEIC_UNSUPPORTED_CODE = "HEIC_UNSUPPORTED";
const HEIC_UNSUPPORTED_MESSAGE = "entries.heicUnsupportedError";

const resolveUploadDir = () => {
  const configured = process.env.MEDIA_UPLOAD_DIR?.trim();
  if (configured) {
    return configured;
  }
  return path.join(process.cwd(), "public", "uploads");
};

type UploadResult = {
  data: {
    fileName: string;
    url: string;
    mediaType: "image" | "video";
    location: { latitude: number; longitude: number } | null;
  } | null;
  error: {
    code: string;
    message: string;
  } | null;
};

export async function uploadMediaAction(formData: FormData): Promise<UploadResult> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return {
        data: null,
        error: { code: "UNAUTHORIZED", message: "Authentication required." },
      };
    }

    if (!isAdminOrCreator(session.user.role)) {
      return {
        data: null,
        error: { code: "FORBIDDEN", message: "Creator access required." },
      };
    }

    const isActive = await ensureActiveAccount(session.user.id);
    if (!isActive) {
      return {
        data: null,
        error: { code: "FORBIDDEN", message: "Account is inactive." },
      };
    }

    // Get the file
    const file = formData.get("file") as File | null;
    if (!file) {
      return {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "File is required." },
      };
    }

    // Validate file
    const validationError = validateCoverImageFile(file);
    if (validationError) {
      return {
        data: null,
        error: { code: "VALIDATION_ERROR", message: validationError },
      };
    }

    const isVideo = isVideoMimeType(file.type);
    const isHeic = isHeicMimeType(file.type);
    const extension = getCoverImageExtension(file.type);
    if (!extension) {
      return {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message:
            "Cover image must be a JPG, PNG, WebP, HEIC, HEIF, MP4, WebM, or MOV file.",
        },
      };
    }

    // Upload file
    const uploadRoot = resolveUploadDir();
    const uploadDir = path.join(uploadRoot, "trips");
    await fs.mkdir(uploadDir, { recursive: true });

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
      } catch (error) {
        if (isHeic) {
          return {
            data: null,
            error: {
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
      data: {
        fileName: file.name,
        url: `${COVER_IMAGE_PUBLIC_PATH}/${safeName}`,
        mediaType: isVideo ? "video" : "image",
        location,
      },
      error: null,
    };
  } catch (error) {
    console.error("Failed to upload media:", error);
    return {
      data: null,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to upload file.",
      },
    };
  }
}
