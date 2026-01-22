// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ImgHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import EntryReader from "../../src/components/entries/entry-reader";
import { countryCodeToFlag, countryCodeToName } from "../../src/utils/country-flag";
import { LocaleProvider } from "../../src/utils/locale-context";
import * as entryFormat from "../../src/utils/entry-format";

const mapMock = vi.fn(() => ({
  setView: vi.fn().mockReturnThis(),
  remove: vi.fn(),
}));

const markerMock = vi.fn(() => ({
  addTo: vi.fn().mockReturnThis(),
  remove: vi.fn(),
}));

const tileLayerMock = vi.fn(() => ({
  addTo: vi.fn(),
}));

const mergeOptionsMock = vi.fn();

vi.mock("leaflet", () => ({
  map: mapMock,
  tileLayer: tileLayerMock,
  marker: markerMock,
  Icon: {
    Default: {
      mergeOptions: mergeOptionsMock,
    },
  },
}));

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    const { priority, unoptimized, fill, ...rest } = props;
    return (
      <img
        {...rest}
        data-priority={priority ? "true" : undefined}
        data-unoptimized={unoptimized ? "true" : undefined}
        data-fill={fill ? "true" : undefined}
      />
    );
  },
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("EntryReader", () => {
  it("renders a hero image and the remaining media in the gallery", () => {
    render(
      <LocaleProvider>
        <EntryReader
        entry={{
          id: "entry-1",
          title: "Morning in Kyoto",
          body: "Temple walks and tea breaks.",
          createdAt: "2025-05-03T12:00:00.000Z",
          tags: [],
          media: [
            {
              id: "media-1",
              url: "https://example.com/hero.jpg",
              width: 1600,
              height: 1000,
              alt: "Torii gates",
            },
            {
              id: "media-2",
              url: "https://example.com/gallery-1.jpg",
              width: 1200,
              height: 900,
              alt: "Tea set",
            },
            {
              id: "media-3",
              url: "https://example.com/gallery-2.jpg",
              width: 1200,
              height: 900,
              alt: "Garden path",
            },
          ],
        }}
        />
      </LocaleProvider>,
    );

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(4);
    expect(images[0]).toHaveAttribute("src", "https://example.com/hero.jpg");
    expect(images[0]).toHaveAttribute("width", "1600");
    expect(images[0]).toHaveAttribute("height", "1000");
    expect(images[0]).toHaveAttribute("loading", "lazy");

    expect(screen.getByText("May 3rd, 2025")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "More moments" }),
    ).toBeInTheDocument();
  });

  it("renders a video hero with playback controls", () => {
    const { container } = render(
      <LocaleProvider>
        <EntryReader
          entry={{
            id: "entry-video-hero",
            title: "Video hero",
            body: "A day in motion.",
            createdAt: "2025-05-04T12:00:00.000Z",
            tags: [],
            media: [
              {
                id: "media-video",
                url: "https://example.com/hero.mp4",
              },
              {
                id: "media-image",
                url: "https://example.com/gallery.jpg",
                width: 1200,
                height: 900,
              },
            ],
          }}
        />
      </LocaleProvider>,
    );

    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute("controls");
  });

  it("renders tags on the hero image when tags exist", () => {
    render(
      <LocaleProvider>
        <EntryReader
          entry={{
            id: "entry-tags",
            title: "Tag showcase",
            body: "Tag overlay test.",
            createdAt: "2025-05-09T00:00:00.000Z",
            tags: ["Cafes", "Night"],
            media: [
              {
                id: "media-tags",
                url: "https://example.com/hero-tags.jpg",
                width: 1600,
                height: 1000,
              },
            ],
          }}
        />
      </LocaleProvider>,
    );

    const tagList = screen.getByLabelText("Tags");
    expect(tagList).toBeInTheDocument();
    expect(tagList.parentElement).toHaveClass("absolute", "right-0", "top-0");
    expect(screen.getByText("Cafes")).toBeInTheDocument();
    expect(screen.getByText("Night")).toBeInTheDocument();
  });

  it("renders tags on the hero image in shared view", () => {
    render(
      <LocaleProvider>
        <EntryReader
          isSharedView
          entry={{
            id: "entry-shared-tags",
            title: "Shared with tags",
            body: "Tags in shared view.",
            createdAt: "2025-05-10T00:00:00.000Z",
            tags: ["Beach", "Sunset"],
            media: [
              {
                id: "media-shared-tags",
                url: "https://example.com/hero-shared-tags.jpg",
                width: 1600,
                height: 1000,
              },
            ],
          }}
        />
      </LocaleProvider>,
    );

    const tagList = screen.getByLabelText("Tags");
    expect(tagList).toBeInTheDocument();
    expect(tagList.parentElement).toHaveClass("absolute", "right-0", "top-0");
    expect(screen.getByText("Beach")).toBeInTheDocument();
    expect(screen.getByText("Sunset")).toBeInTheDocument();
  });

  it("hides tag overlay when entry has no tags", () => {
    render(
      <LocaleProvider>
        <EntryReader
          entry={{
            id: "entry-no-tags",
            title: "No tags",
            body: "Entry without tags.",
            createdAt: "2025-05-11T00:00:00.000Z",
            tags: [],
            media: [
              {
                id: "media-no-tags",
                url: "https://example.com/hero-no-tags.jpg",
                width: 1600,
                height: 1000,
              },
            ],
          }}
        />
      </LocaleProvider>,
    );

    expect(screen.queryByLabelText("Tags")).not.toBeInTheDocument();
  });

  it("renders inline images alongside readable body text", async () => {
    render(
      <LocaleProvider>
        <EntryReader
        entry={{
          id: "entry-2",
          title: "Market stroll",
          body: "Look ![Fresh produce](https://example.com/inline.jpg) here.",
          createdAt: "2025-05-03T00:00:00.000Z",
          tags: [],
          media: [
            {
              id: "media-4",
              url: "https://example.com/hero-2.jpg",
              width: 1600,
              height: 1000,
            },
            {
              id: "media-inline",
              url: "https://example.com/inline.jpg",
              width: 1200,
              height: 800,
              alt: "Fresh produce",
            },
          ],
        }}
        />
      </LocaleProvider>,
    );

    expect(await screen.findByText(/Look/)).toBeInTheDocument();
    const inlineImages = await screen.findAllByRole("img", {
      name: /Fresh produce/i,
    });
    const inlineMatch = inlineImages.find(
      (image) =>
        image.getAttribute("src") === "https://example.com/inline.jpg",
    );
    expect(inlineMatch).toBeTruthy();
  });

  it("renders Tiptap JSON content as formatted text", async () => {
    const tiptapJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            { type: "text", text: "world", marks: [{ type: "bold" }] },
          ],
        },
      ],
    });

    render(
      <LocaleProvider>
        <EntryReader
          entry={{
            id: "entry-rich",
            title: "Rich entry",
            body: tiptapJson,
            createdAt: "2025-05-03T12:00:00.000Z",
            tags: [],
            media: [
              {
                id: "media-rich",
                url: "https://example.com/hero-rich.jpg",
                width: 1600,
                height: 1000,
              },
            ],
          }}
        />
      </LocaleProvider>,
    );

    expect(await screen.findByText("Hello")).toBeInTheDocument();
    expect(await screen.findByText("world")).toBeInTheDocument();
  });

  it("renders rich formatting elements from Tiptap JSON", async () => {
    const tiptapJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1, textAlign: "center" },
          content: [{ type: "text", text: "Heading" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Bold", marks: [{ type: "bold" }] },
            { type: "text", text: " and " },
            { type: "text", text: "Italic", marks: [{ type: "italic" }] },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Bullet item" }],
                },
              ],
            },
          ],
        },
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Numbered item" }],
                },
              ],
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Link",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            },
          ],
        },
        {
          type: "paragraph",
          attrs: { textAlign: "right" },
          content: [{ type: "text", text: "Aligned text" }],
        },
      ],
    });

    const { container } = render(
      <LocaleProvider>
        <EntryReader
          entry={{
            id: "entry-formatting",
            title: "Formatting entry",
            body: tiptapJson,
            createdAt: "2025-05-03T12:00:00.000Z",
            tags: [],
            media: [
              {
                id: "media-formatting",
                url: "https://example.com/hero-formatting.jpg",
                width: 1600,
                height: 1000,
              },
            ],
          }}
        />
      </LocaleProvider>,
    );

    const heading = await screen.findByRole("heading", { name: "Heading" });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveStyle({ textAlign: "center" });

    const boldText = screen.getByText("Bold");
    const italicText = screen.getByText("Italic");
    expect(boldText.tagName).toBe("STRONG");
    expect(italicText.tagName).toBe("EM");

    expect(screen.getByText("Bullet item").closest("ul")).toBeTruthy();
    expect(screen.getByText("Numbered item").closest("ol")).toBeTruthy();

    const link = screen.getByRole("link", { name: "Link" });
    expect(link).toHaveAttribute("href", "https://example.com");

    const aligned = screen.getByText("Aligned text");
    const alignedParagraph = aligned.closest("p");
    expect(alignedParagraph).toHaveStyle({ textAlign: "right" });

    expect(container.querySelector(".ProseMirror")).toBeInTheDocument();
  });

  it("converts plain text to Tiptap JSON for display without persisting (AC1)", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const detectSpy = vi
      .spyOn(entryFormat, "detectEntryFormat")
      .mockReturnValue("plain");
    const conversionSpy = vi
      .spyOn(entryFormat, "plainTextToTiptapJson")
      .mockReturnValue(
        JSON.stringify({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Converted for display" }],
            },
          ],
        }),
      );

    render(
      <LocaleProvider>
        <EntryReader
          entry={{
            id: "entry-display-conversion",
            title: "Display conversion",
            body: "Plain text body",
            createdAt: "2025-05-03T12:00:00.000Z",
            tags: [],
            media: [
              {
                id: "media-display",
                url: "https://example.com/hero-display.jpg",
                width: 1600,
                height: 1000,
              },
            ],
          }}
        />
      </LocaleProvider>,
    );

    expect(detectSpy).toHaveBeenCalledWith("Plain text body");
    expect(conversionSpy).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Converted for display")).toBeInTheDocument();

    // AC1: Verify no persistence occurs (display-only conversion)
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
    detectSpy.mockRestore();
    conversionSpy.mockRestore();
  });

  it("skips conversion when entry body is already Tiptap JSON (AC4)", async () => {
    const detectSpy = vi
      .spyOn(entryFormat, "detectEntryFormat")
      .mockReturnValue("tiptap");
    const conversionSpy = vi.spyOn(entryFormat, "plainTextToTiptapJson");
    const tiptapJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Stored JSON" }],
        },
      ],
    });

    render(
      <LocaleProvider>
        <EntryReader
          entry={{
            id: "entry-json",
            title: "JSON entry",
            body: tiptapJson,
            createdAt: "2025-05-03T12:00:00.000Z",
            tags: [],
            media: [
              {
                id: "media-json",
                url: "https://example.com/hero-json.jpg",
                width: 1600,
                height: 1000,
              },
            ],
          }}
        />
      </LocaleProvider>,
    );

    expect(detectSpy).toHaveBeenCalledWith(tiptapJson);
    expect(conversionSpy).not.toHaveBeenCalled();
    expect(await screen.findByText("Stored JSON")).toBeInTheDocument();

    detectSpy.mockRestore();
    conversionSpy.mockRestore();
  });

  it("renders entryImage nodes using entryMediaId resolution", async () => {
    const tiptapJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "entryImage",
          attrs: {
            entryMediaId: "media-inline",
            src: "https://example.com/inline-fallback.jpg",
            alt: "Inline photo",
          },
        },
      ],
    });

    render(
      <LocaleProvider>
        <EntryReader
          entry={{
            id: "entry-inline",
            title: "Inline image entry",
            body: tiptapJson,
            createdAt: "2025-05-04T12:00:00.000Z",
            tags: [],
            media: [
              {
                id: "media-inline",
                url: "https://example.com/inline-from-media.jpg",
                width: 1200,
                height: 800,
                alt: "Inline photo",
              },
            ],
          }}
        />
      </LocaleProvider>,
    );

    const inlineImages = await screen.findAllByRole("img", {
      name: /inline photo/i,
    });
    const inlineMatch = inlineImages.find(
      (image) =>
        image.getAttribute("src") ===
        "https://example.com/inline-from-media.jpg",
    );
    expect(inlineMatch).toBeTruthy();
  });

  it("opens the fullscreen viewer from the slideshow button", async () => {
    render(
      <LocaleProvider>
        <EntryReader
        entry={{
          id: "entry-3",
          title: "Night market",
          body: "Neon lights and snacks.",
          createdAt: "2025-05-04T00:00:00.000Z",
          tags: [],
          media: [
            {
              id: "media-10",
              url: "https://example.com/hero-night.jpg",
              width: 1600,
              height: 1000,
              alt: "Night hero",
            },
            {
              id: "media-11",
              url: "https://example.com/gallery-night.jpg",
              width: 1200,
              height: 900,
              alt: "Night market",
            },
          ],
        }}
        />
      </LocaleProvider>,
    );

    const slideshowButton = screen.getByRole("button", {
      name: /start slideshow/i,
    });
    fireEvent.click(slideshowButton);

    expect(
      await screen.findByRole("dialog", { name: /photo viewer/i }),
    ).toBeInTheDocument();
  });

  it("uses a custom entry link base for navigation when provided", () => {
    render(
      <LocaleProvider>
        <EntryReader
        entryLinkBase="/trips/share/token-1/entries"
        backToTripHref="/trips/share/token-1"
        entry={{
          id: "entry-4",
          title: "Village walk",
          body: "Morning mist.",
          createdAt: "2025-05-05T00:00:00.000Z",
          tags: [],
          media: [
            {
              id: "media-20",
              url: "https://example.com/hero-walk.jpg",
              width: 1600,
              height: 1000,
            },
          ],
          navigation: {
            previousEntryId: "entry-3",
            nextEntryId: "entry-5",
            previousEntryTitle: "Prior day",
            nextEntryTitle: "Next day",
            previousEntryDate: "2025-05-04T00:00:00.000Z",
            nextEntryDate: "2025-05-06T00:00:00.000Z",
          },
        }}
        />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("link", { name: /previous prior day/i }),
    ).toHaveAttribute("href", "/trips/share/token-1/entries/entry-3");
    expect(screen.getByRole("link", { name: /next next day/i })).toHaveAttribute(
      "href",
      "/trips/share/token-1/entries/entry-5",
    );
  });

  it("shows a back to trip action when provided", () => {
    render(
      <LocaleProvider>
        <EntryReader
        backToTripHref="/trips/share/token-2"
        entry={{
          id: "entry-5",
          title: "Canal walk",
          body: "Reflections at dusk.",
          createdAt: "2025-05-06T00:00:00.000Z",
          tags: [],
          media: [
            {
              id: "media-30",
              url: "https://example.com/hero-canal.jpg",
              width: 1600,
              height: 1000,
            },
          ],
        }}
        />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("link", { name: /back to trip/i }),
    ).toBeInTheDocument();
  });

  it("links the back to trip action to the shared overview", () => {
    render(
      <LocaleProvider>
        <EntryReader
        backToTripHref="/trips/share/token-3"
        entry={{
          id: "entry-6",
          title: "Harbor view",
          body: "Salt air.",
          createdAt: "2025-05-07T00:00:00.000Z",
          tags: [],
          media: [
            {
              id: "media-31",
              url: "https://example.com/hero-harbor.jpg",
              width: 1600,
              height: 1000,
            },
          ],
        }}
        />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("link", { name: /back to trip/i }),
    ).toHaveAttribute("href", "/trips/share/token-3");
  });

  it("renders shared hero overlays with date and title", () => {
    render(
      <LocaleProvider>
        <EntryReader
          isSharedView
          entry={{
            id: "entry-7",
            title: "Morning in Kyoto",
            body: "Temple walks and tea breaks.",
            createdAt: "2025-05-03T12:00:00.000Z",
            tags: [],
            media: [
              {
                id: "media-40",
                url: "https://example.com/hero.jpg",
                width: 1600,
                height: 1000,
              },
            ],
          }}
        />
      </LocaleProvider>,
    );

    const overlay = screen.getByLabelText("Entry details");
    expect(overlay).toBeInTheDocument();

    // Validate overlay is positioned in upper-left within hero image
    expect(overlay).toHaveClass("absolute", "left-0", "top-0");

    expect(screen.getByText("May 3rd, 2025")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Morning in Kyoto" }),
    ).toBeInTheDocument();
  });

  it("renders a country flag alongside the title in non-shared view", () => {
    const flag = countryCodeToFlag("FR");
    if (!flag) {
      throw new Error("Expected country flag for FR");
    }
    const name = countryCodeToName("FR", "en");

    render(
      <LocaleProvider>
        <EntryReader
          entry={{
            id: "entry-flag-non-shared",
            title: "Paris stroll",
            body: "City of lights.",
            createdAt: "2025-05-08T00:00:00.000Z",
            tags: [],
            media: [
              {
                id: "media-flag-non-shared",
                url: "https://example.com/hero-paris.jpg",
                width: 1600,
                height: 1000,
              },
            ],
            location: {
              latitude: 48.8566,
              longitude: 2.3522,
              label: "Paris",
              countryCode: "FR",
            },
          }}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText(flag)).toBeInTheDocument();
    if (name) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("renders a country flag alongside the title in shared view", () => {
    const flag = countryCodeToFlag("BR");
    if (!flag) {
      throw new Error("Expected country flag for BR");
    }
    const name = countryCodeToName("BR", "en");

    render(
      <LocaleProvider>
        <EntryReader
          isSharedView
          entry={{
            id: "entry-flag-shared",
            title: "Rio sunrise",
            body: "Beach walk.",
            createdAt: "2025-05-08T00:00:00.000Z",
            tags: [],
            media: [
              {
                id: "media-flag-shared",
                url: "https://example.com/hero-rio.jpg",
                width: 1600,
                height: 1000,
              },
            ],
            location: {
              latitude: -22.9068,
              longitude: -43.1729,
              label: "Rio",
              countryCode: "BR",
            },
          }}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText(flag)).toBeInTheDocument();
    if (name) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("does not render a country flag when no country code exists", () => {
    const flag = countryCodeToFlag("US");
    if (!flag) {
      throw new Error("Expected country flag for US");
    }

    render(
      <LocaleProvider>
        <EntryReader
          entry={{
            id: "entry-no-flag",
            title: "Unknown location",
            body: "No country code.",
            createdAt: "2025-05-08T00:00:00.000Z",
            tags: [],
            media: [
              {
                id: "media-no-flag",
                url: "https://example.com/hero-unknown.jpg",
                width: 1600,
                height: 1000,
              },
            ],
            location: {
              latitude: 0,
              longitude: 0,
              label: "Somewhere",
              countryCode: null,
            },
          }}
        />
      </LocaleProvider>,
    );

    expect(screen.queryByText(flag)).not.toBeInTheDocument();
  });

  it("shows a location map overlay only when location exists", () => {
    const entry = {
      id: "entry-8",
      title: "Harbor view",
      body: "Salt air.",
      createdAt: "2025-05-07T00:00:00.000Z",
      tags: [],
      media: [
        {
          id: "media-41",
          url: "https://example.com/hero-harbor.jpg",
          width: 1600,
          height: 1000,
        },
      ],
    };

    const { rerender } = render(
      <LocaleProvider>
        <EntryReader
          isSharedView
          entry={{
            ...entry,
            location: {
              latitude: 35.0116,
              longitude: 135.7681,
              label: "Kyoto",
            },
          }}
        />
      </LocaleProvider>,
    );

    const mapOverlay = screen.getByLabelText("Entry location map");
    expect(mapOverlay).toBeInTheDocument();

    // Validate map overlay is positioned in lower-right within hero image
    expect(mapOverlay.parentElement).toHaveClass("absolute", "bottom-4", "right-4");

    rerender(
      <LocaleProvider>
        <EntryReader isSharedView entry={entry} />
      </LocaleProvider>,
    );

    expect(
      screen.queryByLabelText("Entry location map"),
    ).not.toBeInTheDocument();
  });

  it("keeps non-shared entry reader hero layout unchanged", () => {
    render(
      <LocaleProvider>
        <EntryReader
          entry={{
            id: "entry-9",
            title: "Non shared",
            body: "No overlays.",
            createdAt: "2025-05-08T00:00:00.000Z",
            tags: [],
            media: [
              {
                id: "media-42",
                url: "https://example.com/hero-non-shared.jpg",
                width: 1600,
                height: 1000,
              },
            ],
          }}
        />
      </LocaleProvider>,
    );

    expect(
      screen.queryByLabelText("Entry details"),
    ).not.toBeInTheDocument();
  });

  it("renders the location section when entry has location data (shared view)", () => {
    render(
      <LocaleProvider>
        <EntryReader
          isSharedView
          entry={{
            id: "entry-100",
            title: "Location test",
            body: "Testing location display in shared view.",
            createdAt: "2025-05-20T00:00:00.000Z",
            tags: [],
            media: [
              {
                id: "media-100",
                url: "https://example.com/photo.jpg",
                width: 1600,
                height: 1000,
              },
            ],
            location: {
              latitude: 52.52,
              longitude: 13.405,
              label: "Berlin",
            },
          }}
          heroMapLocations={[
            {
              latitude: 52.52,
              longitude: 13.405,
              label: "Berlin",
            },
          ]}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("Berlin")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Trip map" }),
    ).toBeInTheDocument();
  });

  it("shows the view full map action when a map href is provided", () => {
    render(
      <LocaleProvider>
        <EntryReader
          mapHref="/trips/trip-1/map"
          entry={{
            id: "entry-map",
            title: "Map entry",
            body: "Map entry body.",
            createdAt: "2025-05-22T00:00:00.000Z",
            tags: [],
            media: [
              {
                id: "media-map",
                url: "https://example.com/photo-map.jpg",
                width: 1600,
                height: 1000,
              },
            ],
            location: {
              latitude: 52.52,
              longitude: 13.405,
              label: "Berlin",
            },
          }}
          heroMapLocations={[
            {
              latitude: 52.52,
              longitude: 13.405,
              label: "Berlin",
            },
          ]}
        />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("link", { name: /view full map/i }),
    ).toHaveAttribute("href", "/trips/trip-1/map");
  });

  it("hides the location section when entry has no location (shared view)", () => {
    render(
      <LocaleProvider>
        <EntryReader
          isSharedView
          entry={{
            id: "entry-101",
            title: "No location",
            body: "No location data.",
            createdAt: "2025-05-21T00:00:00.000Z",
            tags: [],
            media: [
              {
                id: "media-101",
                url: "https://example.com/photo2.jpg",
                width: 1600,
                height: 1000,
              },
            ],
            location: null,
          }}
        />
      </LocaleProvider>,
    );

    expect(screen.queryByText("Location")).not.toBeInTheDocument();
  });

  it("gracefully handles invalid Tiptap JSON with fallback rendering", async () => {
    const invalidJson = '{"type":"doc","content":[{invalid}]}';

    const { container } = render(
      <LocaleProvider>
        <EntryReader
          entry={{
            id: "entry-invalid-json",
            title: "Invalid JSON Entry",
            body: invalidJson,
            createdAt: "2025-05-03T12:00:00.000Z",
            tags: [],
            media: [
              {
                id: "media-invalid",
                url: "https://example.com/hero-invalid.jpg",
                width: 1600,
                height: 1000,
              },
            ],
          }}
        />
      </LocaleProvider>,
    );

    // Should render without crashing
    expect(screen.getByText("Invalid JSON Entry")).toBeInTheDocument();

    // Should attempt to display content (either as plain text fallback or empty state)
    // The exact behavior depends on implementation, but it shouldn't crash
    expect(container.querySelector(".ProseMirror")).toBeInTheDocument();
  });
});
