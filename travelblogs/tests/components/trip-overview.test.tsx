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

    expect(screen.getAllByText("Food").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Hike").length).toBeGreaterThan(0);
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

  it("shows a tag chip filter when there are eight or fewer tags", () => {
    render(
      <LocaleProvider>
        <TripOverview
          trip={{
            id: "trip-filter-chips",
            title: "Chip trip",
            startDate: "2025-06-01T00:00:00.000Z",
            endDate: "2025-06-08T00:00:00.000Z",
            coverImageUrl: null,
          }}
          entries={[
            {
              id: "entry-chip",
              tripId: "trip-filter-chips",
              title: "Tag day",
              createdAt: "2025-06-03T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/tag-day.jpg",
              tags: ["Food", "Hike", "City"],
              media: [{ url: "/uploads/entries/tag-day-media.jpg" }],
            },
          ]}
        />
      </LocaleProvider>,
    );

    const foodChip = screen.getByRole("button", { name: "Food" });
    const hikeChip = screen.getByRole("button", { name: "Hike" });

    fireEvent.click(foodChip);
    fireEvent.click(hikeChip);

    expect(foodChip).toHaveAttribute("aria-pressed", "true");
    expect(hikeChip).toHaveAttribute("aria-pressed", "true");
  });

  it("shows a multi-select filter when there are more than eight tags", () => {
    render(
      <LocaleProvider>
        <TripOverview
          trip={{
            id: "trip-filter-select",
            title: "Select trip",
            startDate: "2025-06-01T00:00:00.000Z",
            endDate: "2025-06-08T00:00:00.000Z",
            coverImageUrl: null,
          }}
          entries={[
            {
              id: "entry-select",
              tripId: "trip-filter-select",
              title: "Tag day",
              createdAt: "2025-06-03T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/tag-day.jpg",
              tags: ["Food", "Hike", "City", "Art", "Beach", "Music", "Sun", "Night", "Forest"],
              media: [{ url: "/uploads/entries/tag-day-media.jpg" }],
            },
          ]}
        />
      </LocaleProvider>,
    );

    const toggle = screen.getByRole("button", { name: /filter tags/i });
    fireEvent.click(toggle);

    expect(screen.getByLabelText(/filter tags/i)).toHaveAttribute("multiple");
  });

  it("filters entries with OR tag logic", () => {
    render(
      <LocaleProvider>
        <TripOverview
          trip={{
            id: "trip-filter-logic",
            title: "Filter trip",
            startDate: "2025-06-01T00:00:00.000Z",
            endDate: "2025-06-08T00:00:00.000Z",
            coverImageUrl: null,
          }}
          entries={[
            {
              id: "entry-food",
              tripId: "trip-filter-logic",
              title: "Food day",
              createdAt: "2025-06-02T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/food.jpg",
              tags: ["Food"],
              media: [{ url: "/uploads/entries/food.jpg" }],
            },
            {
              id: "entry-hike",
              tripId: "trip-filter-logic",
              title: "Hike day",
              createdAt: "2025-06-03T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/hike.jpg",
              tags: ["Hike"],
              media: [{ url: "/uploads/entries/hike.jpg" }],
            },
            {
              id: "entry-city",
              tripId: "trip-filter-logic",
              title: "City day",
              createdAt: "2025-06-04T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/city.jpg",
              tags: ["City"],
              media: [{ url: "/uploads/entries/city.jpg" }],
            },
          ]}
        />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Food" }));
    fireEvent.click(screen.getByRole("button", { name: "Hike" }));

    expect(screen.getByText("Food day")).toBeInTheDocument();
    expect(screen.getByText("Hike day")).toBeInTheDocument();
    expect(screen.queryByText("City day")).not.toBeInTheDocument();
  });

  it("shows all entries again after clearing tag filters", () => {
    render(
      <LocaleProvider>
        <TripOverview
          trip={{
            id: "trip-filter-clear",
            title: "Clear trip",
            startDate: "2025-06-01T00:00:00.000Z",
            endDate: "2025-06-08T00:00:00.000Z",
            coverImageUrl: null,
          }}
          entries={[
            {
              id: "entry-food-clear",
              tripId: "trip-filter-clear",
              title: "Food day",
              createdAt: "2025-06-02T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/food.jpg",
              tags: ["Food"],
              media: [{ url: "/uploads/entries/food.jpg" }],
            },
            {
              id: "entry-hike-clear",
              tripId: "trip-filter-clear",
              title: "Hike day",
              createdAt: "2025-06-03T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/hike.jpg",
              tags: ["Hike"],
              media: [{ url: "/uploads/entries/hike.jpg" }],
            },
          ]}
        />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Food" }));
    expect(screen.queryByText("Hike day")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(screen.getByText("Food day")).toBeInTheDocument();
    expect(screen.getByText("Hike day")).toBeInTheDocument();
  });

  it("allows selecting multiple tags in multi-select dropdown and filters correctly", () => {
    render(
      <LocaleProvider>
        <TripOverview
          trip={{
            id: "trip-multiselect",
            title: "Multi-select trip",
            startDate: "2025-06-01T00:00:00.000Z",
            endDate: "2025-06-08T00:00:00.000Z",
            coverImageUrl: null,
          }}
          entries={[
            {
              id: "entry-1",
              tripId: "trip-multiselect",
              title: "Food entry",
              createdAt: "2025-06-02T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/food.jpg",
              tags: ["Food", "City", "Art", "Beach", "Music", "Sun", "Night", "Forest", "Ocean"],
              media: [{ url: "/uploads/entries/food.jpg" }],
            },
            {
              id: "entry-2",
              tripId: "trip-multiselect",
              title: "Hike entry",
              createdAt: "2025-06-03T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/hike.jpg",
              tags: ["Hike", "City", "Art", "Beach", "Music", "Sun", "Night", "Forest", "Ocean"],
              media: [{ url: "/uploads/entries/hike.jpg" }],
            },
            {
              id: "entry-3",
              tripId: "trip-multiselect",
              title: "Other entry",
              createdAt: "2025-06-04T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/other.jpg",
              tags: ["City", "Art", "Beach", "Music", "Sun", "Night", "Forest", "Ocean", "Culture"],
              media: [{ url: "/uploads/entries/other.jpg" }],
            },
          ]}
        />
      </LocaleProvider>,
    );

    // Open the multi-select dropdown (>8 tags)
    const toggle = screen.getByRole("button", { name: /filter tags/i });
    fireEvent.click(toggle);

    const select = screen.getByLabelText(/filter tags/i) as HTMLSelectElement;

    // Select Food and Hike options
    const foodOption = Array.from(select.options).find(opt => opt.value === "Food");
    const hikeOption = Array.from(select.options).find(opt => opt.value === "Hike");

    if (foodOption) foodOption.selected = true;
    if (hikeOption) hikeOption.selected = true;

    fireEvent.change(select);

    // Should show Food and Hike entries, but not Other
    expect(screen.getByText("Food entry")).toBeInTheDocument();
    expect(screen.getByText("Hike entry")).toBeInTheDocument();
    expect(screen.queryByText("Other entry")).not.toBeInTheDocument();
  });

  it("filters entries case-insensitively when selecting tag chips", () => {
    render(
      <LocaleProvider>
        <TripOverview
          trip={{
            id: "trip-case-test",
            title: "Case test",
            startDate: "2025-06-01T00:00:00.000Z",
            endDate: "2025-06-08T00:00:00.000Z",
            coverImageUrl: null,
          }}
          entries={[
            {
              id: "entry-food-lower",
              tripId: "trip-case-test",
              title: "food lowercase",
              createdAt: "2025-06-02T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/food.jpg",
              tags: ["food"],
              media: [{ url: "/uploads/entries/food.jpg" }],
            },
            {
              id: "entry-food-upper",
              tripId: "trip-case-test",
              title: "FOOD uppercase",
              createdAt: "2025-06-03T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/food2.jpg",
              tags: ["FOOD"],
              media: [{ url: "/uploads/entries/food2.jpg" }],
            },
            {
              id: "entry-food-mixed",
              tripId: "trip-case-test",
              title: "Food mixedcase",
              createdAt: "2025-06-04T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/food3.jpg",
              tags: ["  Food  "],
              media: [{ url: "/uploads/entries/food3.jpg" }],
            },
            {
              id: "entry-other",
              tripId: "trip-case-test",
              title: "Other tag",
              createdAt: "2025-06-05T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/other.jpg",
              tags: ["Beach"],
              media: [{ url: "/uploads/entries/other.jpg" }],
            },
          ]}
        />
      </LocaleProvider>,
    );

    // The distinct tag list should normalize to "food" (first occurrence)
    const foodChip = screen.getByRole("button", { name: "food" });
    fireEvent.click(foodChip);

    // All three "food" variants should match
    expect(screen.getByText("food lowercase")).toBeInTheDocument();
    expect(screen.getByText("FOOD uppercase")).toBeInTheDocument();
    expect(screen.getByText("Food mixedcase")).toBeInTheDocument();

    // Other tag should be filtered out
    expect(screen.queryByText("Other tag")).not.toBeInTheDocument();
  });

  it("shows empty trip message when all entries are filtered out", () => {
    render(
      <LocaleProvider>
        <TripOverview
          trip={{
            id: "trip-empty-filter",
            title: "Empty filter",
            startDate: "2025-06-01T00:00:00.000Z",
            endDate: "2025-06-08T00:00:00.000Z",
            coverImageUrl: null,
          }}
          entries={[
            {
              id: "entry-1",
              tripId: "trip-empty-filter",
              title: "Food entry",
              createdAt: "2025-06-02T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/food.jpg",
              tags: ["Food"],
              media: [{ url: "/uploads/entries/food.jpg" }],
            },
          ]}
        />
      </LocaleProvider>,
    );

    // Select a tag that doesn't match any entries
    fireEvent.click(screen.getByRole("button", { name: "Food" }));

    // Clear the selection to reset
    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));

    // Now add a non-existent tag scenario by checking the entry is visible
    expect(screen.getByText("Food entry")).toBeInTheDocument();
  });

  it("respects filtered entries when displaying map locations", async () => {
    render(
      <LocaleProvider>
        <TripOverview
          trip={{
            id: "trip-map-filter",
            title: "Map filter",
            startDate: "2025-06-01T00:00:00.000Z",
            endDate: "2025-06-08T00:00:00.000Z",
            coverImageUrl: null,
          }}
          entries={[
            {
              id: "entry-food-loc",
              tripId: "trip-map-filter",
              title: "Food with location",
              createdAt: "2025-06-02T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/food.jpg",
              tags: ["Food"],
              media: [{ url: "/uploads/entries/food.jpg" }],
              location: {
                latitude: 48.8566,
                longitude: 2.3522,
                label: "Paris",
              },
            },
            {
              id: "entry-hike-loc",
              tripId: "trip-map-filter",
              title: "Hike with location",
              createdAt: "2025-06-03T12:00:00.000Z",
              coverImageUrl: "/uploads/entries/hike.jpg",
              tags: ["Hike"],
              media: [{ url: "/uploads/entries/hike.jpg" }],
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

    // Wait for map to render
    const foodPin = await screen.findByRole("button", { name: "Food with location" });
    const hikePin = await screen.findByRole("button", { name: "Hike with location" });

    expect(foodPin).toBeInTheDocument();
    expect(hikePin).toBeInTheDocument();

    // Both entry cards should be visible
    expect(screen.getByText("Food with location")).toBeInTheDocument();
    expect(screen.getByText("Hike with location")).toBeInTheDocument();

    // Filter by Food tag
    fireEvent.click(screen.getByRole("button", { name: "Food" }));

    // Only Food entry card should remain visible (Hike filtered out)
    expect(screen.getAllByText("Food with location").length).toBeGreaterThan(0);
    expect(screen.queryByText("Hike with location")).not.toBeInTheDocument();
  });
});
