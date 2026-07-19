import { promises as fs } from "node:fs";
import { headers } from "next/headers";
import { ImageResponse } from "next/og";
import { renderCompassFallback } from "@/components/brand/og-fallback";
import { getImageMimeTypeFromUrl, resolveUploadFilePath } from "@/utils/media";
import { getLocaleFromAcceptLanguage, getTranslation } from "@/utils/i18n";
import { getRequestBaseUrl } from "@/utils/request-base-url";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type SharedTrip = {
  title: string;
  coverImageUrl: string | null;
};

const loadSharedTrip = async (
  baseUrl: string,
  token: string,
): Promise<SharedTrip | null> => {
  const response = await fetch(`${baseUrl}/api/trips/share/${token}`, {
    method: "GET",
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.error || !body?.data?.trip) {
    return null;
  }
  return body.data.trip as SharedTrip;
};

const loadImageDataUri = async (url: string): Promise<string | null> => {
  const mimeType = getImageMimeTypeFromUrl(url);
  const filePath = resolveUploadFilePath(url);
  if (!mimeType || !filePath) {
    return null;
  }
  try {
    const buffer = await fs.readFile(filePath);
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
};

export default async function TripShareOpengraphImage({
  params,
}: {
  params: Promise<{ token: string }> | { token: string };
}) {
  const { token } = await params;
  const headersList = await headers();
  const baseUrl = getRequestBaseUrl(headersList);
  const locale = getLocaleFromAcceptLanguage(
    headersList.get("accept-language"),
  );
  const fallbackTitle = getTranslation("site.title", locale);
  const fallbackDescription = getTranslation("site.description", locale);

  const trip = baseUrl ? await loadSharedTrip(baseUrl, token) : null;
  const imageDataUri = trip?.coverImageUrl
    ? await loadImageDataUri(trip.coverImageUrl)
    : null;

  if (!trip || !imageDataUri) {
    return new ImageResponse(
      renderCompassFallback(fallbackTitle, fallbackDescription),
      size,
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
        }}
      >
        <img
          src={imageDataUri}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            padding: "56px 64px",
            background:
              "linear-gradient(to top, rgba(15,14,12,0.85) 0%, rgba(15,14,12,0.35) 55%, rgba(15,14,12,0) 100%)",
          }}
        >
          <div
            style={{
              fontSize: 60,
              fontWeight: 800,
              color: "#FFFFFF",
              letterSpacing: -1,
            }}
          >
            {trip.title}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
