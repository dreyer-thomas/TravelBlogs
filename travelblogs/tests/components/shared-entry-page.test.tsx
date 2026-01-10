// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ImgHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider } from "../../src/utils/locale-context";

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    const { priority, unoptimized, fill, ...rest } = props;
    return (
      <img
        {...rest}
        data-priority={priority ? "true" : undefined}
        data-unoptimized={unoptimized ? "true" : undefined}
        data-fill={fill ? "true" : undefined}
      />
    );
  },
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("../../src/components/trips/shared-trip-guard", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const notFoundMock = vi.fn(() => {
  throw new Error("NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("next/headers", () => ({
  headers: () => ({
    get: (key: string) => {
      if (key === "host") {
        return "localhost";
      }
      if (key === "x-forwarded-proto") {
        return "http";
      }
      return null;
    },
  }),
}));

describe("SharedEntryPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    notFoundMock.mockClear();
  });

  it("calls notFound when the shared entry token is revoked", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: null,
          error: { code: "NOT_FOUND", message: "Share link not found." },
        }),
        { status: 404 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { default: SharedEntryPage } = await import(
      "../../src/app/trips/share/[token]/entries/[entryId]/page"
    );

    await expect(
      SharedEntryPage({
        params: { token: "revoked-token", entryId: "entry-1" },
      }),
    ).rejects.toThrow("NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalled();
  });

  it("prefers the cover image for the shared entry hero", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: "entry-1",
            tripId: "trip-1",
            title: "Cover Story",
            text: "Cover wins.",
            createdAt: "2025-05-03T00:00:00.000Z",
            coverImageUrl: "https://example.com/cover.jpg",
            media: [
              {
                id: "media-1",
                url: "https://example.com/first.jpg",
                createdAt: "2025-05-03T00:00:00.000Z",
              },
              {
                id: "media-2",
                url: "https://example.com/cover.jpg",
                createdAt: "2025-05-03T00:00:00.000Z",
              },
            ],
          },
          error: null,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { default: SharedEntryPage } = await import(
      "../../src/app/trips/share/[token]/entries/[entryId]/page"
    );

    const element = await SharedEntryPage({
      params: { token: "token-1", entryId: "entry-1" },
    });

    render(<LocaleProvider>{element}</LocaleProvider>);

    expect(
      screen.getByRole("img", { name: /entry hero media/i }),
    ).toHaveAttribute("src", "https://example.com/cover.jpg");
  });

  it("falls back to the first media item when no cover image exists", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: "entry-2",
            tripId: "trip-1",
            title: "Fallback Story",
            text: "Fallback wins.",
            createdAt: "2025-05-03T00:00:00.000Z",
            coverImageUrl: null,
            media: [
              {
                id: "media-1",
                url: "https://example.com/first.jpg",
                createdAt: "2025-05-03T00:00:00.000Z",
              },
              {
                id: "media-2",
                url: "https://example.com/second.jpg",
                createdAt: "2025-05-03T00:00:00.000Z",
              },
            ],
          },
          error: null,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { default: SharedEntryPage } = await import(
      "../../src/app/trips/share/[token]/entries/[entryId]/page"
    );

    const element = await SharedEntryPage({
      params: { token: "token-1", entryId: "entry-2" },
    });

    render(<LocaleProvider>{element}</LocaleProvider>);

    expect(
      screen.getByRole("img", { name: /entry hero media/i }),
    ).toHaveAttribute("src", "https://example.com/first.jpg");
  });

  it("links back to the shared trip overview for the current token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: "entry-3",
            tripId: "trip-2",
            title: "Harbor stroll",
            text: "Evening breeze.",
            createdAt: "2025-05-04T00:00:00.000Z",
            coverImageUrl: "https://example.com/cover.jpg",
            media: [
              {
                id: "media-1",
                url: "https://example.com/cover.jpg",
                createdAt: "2025-05-04T00:00:00.000Z",
              },
            ],
          },
          error: null,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { default: SharedEntryPage } = await import(
      "../../src/app/trips/share/[token]/entries/[entryId]/page"
    );

    const element = await SharedEntryPage({
      params: { token: "token-9", entryId: "entry-3" },
    });

    render(<LocaleProvider>{element}</LocaleProvider>);

    expect(screen.getByRole("link", { name: /back to trip/i })).toHaveAttribute(
      "href",
      "/trips/share/token-9",
    );
  });
});
