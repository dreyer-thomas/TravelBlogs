import { headers } from "next/headers";
import { ImageResponse } from "next/og";
import { renderCompassFallback } from "@/components/brand/og-fallback";
import { getLocaleFromAcceptLanguage, getTranslation } from "@/utils/i18n";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "TravelBlogs — media-first travel stories, privately shared";

export default async function OpengraphImage() {
  const headersList = await headers();
  const locale = getLocaleFromAcceptLanguage(
    headersList.get("accept-language"),
  );
  const title = getTranslation("site.title", locale);
  const description = getTranslation("site.description", locale);

  return new ImageResponse(renderCompassFallback(title, description), size);
}
