// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import SharedTripGuard from "../../src/components/trips/shared-trip-guard";
import { LocaleProvider } from "../../src/utils/locale-context";

describe("SharedTripGuard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders an invalid message when the share token is revoked", async () => {
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

    render(
      <LocaleProvider>
        <SharedTripGuard token="stale-token">
          <div>Shared content</div>
        </SharedTripGuard>
      </LocaleProvider>,
    );

    expect(
      await screen.findByText("This share link is no longer valid."),
    ).toBeInTheDocument();
  });

  it("checks the share token on mount", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: {}, error: null }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LocaleProvider>
        <SharedTripGuard token="active-token">
          <div>Shared content</div>
        </SharedTripGuard>
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/trips/share/active-token", {
        method: "GET",
        cache: "no-store",
      });
    });
    expect(screen.getByText("Shared content")).toBeInTheDocument();
  });
});
