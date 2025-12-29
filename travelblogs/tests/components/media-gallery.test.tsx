// @vitest-environment jsdom
import type { ImgHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import MediaGallery from "../../src/components/media/media-gallery";

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
      />,
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
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /start slideshow/i }),
    );

    expect(startSlideshow).toHaveBeenCalledTimes(1);
  });
});
