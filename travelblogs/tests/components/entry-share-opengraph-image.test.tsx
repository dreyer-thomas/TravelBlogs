import os from "node:os";
import path from "node:path";
import { promises as realFs } from "node:fs";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const headersMock = vi.hoisted(() => vi.fn());
const readFileMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  readFileMock.mockImplementation(
    (...args: Parameters<typeof actual.promises.readFile>) =>
      actual.promises.readFile(...args),
  );
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readFile: readFileMock,
    },
  };
});

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const tripApiResponse = () =>
  new Response(
    JSON.stringify({
      data: {
        trip: {
          id: "trip-1",
          title: "Alpine Adventure",
          coverImageUrl: null,
        },
      },
      error: null,
    }),
    { status: 200 },
  );

describe("entry share opengraph-image", () => {
  let uploadRoot: string;

  beforeAll(async () => {
    uploadRoot = await realFs.mkdtemp(
      path.join(os.tmpdir(), "entry-og-test-"),
    );
    process.env.MEDIA_UPLOAD_DIR = uploadRoot;
    await realFs.mkdir(path.join(uploadRoot, "entries", "1"), {
      recursive: true,
    });
    await realFs.writeFile(
      path.join(uploadRoot, "entries", "1", "photo.png"),
      Buffer.from(TINY_PNG_BASE64, "base64"),
    );
  });

  afterAll(async () => {
    delete process.env.MEDIA_UPLOAD_DIR;
    await realFs.rm(uploadRoot, { recursive: true, force: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    readFileMock.mockClear();
  });

  const mockHeaders = () => {
    headersMock.mockResolvedValue(
      new Headers({ host: "localhost", "accept-language": "en-US" }),
    );
  };

  it("renders the entry's cover photo as a PNG at the declared size", async () => {
    mockHeaders();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/entries/")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "entry-1",
                tripId: "trip-1",
                title: "Rainy afternoon",
                coverImageUrl: "/uploads/entries/1/photo.png",
                media: [],
              },
              error: null,
            }),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(tripApiResponse());
    });
    vi.stubGlobal("fetch", fetchMock);

    const { default: EntryShareOpengraphImage, size } = await import(
      "../../src/app/trips/share/[token]/entries/[entryId]/opengraph-image"
    );

    const response = await EntryShareOpengraphImage({
      params: { token: "token-1", entryId: "entry-1" },
    });

    expect(response.headers.get("content-type")).toBe("image/png");
    expect(size).toEqual({ width: 1200, height: 630 });
    // entry fetch + trip-title fetch for the byline
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("falls back to the first image-type media item when there's no cover image", async () => {
    mockHeaders();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/entries/")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "entry-2",
                tripId: "trip-1",
                title: "Video first",
                coverImageUrl: null,
                media: [
                  { id: "media-1", url: "/uploads/entries/1/clip.mp4" },
                  { id: "media-2", url: "/uploads/entries/1/photo.png" },
                ],
              },
              error: null,
            }),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(tripApiResponse());
    });
    vi.stubGlobal("fetch", fetchMock);

    const { default: EntryShareOpengraphImage } = await import(
      "../../src/app/trips/share/[token]/entries/[entryId]/opengraph-image"
    );

    const response = await EntryShareOpengraphImage({
      params: { token: "token-1", entryId: "entry-2" },
    });

    expect(response.headers.get("content-type")).toBe("image/png");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("tries the next image candidate when an earlier one can't be read", async () => {
    mockHeaders();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/entries/")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "entry-5",
                tripId: "trip-1",
                title: "Second candidate",
                coverImageUrl: null,
                media: [
                  { id: "media-1", url: "/uploads/entries/1/missing.png" },
                  { id: "media-2", url: "/uploads/entries/1/photo.png" },
                ],
              },
              error: null,
            }),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(tripApiResponse());
    });
    vi.stubGlobal("fetch", fetchMock);
    readFileMock.mockRejectedValueOnce(new Error("ENOENT"));

    const { default: EntryShareOpengraphImage } = await import(
      "../../src/app/trips/share/[token]/entries/[entryId]/opengraph-image"
    );

    const response = await EntryShareOpengraphImage({
      params: { token: "token-1", entryId: "entry-5" },
    });

    expect(response.headers.get("content-type")).toBe("image/png");
    expect(readFileMock).toHaveBeenCalledTimes(2);
    // second candidate resolved -> proceeds to fetch the trip title for the byline
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("falls back to the generic compass design when there's no usable image", async () => {
    mockHeaders();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/entries/")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "entry-3",
                tripId: "trip-1",
                title: "No media",
                coverImageUrl: null,
                media: [{ id: "media-1", url: "/uploads/entries/1/clip.mp4" }],
              },
              error: null,
            }),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(tripApiResponse());
    });
    vi.stubGlobal("fetch", fetchMock);

    const { default: EntryShareOpengraphImage } = await import(
      "../../src/app/trips/share/[token]/entries/[entryId]/opengraph-image"
    );

    const response = await EntryShareOpengraphImage({
      params: { token: "token-1", entryId: "entry-3" },
    });

    expect(response.headers.get("content-type")).toBe("image/png");
    // no image found -> falls back before ever fetching the trip title
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("falls back to the generic compass design when the entry fetch rejects", async () => {
    mockHeaders();
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", fetchMock);

    const { default: EntryShareOpengraphImage } = await import(
      "../../src/app/trips/share/[token]/entries/[entryId]/opengraph-image"
    );

    const response = await EntryShareOpengraphImage({
      params: { token: "token-1", entryId: "entry-1" },
    });

    expect(response.headers.get("content-type")).toBe("image/png");
    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("falls back to the generic compass design when the token/entry is invalid", async () => {
    mockHeaders();
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

    const { default: EntryShareOpengraphImage } = await import(
      "../../src/app/trips/share/[token]/entries/[entryId]/opengraph-image"
    );

    const response = await EntryShareOpengraphImage({
      params: { token: "revoked-token", entryId: "entry-1" },
    });

    expect(response.headers.get("content-type")).toBe("image/png");
    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("falls back to the generic compass design when the cover image file can't be read", async () => {
    mockHeaders();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/entries/")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "entry-4",
                tripId: "trip-1",
                title: "Unreadable cover",
                coverImageUrl: "/uploads/entries/1/photo.png",
                media: [],
              },
              error: null,
            }),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(tripApiResponse());
    });
    vi.stubGlobal("fetch", fetchMock);
    readFileMock.mockRejectedValueOnce(new Error("ENOENT"));

    const { default: EntryShareOpengraphImage } = await import(
      "../../src/app/trips/share/[token]/entries/[entryId]/opengraph-image"
    );

    const response = await EntryShareOpengraphImage({
      params: { token: "token-1", entryId: "entry-4" },
    });

    expect(response.headers.get("content-type")).toBe("image/png");
    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
