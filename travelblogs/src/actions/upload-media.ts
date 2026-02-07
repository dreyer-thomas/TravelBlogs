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

const resolveUploadDir = () => {
  const configured = process.env.MEDIA_UPLOAD_DIR?.trim();
  if (configured) {
    return configured;
  }
  return path.join(process.cwd(), "public", "uploads");
};

type UploadResult = {
  success: boolean;
  data?: {
    fileName: string;
    url: string;
    mediaType: "image" | "video";
    location: { latitude: number; longitude: number } | null;
  };
  error?: {
    code: string;
    message: string;
  };
};

export async function uploadMediaAction(formData: FormData): Promise<UploadResult> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required." },
      };
    }

    if (!isAdminOrCreator(session.user.role)) {
      return {
        success: false,
        error: { code: "FORBIDDEN", message: "Creator access required." },
      };
    }

    const isActive = await ensureActiveAccount(session.user.id);
    if (!isActive) {
      return {
        success: false,
        error: { code: "FORBIDDEN", message: "Account is inactive." },
      };
    }

    // Get the file
    const file = formData.get("file") as File | null;
    if (!file) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "File is required." },
      };
    }

    // Validate file
    const validationError = validateCoverImageFile(file);
    if (validationError) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: validationError },
      };
    }

    const isVideo = isVideoMimeType(file.type);
    const isHeic = isHeicMimeType(file.type);
    const extension = getCoverImageExtension(file.type);
    if (!extension) {
      return {
        success: false,
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
    const safeName = `${prefix}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const filePath = path.join(uploadDir, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    let finalBuffer: Buffer<ArrayBufferLike> = buffer;

    if (!isVideo) {
      try {
        const compressed = await compressImage(buffer, { forceJpeg: isHeic });
        finalBuffer = compressed.buffer;
      } catch (error) {
        if (isHeic) {
          return {
            success: false,
            error: {
              code: "HEIC_UNSUPPORTED",
              message:
                "HEIC/HEIF images are not supported on this server yet.",
            },
          };
        }
        console.warn("[Image Compression] Upload compression failed:", error);
      }
    }

    await fs.writeFile(filePath, finalBuffer);

    const location = isVideo ? null : await extractGpsFromImage(finalBuffer);

    return {
      success: true,
      data: {
        fileName: file.name,
        url: `${COVER_IMAGE_PUBLIC_PATH}/${safeName}`,
        mediaType: isVideo ? "video" : "image",
        location,
      },
    };
  } catch (error) {
    console.error("Failed to upload media:", error);
    return {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to upload file.",
      },
    };
  }
}
