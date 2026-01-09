// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ImgHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import TripOverview from "../../src/components/trips/trip-overview";

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    const { fill, unoptimized, priority, ...rest } = props;
    return (
      <img
        {...rest}
        data-fill={fill ? "true" : undefined}
        data-unoptimized={unoptimized ? "true" : undefined}
        data-priority={priority ? "true" : undefined}
      />
    );
  },
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

  it("uses a custom entry link base when provided", () => {
    render(
      <TripOverview
        trip={{
          id: "trip-3",
          title: "Shared trip",
          startDate: "2025-06-01T00:00:00.000Z",
          endDate: "2025-06-08T00:00:00.000Z",
          coverImageUrl: null,
        }}
        entries={[
          {
            id: "entry-9",
            tripId: "trip-3",
            title: "Day nine",
            createdAt: "2025-06-09T12:00:00.000Z",
            coverImageUrl: "/uploads/entries/day-nine.jpg",
            media: [{ url: "/uploads/entries/day-nine-media.jpg" }],
          },
        ]}
        entryLinkBase="/trips/share/shared-token/entries"
      />,
    );

    expect(screen.getByRole("link", { name: /day nine/i })).toHaveAttribute(
      "href",
      "/trips/share/shared-token/entries/entry-9",
    );
  });

  it("renders back to trips link when backToTripsHref is provided", () => {
    render(
      <TripOverview
        trip={{
          id: "trip-4",
          title: "Trip with back link",
          startDate: "2025-06-01T00:00:00.000Z",
          endDate: "2025-06-08T00:00:00.000Z",
          coverImageUrl: null,
        }}
        entries={[]}
        backToTripsHref="/trips"
      />,
    );

    const backLink = screen.getByRole("link", { name: /back to trips/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/trips");
  });

  it("does not render back link when backToTripsHref is not provided", () => {
    render(
      <TripOverview
        trip={{
          id: "trip-5",
          title: "Trip without back link",
          startDate: "2025-06-01T00:00:00.000Z",
          endDate: "2025-06-08T00:00:00.000Z",
          coverImageUrl: null,
        }}
        entries={[]}
      />,
    );

    expect(
      screen.queryByRole("link", { name: /back to trips/i }),
    ).not.toBeInTheDocument();
  });
});
