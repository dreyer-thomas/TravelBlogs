// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ImgHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import MediaGallery from "../../src/components/media/media-gallery";
import { LocaleProvider } from "../../src/utils/locale-context";

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

describe("MediaGallery", () => {
  it("scrolls the carousel when navigation buttons are clicked", () => {
    render(
      <LocaleProvider>
        <MediaGallery
          items={[
            {
              id: "media-1",
              url: "https://example.com/gallery-1.jpg",
              width: 1200,
              height: 900,
            },
            {
              id: "media-2",
              url: "https://example.com/gallery-2.jpg",
              width: 1200,
              height: 900,
            },
          ]}
        />
      </LocaleProvider>,
    );

    const scroller = screen.getByTestId("media-gallery-scroller");
    const scrollBySpy = vi.fn();
    Object.defineProperty(scroller, "scrollBy", {
      value: scrollBySpy,
      writable: true,
    });

    expect(
      screen.getByRole("button", { name: /scroll gallery backward/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /scroll gallery forward/i }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /scroll gallery forward/i }),
    );

    expect(scrollBySpy).toHaveBeenCalledWith({
      left: 320,
      behavior: "smooth",
    });

    const images = screen.getAllByRole("img");
    expect(images[0]).toHaveAttribute("loading", "lazy");
  });

  it("triggers slideshow action when provided", () => {
    const startSlideshow = vi.fn();

    render(
      <LocaleProvider>
        <MediaGallery
          items={[
            {
              id: "media-1",
              url: "https://example.com/gallery-1.jpg",
              width: 1200,
              height: 900,
            },
          ]}
          onStartSlideshow={startSlideshow}
        />
      </LocaleProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /start slideshow/i }),
    );

    expect(startSlideshow).toHaveBeenCalledTimes(1);
  });

  it("renders video items with video-specific labels", () => {
    const onItemClick = vi.fn();

    const { container } = render(
      <LocaleProvider>
        <MediaGallery
          items={[
            {
              id: "media-video",
              url: "https://example.com/clip.mp4",
            },
          ]}
          onItemClick={onItemClick}
        />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("button", { name: /open video/i }),
    ).toBeInTheDocument();
    expect(container.querySelector("video")).toBeInTheDocument();
  });
});
