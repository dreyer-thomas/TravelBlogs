// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ImgHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import EntryReader from "../../src/components/entries/entry-reader";

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
      <EntryReader
        entry={{
          id: "entry-1",
          title: "Morning in Kyoto",
          body: "Temple walks and tea breaks.",
          createdAt: "2025-05-03T00:00:00.000Z",
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
      />,
    );

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(4);
    expect(images[0]).toHaveAttribute("src", "https://example.com/hero.jpg");
    expect(images[0]).toHaveAttribute("width", "1600");
    expect(images[0]).toHaveAttribute("height", "1000");
    expect(images[0]).toHaveAttribute("loading", "lazy");

    expect(
      screen.getByRole("heading", { name: "More moments" }),
    ).toBeInTheDocument();
  });

  it("renders inline images alongside readable body text", () => {
    render(
      <EntryReader
        entry={{
          id: "entry-2",
          title: "Market stroll",
          body: "Look ![Fresh produce](https://example.com/inline.jpg) here.",
          createdAt: "2025-05-03T00:00:00.000Z",
          media: [
            {
              id: "media-4",
              url: "https://example.com/hero-2.jpg",
              width: 1600,
              height: 1000,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText(/Look/)).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Fresh produce/i }),
    ).toHaveAttribute("src", "https://example.com/inline.jpg");
  });

  it("opens the fullscreen viewer from the slideshow button", async () => {
    render(
      <EntryReader
        entry={{
          id: "entry-3",
          title: "Night market",
          body: "Neon lights and snacks.",
          createdAt: "2025-05-04T00:00:00.000Z",
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
      />,
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
      <EntryReader
        entryLinkBase="/trips/share/token-1/entries"
        backToTripHref="/trips/share/token-1"
        entry={{
          id: "entry-4",
          title: "Village walk",
          body: "Morning mist.",
          createdAt: "2025-05-05T00:00:00.000Z",
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
      />,
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
      <EntryReader
        backToTripHref="/trips/share/token-2"
        entry={{
          id: "entry-5",
          title: "Canal walk",
          body: "Reflections at dusk.",
          createdAt: "2025-05-06T00:00:00.000Z",
          media: [
            {
              id: "media-30",
              url: "https://example.com/hero-canal.jpg",
              width: 1600,
              height: 1000,
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole("link", { name: /back to trip/i }),
    ).toBeInTheDocument();
  });

  it("links the back to trip action to the shared overview", () => {
    render(
      <EntryReader
        backToTripHref="/trips/share/token-3"
        entry={{
          id: "entry-6",
          title: "Harbor view",
          body: "Salt air.",
          createdAt: "2025-05-07T00:00:00.000Z",
          media: [
            {
              id: "media-31",
              url: "https://example.com/hero-harbor.jpg",
              width: 1600,
              height: 1000,
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole("link", { name: /back to trip/i }),
    ).toHaveAttribute("href", "/trips/share/token-3");
  });
});
