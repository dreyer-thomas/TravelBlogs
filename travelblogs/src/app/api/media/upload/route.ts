import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";

import {
  COVER_IMAGE_FIELD_NAME,
  COVER_IMAGE_PUBLIC_PATH,
  getCoverImageExtension,
  validateCoverImageFile,
} from "../../../../utils/media";

export const runtime = "nodejs";

const jsonError = (status: number, code: string, message: string) => {
  return NextResponse.json(
    {
      data: null,
      error: { code, message },
    },
    { status },
  );
};

const getUserId = async (request: Request) => {
  try {
    const token = await getToken({ req: request });
    return token?.sub ?? null;
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

export const POST = async (request: Request) => {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }
    if (userId !== "creator") {
      return jsonError(403, "FORBIDDEN", "Creator access required.");
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError(400, "INVALID_FORM_DATA", "Invalid form submission.");
    }

    const file = formData.get(COVER_IMAGE_FIELD_NAME);
    if (!file || !(file instanceof File)) {
      return jsonError(400, "VALIDATION_ERROR", "Cover image file is required.");
    }

    const validationError = validateCoverImageFile(file);
    if (validationError) {
      return jsonError(400, "VALIDATION_ERROR", validationError);
    }

    const extension = getCoverImageExtension(file.type);
    if (!extension) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "Cover image must be a JPG, PNG, or WebP file.",
      );
    }

    // MEDIA_UPLOAD_DIR can point to a NAS-mounted path; ensure it is web-served.
    const uploadRoot = resolveUploadDir();
    const uploadDir = path.join(uploadRoot, "trips");
    await fs.mkdir(uploadDir, { recursive: true });

    const safeName = `cover-${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const filePath = path.join(uploadDir, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    return NextResponse.json(
      {
        data: {
          url: `${COVER_IMAGE_PUBLIC_PATH}/${safeName}`,
        },
        error: null,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to upload cover image", error);
    return jsonError(500, "INTERNAL_SERVER_ERROR", "Unable to upload image.");
  }
};
