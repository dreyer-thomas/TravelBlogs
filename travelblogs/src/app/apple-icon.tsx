import { ImageResponse } from "next/og";
import { CompassMark } from "@/components/brand/compass-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FBF7F1",
        }}
      >
        <CompassMark size={132} />
      </div>
    ),
    size,
  );
}
