// @vitest-environment jsdom
import type { ImgHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import EntryReader from "../../src/components/entries/entry-reader";

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    const { priority, unoptimized, ...rest } = props;
    return (
      <img
        {...rest}
        data-priority={priority ? "true" : undefined}
        data-unoptimized={unoptimized ? "true" : undefined}
      />
    );
  },
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
});
