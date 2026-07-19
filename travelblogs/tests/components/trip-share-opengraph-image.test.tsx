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

describe("trip share opengraph-image", () => {
  let uploadRoot: string;

  beforeAll(async () => {
    uploadRoot = await realFs.mkdtemp(
      path.join(os.tmpdir(), "trip-og-test-"),
    );
    process.env.MEDIA_UPLOAD_DIR = uploadRoot;
    await realFs.mkdir(path.join(uploadRoot, "trips", "1"), {
      recursive: true,
    });
    await realFs.writeFile(
      path.join(uploadRoot, "trips", "1", "cover.png"),
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

  it("renders the trip's cover photo as a PNG at the declared size", async () => {
    mockHeaders();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            trip: {
              id: "trip-1",
              title: "Alpine Adventure",
              coverImageUrl: "/uploads/trips/1/cover.png",
            },
          },
          error: null,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { default: TripShareOpengraphImage, size } = await import(
      "../../src/app/trips/share/[token]/opengraph-image"
    );

    const response = await TripShareOpengraphImage({
      params: { token: "token-1" },
    });

    expect(response.headers.get("content-type")).toBe("image/png");
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("falls back to the generic compass design when the trip has no cover image", async () => {
    mockHeaders();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            trip: {
              id: "trip-2",
              title: "No Cover Trip",
              coverImageUrl: null,
            },
          },
          error: null,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { default: TripShareOpengraphImage } = await import(
      "../../src/app/trips/share/[token]/opengraph-image"
    );

    const response = await TripShareOpengraphImage({
      params: { token: "token-2" },
    });

    expect(response.headers.get("content-type")).toBe("image/png");
    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("falls back to the generic compass design when the share token is invalid", async () => {
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

    const { default: TripShareOpengraphImage } = await import(
      "../../src/app/trips/share/[token]/opengraph-image"
    );

    const response = await TripShareOpengraphImage({
      params: { token: "revoked-token" },
    });

    expect(response.headers.get("content-type")).toBe("image/png");
    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("falls back to the generic compass design when the share API fetch rejects", async () => {
    mockHeaders();
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", fetchMock);

    const { default: TripShareOpengraphImage } = await import(
      "../../src/app/trips/share/[token]/opengraph-image"
    );

    const response = await TripShareOpengraphImage({
      params: { token: "token-4" },
    });

    expect(response.headers.get("content-type")).toBe("image/png");
    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("falls back to the generic compass design when the cover image file can't be read", async () => {
    mockHeaders();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            trip: {
              id: "trip-3",
              title: "Unreadable Cover Trip",
              coverImageUrl: "/uploads/trips/1/cover.png",
            },
          },
          error: null,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    readFileMock.mockRejectedValueOnce(new Error("ENOENT"));

    const { default: TripShareOpengraphImage } = await import(
      "../../src/app/trips/share/[token]/opengraph-image"
    );

    const response = await TripShareOpengraphImage({
      params: { token: "token-3" },
    });

    expect(response.headers.get("content-type")).toBe("image/png");
    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
