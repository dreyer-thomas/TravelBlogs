import { afterEach, describe, expect, it, vi } from "vitest";

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
});
