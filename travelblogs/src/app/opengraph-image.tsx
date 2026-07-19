import { headers } from "next/headers";
import { ImageResponse } from "next/og";
import { CompassMark } from "@/components/brand/compass-mark";
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

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "#FBF7F1",
          padding: "0 80px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 64,
            boxShadow: "0 8px 24px rgba(45,42,38,0.08)",
          }}
        >
          <CompassMark size={180} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 720 }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              color: "#2D2A26",
              letterSpacing: -2,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 30, color: "#6B635B", marginTop: 12 }}>
            {description}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
