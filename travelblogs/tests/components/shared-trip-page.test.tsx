// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ImgHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import TripOverview from "../../src/components/trips/trip-overview";
import { LocaleProvider } from "../../src/utils/locale-context";

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

describe("Shared Trip Page Navigation", () => {
  it("renders back to trips link on shared trip overview", () => {
    render(
      <LocaleProvider>
        <TripOverview
          trip={{
            id: "trip-shared-1",
            title: "Shared Adventure",
            startDate: "2025-06-01T00:00:00.000Z",
            endDate: "2025-06-08T00:00:00.000Z",
            coverImageUrl: null,
          }}
          entries={[
            {
              id: "entry-1",
              tripId: "trip-shared-1",
              title: "Day one",
              createdAt: "2025-06-02T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/day-one.jpg",
              media: [{ url: "/uploads/entries/day-one-media.jpg" }],
            },
          ]}
          entryLinkBase="/trips/share/abc123/entries"
          backToTripsHref="/trips"
        />
      </LocaleProvider>,
    );

    const backLink = screen.getByRole("link", { name: /trips/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/trips");
  });

  it("entry links use shared base when provided with back navigation", () => {
    render(
      <LocaleProvider>
        <TripOverview
          trip={{
            id: "trip-shared-2",
            title: "Another Shared Trip",
            startDate: "2025-06-01T00:00:00.000Z",
            endDate: "2025-06-08T00:00:00.000Z",
            coverImageUrl: null,
          }}
          entries={[
            {
              id: "entry-5",
              tripId: "trip-shared-2",
              title: "Day five",
              createdAt: "2025-06-06T12:00:00.000Z",
              coverImageUrl: null,
              media: [],
            },
          ]}
          entryLinkBase="/trips/share/xyz789/entries"
          backToTripsHref="/trips"
        />
      </LocaleProvider>,
    );

    expect(screen.getByRole("link", { name: /trips/i })).toHaveAttribute(
      "href",
      "/trips",
    );
    expect(screen.getByRole("link", { name: /day five/i })).toHaveAttribute(
      "href",
      "/trips/share/xyz789/entries/entry-5",
    );
  });
});
