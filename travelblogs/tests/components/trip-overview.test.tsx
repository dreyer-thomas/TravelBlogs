// @vitest-environment jsdom
import type { ImgHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import TripOverview from "../../src/components/trips/trip-overview";

vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    unoptimized: _unoptimized,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("TripOverview", () => {
  it("renders entry cards with title, date, and preview image", () => {
    render(
      <TripOverview
        trip={{
          id: "trip-1",
          title: "Atlas Adventure",
          startDate: "2025-06-01T00:00:00.000Z",
          endDate: "2025-06-08T00:00:00.000Z",
          coverImageUrl: null,
        }}
        entries={[
          {
            id: "entry-2",
            tripId: "trip-1",
            title: "Day two",
            createdAt: "2025-06-03T12:00:00.000Z",
            coverImageUrl: "/uploads/entries/day-two.jpg",
            media: [{ url: "/uploads/entries/day-two-media.jpg" }],
          },
        ]}
      />,
    );

    expect(screen.getByText("Day two")).toBeInTheDocument();
    expect(screen.getByText("Jun 3, 2025")).toBeInTheDocument();
    expect(screen.getByAltText("Preview for Day two")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /day two/i })).toHaveAttribute(
      "href",
      "/entries/entry-2",
    );
  });

  it("renders an empty state when there are no entries", () => {
    render(
      <TripOverview
        trip={{
          id: "trip-2",
          title: "Quiet Escape",
          startDate: "2025-07-01T00:00:00.000Z",
          endDate: "2025-07-05T00:00:00.000Z",
          coverImageUrl: null,
        }}
        entries={[]}
      />,
    );

    expect(
      screen.getByText("No entries yet. Check back soon."),
    ).toBeInTheDocument();
  });
});
