// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ImgHTMLAttributes } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import FullScreenPhotoViewer from "../../src/components/entries/full-screen-photo-viewer";
import { LocaleProvider } from "../../src/utils/locale-context";

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    const { fill, unoptimized, ...rest } = props;
    return (
      <img
        {...rest}
        data-fill={fill ? "true" : undefined}
        data-unoptimized={unoptimized ? "true" : undefined}
      />
    );
  },
}));

const images = [
  { url: "/images/one.jpg", alt: "One" },
  { url: "/images/two.jpg", alt: "Two" },
  { url: "/images/three.jpg", alt: "Three" },
];

describe("FullScreenPhotoViewer", () => {
  let playSpy: ReturnType<typeof vi.spyOn>;
  let pauseSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    playSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined);
    pauseSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, "pause")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    playSpy.mockRestore();
    pauseSpy.mockRestore();
  });
  it("renders without chrome and closes on click", async () => {
    const onClose = vi.fn();

    render(
      <LocaleProvider>
        <FullScreenPhotoViewer
          images={images}
          initialIndex={0}
          isOpen
          onClose={onClose}
          mode="viewer"
        />
      </LocaleProvider>,
    );

    const dialog = await screen.findByRole("dialog");

    expect(screen.queryByText("1 of 3")).not.toBeInTheDocument();
    expect(dialog.querySelectorAll("button")).toHaveLength(0);
    expect(screen.queryByTestId("slideshow-progress")).not.toBeInTheDocument();

    fireEvent.click(dialog);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows segmented slideshow progress and advances the active segment", async () => {
    vi.useFakeTimers();

    try {
      render(
        <LocaleProvider>
          <FullScreenPhotoViewer
            images={images}
            initialIndex={0}
            isOpen
            onClose={vi.fn()}
            mode="slideshow"
          />
        </LocaleProvider>,
      );

      await act(async () => {});
      screen.getByRole("dialog");

      const segments = screen.getAllByTestId("slideshow-segment");
      expect(segments).toHaveLength(3);
      expect(segments[0]).toHaveAttribute("data-segment-state", "active");
      expect(segments[1]).toHaveAttribute("data-segment-state", "upcoming");

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      const updatedSegments = screen.getAllByTestId("slideshow-segment");
      expect(updatedSegments[0]).toHaveAttribute(
        "data-segment-state",
        "complete",
      );
      expect(updatedSegments[1]).toHaveAttribute(
        "data-segment-state",
        "active",
      );
      expect(updatedSegments[2]).toHaveAttribute(
        "data-segment-state",
        "upcoming",
      );

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      const loopSegments = screen.getAllByTestId("slideshow-segment");
      expect(loopSegments[0]).toHaveAttribute("data-segment-state", "complete");
      expect(loopSegments[1]).toHaveAttribute("data-segment-state", "complete");
      expect(loopSegments[2]).toHaveAttribute("data-segment-state", "active");

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      const resetSegments = screen.getAllByTestId("slideshow-segment");
      expect(resetSegments[0]).toHaveAttribute("data-segment-state", "active");
      expect(resetSegments[1]).toHaveAttribute("data-segment-state", "upcoming");
    } finally {
      vi.useRealTimers();
    }
  });

  it("pauses and resumes the slideshow with the spacebar", async () => {
    vi.useFakeTimers();

    try {
      render(
        <LocaleProvider>
          <FullScreenPhotoViewer
            images={images}
            initialIndex={0}
            isOpen
            onClose={vi.fn()}
            mode="slideshow"
          />
        </LocaleProvider>,
      );

      await act(async () => {});
      screen.getByRole("dialog");

      expect(screen.getByAltText("One")).toBeInTheDocument();

      fireEvent.keyDown(window, { code: "Space", key: " " });
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByAltText("One")).toBeInTheDocument();

      fireEvent.keyDown(window, { code: "Space", key: " " });
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByAltText("Two")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores the close click after a swipe gesture", async () => {
    const onClose = vi.fn();

    render(
      <LocaleProvider>
        <FullScreenPhotoViewer
          images={images}
          initialIndex={0}
          isOpen
          onClose={onClose}
          mode="viewer"
        />
      </LocaleProvider>,
    );

    const dialog = await screen.findByRole("dialog");
    const gestureLayer = screen.getByTestId("photo-viewer-gesture-layer");

    fireEvent.touchStart(gestureLayer, {
      touches: [{ clientX: 200, clientY: 100 }],
    });
    fireEvent.touchMove(gestureLayer, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchEnd(gestureLayer, {
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.click(dialog);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("supports video playback and seeking via keyboard", async () => {
    render(
      <LocaleProvider>
        <FullScreenPhotoViewer
          images={[{ url: "/videos/clip.mp4", alt: "Clip", mediaType: "video" }]}
          initialIndex={0}
          isOpen
          onClose={vi.fn()}
          mode="viewer"
        />
      </LocaleProvider>,
    );

    const video = screen.getByLabelText("Clip");
    Object.defineProperty(video, "paused", { value: true, configurable: true });

    fireEvent.keyDown(window, { code: "Space", key: " " });
    expect(playSpy).toHaveBeenCalled();

    Object.defineProperty(video, "paused", { value: false, configurable: true });
    fireEvent.keyDown(window, { code: "Space", key: " " });
    expect(pauseSpy).toHaveBeenCalled();

    Object.defineProperty(video, "currentTime", {
      value: 10,
      writable: true,
    });
    Object.defineProperty(video, "duration", { value: 100, configurable: true });

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect((video as HTMLVideoElement).currentTime).toBe(15);

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect((video as HTMLVideoElement).currentTime).toBe(10);
  });

  it("renders video items in slideshow mode", async () => {
    render(
      <LocaleProvider>
        <FullScreenPhotoViewer
          images={[{ url: "/videos/clip.mp4", alt: "Clip", mediaType: "video" }]}
          initialIndex={0}
          isOpen
          onClose={vi.fn()}
          mode="slideshow"
        />
      </LocaleProvider>,
    );

    expect(screen.getByLabelText("Clip")).toBeInTheDocument();
    expect(screen.getAllByTestId("slideshow-segment")).toHaveLength(1);
  });
});
