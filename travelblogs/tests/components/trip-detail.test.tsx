// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ImgHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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

describe("TripDetail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders entry titles in the list", async () => {
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
            data: [
              {
                id: "entry-1",
                tripId: "trip-1",
                title: "Roman morning",
                coverImageUrl: null,
                text: "Great day in Rome.",
                createdAt: "2025-05-02T00:00:00.000Z",
                updatedAt: "2025-05-02T00:00:00.000Z",
                media: [],
              },
            ],
            error: null,
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    render(<TripDetail tripId="trip-1" />);

    expect(await screen.findByText("Roman morning")).toBeInTheDocument();
  });
});
