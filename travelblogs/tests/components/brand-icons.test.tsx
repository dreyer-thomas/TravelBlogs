import { describe, expect, it, vi } from "vitest";
import { CompassMark, compassMarkColors } from "@/components/brand/compass-mark";

const headersMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

import AppleIcon, { size as appleIconSize } from "../../src/app/apple-icon";
import OpengraphImage, {
  alt as opengraphAlt,
  size as opengraphSize,
} from "../../src/app/opengraph-image";

describe("CompassMark", () => {
  it("renders the compass shapes with the brand colors", () => {
    const element = CompassMark({ size: 32 });

    expect(element.type).toBe("svg");
    expect(element.props.width).toBe(32);

    const [ring, needleTop, needleBottom, hub] = element.props.children;
    expect(ring.props.stroke).toBe(compassMarkColors.ring);
    expect(needleTop.props.fill).toBe(compassMarkColors.ring);
    expect(needleBottom.props.fill).toBe(compassMarkColors.needle);
    expect(hub.props.fill).toBe(compassMarkColors.hub);
  });
});

describe("apple-icon", () => {
  it("renders a PNG at the declared size", async () => {
    const response = AppleIcon();

    expect(response.headers.get("content-type")).toBe("image/png");
    expect(appleIconSize).toEqual({ width: 180, height: 180 });

    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});

describe("opengraph-image", () => {
  it("renders an English PNG at the declared size with alt text", async () => {
    headersMock.mockResolvedValue(new Headers({ "accept-language": "en-US" }));

    const response = await OpengraphImage();

    expect(response.headers.get("content-type")).toBe("image/png");
    expect(opengraphSize).toEqual({ width: 1200, height: 630 });
    expect(opengraphAlt).toBe(
      "TravelBlogs — media-first travel stories, privately shared",
    );

    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("renders for German-locale requests without throwing", async () => {
    headersMock.mockResolvedValue(new Headers({ "accept-language": "de-DE" }));

    const response = await OpengraphImage();

    expect(response.headers.get("content-type")).toBe("image/png");

    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
