// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ImgHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";

import EntryDetail from "../../src/components/entries/entry-detail";
import { countryCodeToFlag, countryCodeToName } from "../../src/utils/country-flag";
import { LocaleProvider } from "../../src/utils/locale-context";

const mapMock = vi.fn(() => ({
  fitBounds: vi.fn().mockReturnThis(),
  setView: vi.fn().mockReturnThis(),
  remove: vi.fn(),
}));

const markerMock = vi.fn(() => ({
  addTo: vi.fn().mockReturnThis(),
  remove: vi.fn(),
  bindPopup: vi.fn().mockReturnThis(),
  on: vi.fn(),
  once: vi.fn(),
  openPopup: vi.fn(),
  closePopup: vi.fn(),
  getPopup: vi.fn(() => ({
    getElement: vi.fn(() => null),
  })),
}));

const tileLayerMock = vi.fn(() => ({
  addTo: vi.fn(),
}));

const mergeOptionsMock = vi.fn();

const latLngBoundsMock = vi.fn(() => ({
  isValid: vi.fn(() => true),
}));

vi.mock("leaflet", () => ({
  map: mapMock,
  tileLayer: tileLayerMock,
  marker: markerMock,
  latLngBounds: latLngBoundsMock,
  Icon: {
    Default: {
      mergeOptions: mergeOptionsMock,
    },
  },
}));

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    const { fill, priority, unoptimized, ...rest } = props;
    return (
      <img
        {...rest}
        data-fill={fill ? "true" : undefined}
        data-unoptimized={unoptimized ? "true" : undefined}
      />
    );
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const renderWithProvider = (component: JSX.Element) =>
  render(<LocaleProvider>{component}</LocaleProvider>);

describe("EntryDetail", () => {
  it("renders the entry title in the header", async () => {
    renderWithProvider(
      <EntryDetail
        entry={{
          id: "entry-1",
          tripId: "trip-1",
          title: "Sunset in Positano",
          coverImageUrl: null,
          text: "Golden hour on the cliffs.",
          createdAt: "2025-05-03T12:00:00.000Z",
          updatedAt: "2025-05-03T00:00:00.000Z",
          media: [],
        }}
        canEdit
        canDelete
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Sunset in Positano" }),
    ).toBeInTheDocument();
    expect(screen.getByText("May 3rd, 2025")).toBeInTheDocument();
  });

  it("renders a country flag when location country code is available", () => {
    const flag = countryCodeToFlag("JP");
    if (!flag) {
      throw new Error("Expected country flag for JP");
    }
    const name = countryCodeToName("JP", "en");

    renderWithProvider(
      <EntryDetail
        entry={{
          id: "entry-flag",
          tripId: "trip-flag",
          title: "Tokyo night",
          coverImageUrl: null,
          text: "Shibuya crossing.",
          createdAt: "2025-05-03T12:00:00.000Z",
          updatedAt: "2025-05-03T00:00:00.000Z",
          media: [],
          location: {
            latitude: 35.6762,
            longitude: 139.6503,
            label: "Tokyo",
            countryCode: "JP",
          },
        }}
        canEdit={false}
        canDelete={false}
      />,
    );

    expect(screen.getByText(flag)).toBeInTheDocument();
    if (name) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("renders weather details in English when weather data exists", () => {
    const countryName = countryCodeToName("US", "en");

    render(
      <LocaleProvider initialLocale="en">
        <EntryDetail
          entry={{
            id: "entry-weather-en",
            tripId: "trip-weather",
            title: "Desert sun",
            coverImageUrl: null,
            text: "Bright skies.",
            createdAt: "2025-05-03T12:00:00.000Z",
            updatedAt: "2025-05-03T00:00:00.000Z",
            media: [],
            location: {
              latitude: 36.1699,
              longitude: -115.1398,
              label: "Las Vegas",
              countryCode: "US",
            },
            weatherCondition: "Clear",
            weatherTemperature: 24,
            weatherIconCode: "0",
          }}
          canEdit={false}
          canDelete={false}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText("☀️")).toBeInTheDocument();
    expect(screen.getByText("75°F")).toBeInTheDocument();
    if (countryName) {
      const locationMeta = screen.getByText(countryName).parentElement;
      expect(locationMeta).toContainElement(screen.getByText("75°F"));
    }
  });

  it("renders weather details in German when locale is de", () => {
    render(
      <LocaleProvider initialLocale="de">
        <EntryDetail
          entry={{
            id: "entry-weather-de",
            tripId: "trip-weather",
            title: "Berlin breeze",
            coverImageUrl: null,
            text: "Cool morning.",
            createdAt: "2025-05-03T12:00:00.000Z",
            updatedAt: "2025-05-03T00:00:00.000Z",
            media: [],
            location: {
              latitude: 52.52,
              longitude: 13.405,
              label: "Berlin",
              countryCode: "DE",
            },
            weatherCondition: "Clear",
            weatherTemperature: 24,
            weatherIconCode: "0",
          }}
          canEdit={false}
          canDelete={false}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText("☀️")).toBeInTheDocument();
    expect(screen.getByText("24°C")).toBeInTheDocument();
  });

  it("does not render weather when data is missing", () => {
    renderWithProvider(
      <EntryDetail
        entry={{
          id: "entry-weather-missing",
          tripId: "trip-weather",
          title: "Cloudy",
          coverImageUrl: null,
          text: "No weather data.",
          createdAt: "2025-05-03T12:00:00.000Z",
          updatedAt: "2025-05-03T00:00:00.000Z",
          media: [],
          location: {
            latitude: 52.52,
            longitude: 13.405,
            label: "Berlin",
            countryCode: "DE",
          },
          weatherCondition: null,
          weatherTemperature: 24,
          weatherIconCode: "0",
        }}
        canEdit={false}
        canDelete={false}
      />,
    );

    expect(screen.queryByText("☀️")).not.toBeInTheDocument();
    expect(screen.queryByText("24°C")).not.toBeInTheDocument();
  });

  it("does not render a country flag when no country code exists", () => {
    const flag = countryCodeToFlag("US");
    if (!flag) {
      throw new Error("Expected country flag for US");
    }

    renderWithProvider(
      <EntryDetail
        entry={{
          id: "entry-no-flag",
          tripId: "trip-no-flag",
          title: "Unknown country",
          coverImageUrl: null,
          text: "No country attached.",
          createdAt: "2025-05-03T12:00:00.000Z",
          updatedAt: "2025-05-03T00:00:00.000Z",
          media: [],
          location: {
            latitude: 0,
            longitude: 0,
            label: "Somewhere",
            countryCode: null,
          },
        }}
        canEdit={false}
        canDelete={false}
      />,
    );

    expect(screen.queryByText(flag)).not.toBeInTheDocument();
  });

  it("renders Tiptap JSON content as rich text", async () => {
    const tiptapJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Rich text body" }],
        },
      ],
    });

    renderWithProvider(
      <EntryDetail
        entry={{
          id: "entry-json",
          tripId: "trip-1",
          title: "Rich text entry",
          coverImageUrl: null,
          text: tiptapJson,
          createdAt: "2025-05-03T12:00:00.000Z",
          updatedAt: "2025-05-03T00:00:00.000Z",
          media: [],
        }}
        canEdit
        canDelete
      />,
    );

    expect(await screen.findByText("Rich text body")).toBeInTheDocument();
    expect(screen.queryByText(tiptapJson)).not.toBeInTheDocument();
  });

  it("opens and closes the photo viewer from inline content", async () => {
    renderWithProvider(
      <EntryDetail
        entry={{
          id: "entry-2",
          tripId: "trip-1",
          title: "City night walk",
          coverImageUrl: null,
          text: "Look ![Neon sign](https://example.com/photo-1700000000-inline.jpg) here.",
          createdAt: "2025-05-03T00:00:00.000Z",
          updatedAt: "2025-05-03T00:00:00.000Z",
          media: [
            {
              id: "media-1",
              url: "https://example.com/photo-1700000100-media.jpg",
              createdAt: "2025-05-03T00:00:00.000Z",
            },
          ],
        }}
        canEdit
        canDelete
      />,
    );

    const openButtons = await screen.findAllByRole("button", {
      name: /open photo/i,
    });

    fireEvent.click(openButtons[0]);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByText("1 of 2")).not.toBeInTheDocument();

    fireEvent.click(dialog);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("supports keyboard navigation in the photo viewer", async () => {
    renderWithProvider(
      <EntryDetail
        entry={{
          id: "entry-3",
          tripId: "trip-1",
          title: "City night walk",
          coverImageUrl: null,
          text: "Look ![Neon sign](https://example.com/photo-1700000000-inline.jpg) here.",
          createdAt: "2025-05-03T00:00:00.000Z",
          updatedAt: "2025-05-03T00:00:00.000Z",
          media: [
            {
              id: "media-1",
              url: "https://example.com/photo-1700000100-media.jpg",
              createdAt: "2025-05-03T00:00:00.000Z",
            },
          ],
        }}
        canEdit
        canDelete
      />,
    );

    const openButtons = await screen.findAllByRole("button", {
      name: /open photo/i,
    });

    fireEvent.click(openButtons[0]);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByAltText("Neon sign")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(within(dialog).getByAltText("Entry photo")).toBeInTheDocument();
    expect(
      within(dialog).queryByAltText("Neon sign"),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the viewer from the media grid at the correct index", async () => {
    renderWithProvider(
      <EntryDetail
        entry={{
          id: "entry-4",
          tripId: "trip-1",
          title: "Coastal morning",
          coverImageUrl: null,
          text: "Inline ![Sea](https://example.com/photo-1700000000-inline.jpg) image.",
          createdAt: "2025-05-03T00:00:00.000Z",
          updatedAt: "2025-05-03T00:00:00.000Z",
          media: [
            {
              id: "media-2",
              url: "https://example.com/photo-1700000100-media.jpg",
              createdAt: "2025-05-03T00:00:00.000Z",
            },
          ],
        }}
        canEdit
        canDelete
      />,
    );

    const mediaButton = await screen.findByRole("button", {
      name: /open photo 2/i,
    });

    fireEvent.click(mediaButton);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByAltText("Entry photo")).toBeInTheDocument();
  });

  it("starts a slideshow and auto-advances with looping", async () => {
    vi.useFakeTimers();

    try {
      renderWithProvider(
        <EntryDetail
          entry={{
            id: "entry-5",
            tripId: "trip-2",
            title: "Night market",
            coverImageUrl: null,
            text: "Street food shots.",
            createdAt: "2025-05-04T00:00:00.000Z",
            updatedAt: "2025-05-04T00:00:00.000Z",
            media: [
              {
                id: "media-3",
                url: "https://example.com/photo-1700000200-media.jpg",
                createdAt: "2025-05-04T00:00:00.000Z",
              },
              {
                id: "media-4",
                url: "https://example.com/photo-1700000300-media.jpg",
                createdAt: "2025-05-04T00:00:00.000Z",
              },
            ],
          }}
          canEdit
          canDelete
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: /start slideshow/i }),
      );
      await act(async () => {});

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      const firstImages = screen.getAllByRole("img", {
        name: "Entry photo",
      });
      expect(
        firstImages.some(
          (img) =>
            img.getAttribute("src") ===
            "https://example.com/photo-1700000200-media.jpg",
        ),
      ).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      const secondImages = screen.getAllByRole("img", {
        name: "Entry photo",
      });
      expect(
        secondImages.some(
          (img) =>
            img.getAttribute("src") ===
            "https://example.com/photo-1700000300-media.jpg",
        ),
      ).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      const loopImages = screen.getAllByRole("img", {
        name: "Entry photo",
      });
      expect(
        loopImages.some(
          (img) =>
            img.getAttribute("src") ===
            "https://example.com/photo-1700000200-media.jpg",
        ),
      ).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("exits the slideshow on click", async () => {
    renderWithProvider(
      <EntryDetail
        entry={{
          id: "entry-6",
          tripId: "trip-3",
          title: "Hidden cafe",
          coverImageUrl: null,
          text: "Latte art memories.",
          createdAt: "2025-05-05T00:00:00.000Z",
          updatedAt: "2025-05-05T00:00:00.000Z",
          media: [
            {
              id: "media-5",
              url: "https://example.com/photo-1700000400-media.jpg",
              createdAt: "2025-05-05T00:00:00.000Z",
            },
            {
              id: "media-6",
              url: "https://example.com/photo-1700000500-media.jpg",
              createdAt: "2025-05-05T00:00:00.000Z",
            },
          ],
        }}
        canEdit
        canDelete
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /start slideshow/i }),
    );
    await act(async () => {});

    const dialog = screen.getByRole("dialog");

    fireEvent.click(dialog);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("hides delete actions for contributors without delete access", () => {
    renderWithProvider(
      <EntryDetail
        entry={{
          id: "entry-7",
          tripId: "trip-3",
          title: "Contributor entry",
          coverImageUrl: null,
          text: "Notes from the road.",
          createdAt: "2025-05-06T00:00:00.000Z",
          updatedAt: "2025-05-06T00:00:00.000Z",
          media: [],
        }}
        canEdit
        canDelete={false}
      />,
    );

    expect(screen.getByText("Edit Entry")).toBeInTheDocument();
    expect(screen.queryByText("Delete Entry")).not.toBeInTheDocument();
  });

  it("hides entry actions for view-only users", () => {
    renderWithProvider(
      <EntryDetail
        entry={{
          id: "entry-8",
          tripId: "trip-4",
          title: "View only entry",
          coverImageUrl: null,
          text: "Read-only memories.",
          createdAt: "2025-05-07T00:00:00.000Z",
          updatedAt: "2025-05-07T00:00:00.000Z",
          media: [],
        }}
        canEdit={false}
        canDelete={false}
      />,
    );

    expect(screen.queryByText("Entry actions")).not.toBeInTheDocument();
    expect(screen.queryByText("Edit entry")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete entry")).not.toBeInTheDocument();
  });

  it("renders the location section when a label is available", () => {
    renderWithProvider(
      <EntryDetail
        entry={{
          id: "entry-9",
          tripId: "trip-4",
          title: "City break",
          coverImageUrl: null,
          text: "Exploring the center.",
          createdAt: "2025-05-08T00:00:00.000Z",
          updatedAt: "2025-05-08T00:00:00.000Z",
          media: [],
          location: {
            latitude: 52.52,
            longitude: 13.405,
            label: "Berlin",
          },
        }}
        canEdit={false}
        canDelete={false}
      />,
    );

    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("Berlin")).toBeInTheDocument();
  });

  it("renders coordinates when location label is missing", () => {
    renderWithProvider(
      <EntryDetail
        entry={{
          id: "entry-10",
          tripId: "trip-4",
          title: "Harbor walk",
          coverImageUrl: null,
          text: "Seaside air.",
          createdAt: "2025-05-09T00:00:00.000Z",
          updatedAt: "2025-05-09T00:00:00.000Z",
          media: [],
          location: {
            latitude: 52.52,
            longitude: 13.405,
            label: null,
          },
        }}
        canEdit={false}
        canDelete={false}
      />,
    );

    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("52.5200, 13.4050")).toBeInTheDocument();
  });

  it("hides the location section when no location exists", () => {
    renderWithProvider(
      <EntryDetail
        entry={{
          id: "entry-11",
          tripId: "trip-4",
          title: "No location",
          coverImageUrl: null,
          text: "No pin.",
          createdAt: "2025-05-10T00:00:00.000Z",
          updatedAt: "2025-05-10T00:00:00.000Z",
          media: [],
          location: null,
        }}
        canEdit={false}
        canDelete={false}
      />,
    );

    expect(screen.queryByText("Location")).not.toBeInTheDocument();
  });

  it("renders a map when trip locations are available", () => {
    renderWithProvider(
      <EntryDetail
        entry={{
          id: "entry-12",
          tripId: "trip-5",
          title: "Map stop",
          coverImageUrl: null,
          text: "Map view.",
          createdAt: "2025-05-12T00:00:00.000Z",
          updatedAt: "2025-05-12T00:00:00.000Z",
          media: [],
          location: {
            latitude: 52.52,
            longitude: 13.405,
            label: "Berlin",
          },
        }}
        canEdit={false}
        canDelete={false}
        tripLocations={[
          {
            entryId: "entry-12",
            title: "Map stop",
            location: {
              latitude: 52.52,
              longitude: 13.405,
              label: "Berlin",
            },
          },
          {
            entryId: "entry-13",
            title: "Next stop",
            location: {
              latitude: 48.1372,
              longitude: 11.5756,
              label: "Munich",
            },
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Entry location map" }),
    ).toBeInTheDocument();
  });

  it("renders coordinates when location label is empty string", () => {
    renderWithProvider(
      <EntryDetail
        entry={{
          id: "entry-13",
          tripId: "trip-4",
          title: "Empty label",
          coverImageUrl: null,
          text: "Blank label fallback.",
          createdAt: "2025-05-11T00:00:00.000Z",
          updatedAt: "2025-05-11T00:00:00.000Z",
          media: [],
          location: {
            latitude: 52.52,
            longitude: 13.405,
            label: "",
          },
        }}
        canEdit={false}
        canDelete={false}
      />,
    );

    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("52.5200, 13.4050")).toBeInTheDocument();
  });

  it("renders location label in German when locale is de", () => {
    render(
      <LocaleProvider initialLocale="de">
        <EntryDetail
          entry={{
            id: "entry-14",
            tripId: "trip-6",
            title: "German test",
            coverImageUrl: null,
            text: "Testing German.",
            createdAt: "2025-05-13T00:00:00.000Z",
            updatedAt: "2025-05-13T00:00:00.000Z",
            media: [],
            location: {
              latitude: 48.8566,
              longitude: 2.3522,
              label: "Paris",
            },
          }}
          canEdit={false}
          canDelete={false}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText("Ort")).toBeInTheDocument();
    expect(screen.getByText("Paris")).toBeInTheDocument();
  });
});
