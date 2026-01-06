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
import { ensureActiveAccount, isAdminOrCreator } from "../../../../utils/roles";

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

const getUser = async (request: Request) => {
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
};

type UploadFailure = {
  fileName: string;
  message: string;
  isServerError?: boolean;
};

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

  const extension = getCoverImageExtension(file.type);
  if (!extension) {
    return {
      failure: {
        fileName: file.name,
        message: "Cover image must be a JPG, PNG, or WebP file.",
      },
    };
  }

  try {
    const safeName = `cover-${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const filePath = path.join(uploadDir, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    return {
      upload: {
        fileName: file.name,
        url: `${COVER_IMAGE_PUBLIC_PATH}/${safeName}`,
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

export const POST = async (request: Request) => {
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
    } catch {
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
        const code = result.failure.isServerError
          ? "INTERNAL_SERVER_ERROR"
          : "VALIDATION_ERROR";
        return jsonError(status, code, result.failure.message);
      }

      return NextResponse.json(
        {
          data: {
            url: result.upload?.url ?? null,
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
      .map(({ fileName, message }) => ({ fileName, message }));

    return NextResponse.json(
      {
        data: {
          uploads,
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
