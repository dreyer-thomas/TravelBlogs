import { NextResponse, type NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resolveUploadRoot = () => {
  const configured = process.env.MEDIA_UPLOAD_DIR?.trim();
  if (configured) {
    return configured;
  }
  return path.join(process.cwd(), "public", "uploads");
};

const getContentType = (filePath: string) => {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }
  if (extension === ".png") {
    return "image/png";
  }
  if (extension === ".webp") {
    return "image/webp";
  }
  if (extension === ".svg") {
    return "image/svg+xml";
  }
  return "application/octet-stream";
};

const resolveSafePath = (segments: string[]) => {
  const uploadRoot = resolveUploadRoot();
  const rootResolved = path.resolve(uploadRoot);
  const filePath = path.resolve(uploadRoot, ...segments);
  if (!filePath.startsWith(`${rootResolved}${path.sep}`)) {
    return null;
  }
  return filePath;
};

export const GET = async (
  _request: NextRequest,
  { params }: { params: { path?: string[] } },
) => {
  const segments = params.path ?? [];
  if (segments.length === 0) {
    return NextResponse.json(
      { data: null, error: { code: "NOT_FOUND", message: "File not found." } },
      { status: 404 },
    );
  }

  const filePath = resolveSafePath(segments);
  if (!filePath) {
    return NextResponse.json(
      { data: null, error: { code: "FORBIDDEN", message: "Invalid file path." } },
      { status: 403 },
    );
  }

  try {
    const data = await fs.readFile(filePath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": getContentType(filePath),
        "Cache-Control": "public, max-age=0",
      },
    });
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "NOT_FOUND", message: "File not found." } },
      { status: 404 },
    );
  }
};

export const HEAD = async (
  request: NextRequest,
  context: { params: { path?: string[] } },
) => {
  const response = await GET(request, context);
  return new NextResponse(null, { status: response.status, headers: response.headers });
};
