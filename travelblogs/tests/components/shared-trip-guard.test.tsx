// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import SharedTripGuard from "../../src/components/trips/shared-trip-guard";

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
      <SharedTripGuard token="stale-token">
        <div>Shared content</div>
      </SharedTripGuard>,
    );

    expect(
      await screen.findByText("This share link is no longer valid."),
    ).toBeInTheDocument();
  });
});
