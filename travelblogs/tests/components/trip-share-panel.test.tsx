// @vitest-environment jsdom
import type { ImgHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import TripDetail from "../../src/components/trips/trip-detail";

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("TripDetail share panel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders share link and copies it", async () => {
    const shareUrl = "http://localhost/trips/share/test-token";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "trip-1",
              title: "Italy Highlights",
              startDate: "2025-05-01T00:00:00.000Z",
              endDate: "2025-05-10T00:00:00.000Z",
              coverImageUrl: null,
            },
            error: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [],
            error: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              shareUrl,
              token: "test-token",
              tripId: "trip-1",
            },
            error: null,
          }),
          { status: 200 },
        ),
      );

    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText,
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TripDetail tripId="trip-1" />);

    const createButton = await screen.findByRole("button", {
      name: /create share link/i,
    });
    fireEvent.click(createButton);

    const shareInput = await screen.findByLabelText("Share URL");
    expect(shareInput).toHaveValue(shareUrl);

    fireEvent.click(
      screen.getByRole("button", { name: /copy link/i }),
    );

    expect(writeText).toHaveBeenCalledWith(shareUrl);
  });
});
