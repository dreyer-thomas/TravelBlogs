// @vitest-environment jsdom
import type { ImgHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import EntryDetail from "../../src/components/entries/entry-detail";

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

describe("EntryDetail", () => {
  it("renders the entry title in the header", async () => {
    render(
      <EntryDetail
        entry={{
          id: "entry-1",
          tripId: "trip-1",
          title: "Sunset in Positano",
          coverImageUrl: null,
          text: "Golden hour on the cliffs.",
          createdAt: "2025-05-03T00:00:00.000Z",
          updatedAt: "2025-05-03T00:00:00.000Z",
          media: [],
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Sunset in Positano" }),
    ).toBeInTheDocument();
  });

  it("opens and closes the photo viewer from inline content", async () => {
    render(
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
      />,
    );

    const openButtons = await screen.findAllByRole("button", {
      name: /open photo/i,
    });

    fireEvent.click(openButtons[0]);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("1 of 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("dialog"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("supports keyboard navigation in the photo viewer", async () => {
    render(
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
      />,
    );

    const openButtons = await screen.findAllByRole("button", {
      name: /open photo/i,
    });

    fireEvent.click(openButtons[0]);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("1 of 2")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("2 of 2")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the viewer from the media grid at the correct index", async () => {
    render(
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
      />,
    );

    const mediaButton = await screen.findByRole("button", {
      name: /open photo 2/i,
    });

    fireEvent.click(mediaButton);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
  });

  it("starts a slideshow and auto-advances with looping", async () => {
    vi.useFakeTimers();

    try {
      render(
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
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: /start slideshow/i }),
      );
      await act(async () => {});

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("1 of 2")).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.getByText("2 of 2")).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.getByText("1 of 2")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("pauses, resumes, and exits the slideshow", async () => {
    vi.useFakeTimers();

    try {
      render(
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
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: /start slideshow/i }),
      );
      await act(async () => {});

      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /pause/i }));

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.getByText("1 of 2")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /resume/i }));

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.getByText("2 of 2")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /close/i }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
