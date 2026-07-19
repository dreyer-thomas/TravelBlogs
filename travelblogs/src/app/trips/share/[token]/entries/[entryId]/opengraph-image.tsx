import { promises as fs } from "node:fs";
import { headers } from "next/headers";
import { ImageResponse } from "next/og";
import { renderCompassFallback } from "@/components/brand/og-fallback";
import { getImageMimeTypeFromUrl, resolveUploadFilePath } from "@/utils/media";
import { getLocaleFromAcceptLanguage, getTranslation } from "@/utils/i18n";
import { getRequestBaseUrl } from "@/utils/request-base-url";
import { inferMediaType } from "@/utils/entry-reader";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type SharedEntryMedia = { url: string };

type SharedEntry = {
  title: string;
  coverImageUrl: string | null;
  media: SharedEntryMedia[];
};

type SharedTrip = { title: string };

const loadSharedEntry = async (
  baseUrl: string,
  token: string,
  entryId: string,
): Promise<SharedEntry | null> => {
  const response = await fetch(
    `${baseUrl}/api/trips/share/${token}/entries/${entryId}`,
    { method: "GET", cache: "no-store" },
  );
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.error || !body?.data) {
    return null;
  }
  return body.data as SharedEntry;
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

const pickHeroImageUrl = (entry: SharedEntry): string | null => {
  if (entry.coverImageUrl) {
    return entry.coverImageUrl;
  }
  const firstImage = entry.media.find(
    (item) => inferMediaType(item.url) === "image",
  );
  return firstImage?.url ?? null;
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

export default async function EntryShareOpengraphImage({
  params,
}: {
  params:
    | Promise<{ token: string; entryId: string }>
    | { token: string; entryId: string };
}) {
  const { token, entryId } = await params;
  const headersList = await headers();
  const baseUrl = getRequestBaseUrl(headersList);
  const locale = getLocaleFromAcceptLanguage(
    headersList.get("accept-language"),
  );
  const fallbackTitle = getTranslation("site.title", locale);
  const fallbackDescription = getTranslation("site.description", locale);

  const entry = baseUrl ? await loadSharedEntry(baseUrl, token, entryId) : null;
  const heroImageUrl = entry ? pickHeroImageUrl(entry) : null;
  const imageDataUri = heroImageUrl ? await loadImageDataUri(heroImageUrl) : null;

  if (!entry || !imageDataUri) {
    return new ImageResponse(
      renderCompassFallback(fallbackTitle, fallbackDescription),
      size,
    );
  }

  const trip = baseUrl ? await loadSharedTrip(baseUrl, token) : null;

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
              fontSize: 56,
              fontWeight: 800,
              color: "#FFFFFF",
              letterSpacing: -1,
            }}
          >
            {entry.title}
          </div>
          {trip ? (
            <div
              style={{
                fontSize: 28,
                color: "rgba(255,255,255,0.85)",
                marginTop: 8,
              }}
            >
              {trip.title}
            </div>
          ) : null}
        </div>
      </div>
    ),
    size,
  );
}
