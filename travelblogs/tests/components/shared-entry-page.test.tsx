// @vitest-environment jsdom
import type { ReactNode } from "react";
import type { EntryReaderData } from "../../src/utils/entry-reader";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

let capturedEntry: EntryReaderData | null = null;

vi.mock("../../src/components/entries/entry-reader", () => ({
  default: ({ entry }: { entry: EntryReaderData }) => {
    capturedEntry = entry;
    return <div data-testid="entry-reader" />;
  },
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
    capturedEntry = null;
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

    render(element);

    expect(capturedEntry?.media[0]?.url).toBe("https://example.com/cover.jpg");
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

    render(element);

    expect(capturedEntry?.media[0]?.url).toBe("https://example.com/first.jpg");
  });
});
