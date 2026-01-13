// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ImgHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

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
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("TripOverview", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("renders entry cards with title, date, and preview image", () => {
    render(
      <LocaleProvider>
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
              tags: [],
              media: [{ url: "/uploads/entries/day-two-media.jpg" }],
            },
          ]}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText("Day two")).toBeInTheDocument();
    expect(screen.getByText("June 3rd, 2025")).toBeInTheDocument();
    expect(screen.getByAltText("Preview for Day two")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /day two/i })).toHaveAttribute(
      "href",
      "/entries/entry-2",
    );
  });

  it("renders German dates when locale is de", async () => {
    localStorage.setItem("travelblogs_locale", "de");

    render(
      <LocaleProvider>
        <TripOverview
          trip={{
            id: "trip-de",
            title: "Berlin days",
            startDate: "2025-06-01T12:00:00.000",
            endDate: "2025-06-08T12:00:00.000",
            coverImageUrl: null,
          }}
          entries={[
            {
              id: "entry-de",
              tripId: "trip-de",
              title: "Day drei",
              createdAt: "2025-06-03T12:00:00.000",
              coverImageUrl: "/uploads/entries/day-three.jpg",
              tags: [],
              media: [{ url: "/uploads/entries/day-three-media.jpg" }],
            },
          ]}
        />
      </LocaleProvider>,
    );

    expect(await screen.findByText("3. Juni 2025")).toBeInTheDocument();
  });

  it("renders an empty state when there are no entries", () => {
    render(
      <LocaleProvider>
        <TripOverview
          trip={{
            id: "trip-2",
            title: "Quiet Escape",
            startDate: "2025-07-01T00:00:00.000Z",
            endDate: "2025-07-05T00:00:00.000Z",
            coverImageUrl: null,
          }}
          entries={[]}
        />
      </LocaleProvider>,
    );

    expect(
      screen.getByText("No entries yet. Check back soon."),
    ).toBeInTheDocument();
  });

  it("uses a custom entry link base when provided", () => {
    render(
      <LocaleProvider>
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
              tags: [],
              media: [{ url: "/uploads/entries/day-nine-media.jpg" }],
            },
          ]}
          entryLinkBase="/trips/share/shared-token/entries"
        />
      </LocaleProvider>,
    );

    expect(screen.getByRole("link", { name: /day nine/i })).toHaveAttribute(
      "href",
      "/trips/share/shared-token/entries/entry-9",
    );
  });

  it("renders back to trips link when backToTripsHref is provided", () => {
    render(
      <LocaleProvider>
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
        />
      </LocaleProvider>,
    );

    const backLink = screen.getByRole("link", { name: /trips/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/trips");
  });

  it("does not render back link when backToTripsHref is not provided", () => {
    render(
      <LocaleProvider>
        <TripOverview
          trip={{
            id: "trip-5",
            title: "Trip without back link",
            startDate: "2025-06-01T00:00:00.000Z",
            endDate: "2025-06-08T00:00:00.000Z",
            coverImageUrl: null,
          }}
          entries={[]}
        />
      </LocaleProvider>,
    );

    expect(
      screen.queryByRole("link", { name: /trips/i }),
    ).not.toBeInTheDocument();
  });

  it("highlights the related entry when a map pin is selected", async () => {
    render(
      <LocaleProvider>
        <TripOverview
          trip={{
            id: "trip-map",
            title: "Map trip",
            startDate: "2025-06-01T00:00:00.000Z",
            endDate: "2025-06-08T00:00:00.000Z",
            coverImageUrl: null,
          }}
          entries={[
            {
              id: "entry-1",
              tripId: "trip-map",
              title: "First stop",
              createdAt: "2025-06-02T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/first.jpg",
              tags: [],
              media: [{ url: "/uploads/entries/first.jpg" }],
              location: {
                latitude: 48.8566,
                longitude: 2.3522,
                label: "Paris",
              },
            },
            {
              id: "entry-2",
              tripId: "trip-map",
              title: "Second stop",
              createdAt: "2025-06-03T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/second.jpg",
              tags: [],
              media: [{ url: "/uploads/entries/second.jpg" }],
              location: {
                latitude: 51.5074,
                longitude: -0.1278,
                label: "London",
              },
            },
          ]}
        />
      </LocaleProvider>,
    );

    const pin = await screen.findByRole("button", { name: "Second stop" });
    fireEvent.click(pin);

    const selectedEntry = screen.getByRole("link", { name: /second stop/i });
    expect(selectedEntry).toHaveAttribute("aria-current", "true");
  });

  it("shows the view full map action when a map href is provided", () => {
    vi.useFakeTimers();

    render(
      <LocaleProvider>
        <TripOverview
          trip={{
            id: "trip-map-link",
            title: "Map trip",
            startDate: "2025-06-01T00:00:00.000Z",
            endDate: "2025-06-08T00:00:00.000Z",
            coverImageUrl: null,
          }}
          entries={[
            {
              id: "entry-map",
              tripId: "trip-map-link",
              title: "Map stop",
              createdAt: "2025-06-02T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/map.jpg",
              tags: [],
              media: [{ url: "/uploads/entries/map.jpg" }],
              location: {
                latitude: 48.8566,
                longitude: 2.3522,
                label: "Paris",
              },
            },
          ]}
          mapHref="/trips/trip-map-link/map"
        />
      </LocaleProvider>,
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(
      screen.getByRole("link", { name: /view full map/i }),
    ).toHaveAttribute("href", "/trips/trip-map-link/map");

    vi.useRealTimers();
  });

  it("renders tag chips for entries that have tags", () => {
    render(
      <LocaleProvider>
        <TripOverview
          trip={{
            id: "trip-tags",
            title: "Tagged trip",
            startDate: "2025-06-01T00:00:00.000Z",
            endDate: "2025-06-08T00:00:00.000Z",
            coverImageUrl: null,
          }}
          entries={[
            {
              id: "entry-tags",
              tripId: "trip-tags",
              title: "Tag day",
              createdAt: "2025-06-03T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/tag-day.jpg",
              tags: ["Food", "Hike"],
              media: [{ url: "/uploads/entries/tag-day-media.jpg" }],
            },
          ]}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Hike")).toBeInTheDocument();
  });

  it("hides the tag container when an entry has no tags", () => {
    render(
      <LocaleProvider>
        <TripOverview
          trip={{
            id: "trip-no-tags",
            title: "No tags trip",
            startDate: "2025-06-01T00:00:00.000Z",
            endDate: "2025-06-08T00:00:00.000Z",
            coverImageUrl: null,
          }}
          entries={[
            {
              id: "entry-no-tags",
              tripId: "trip-no-tags",
              title: "No tag day",
              createdAt: "2025-06-03T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/no-tag-day.jpg",
              tags: [],
              media: [{ url: "/uploads/entries/no-tag-day-media.jpg" }],
            },
          ]}
        />
      </LocaleProvider>,
    );

    expect(screen.queryByText("Food")).not.toBeInTheDocument();
    expect(screen.queryByText("Hike")).not.toBeInTheDocument();
  });
});
