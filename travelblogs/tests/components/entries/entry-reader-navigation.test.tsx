// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ImgHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import EntryReader from "../../../src/components/entries/entry-reader";

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

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    "aria-label"?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("EntryReader navigation", () => {
  it("renders previous and next navigation links when available", () => {
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
          ],
          navigation: {
            previousEntryId: "entry-0",
            nextEntryId: "entry-2",
            previousEntryTitle: "Sunrise market",
            nextEntryTitle: "Lantern night",
            previousEntryDate: null,
            nextEntryDate: null,
          },
        }}
      />,
    );

    const previousLink = screen.getByLabelText("Previous entry");
    const nextLink = screen.getByLabelText("Next entry");

    expect(previousLink).toHaveAttribute("href", "/entries/entry-0");
    expect(previousLink).toHaveTextContent("Sunrise market");
    expect(nextLink).toHaveAttribute("href", "/entries/entry-2");
    expect(nextLink).toHaveTextContent("Lantern night");
  });

  it("marks navigation controls as disabled at the bounds", () => {
    render(
      <EntryReader
        entry={{
          id: "entry-3",
          title: "Solo day",
          body: "Only one entry.",
          createdAt: "2025-05-03T00:00:00.000Z",
          media: [],
          navigation: {
            previousEntryId: null,
            nextEntryId: null,
            previousEntryTitle: null,
            nextEntryTitle: null,
            previousEntryDate: null,
            nextEntryDate: null,
          },
        }}
      />,
    );

    const previousControl = screen.getByLabelText("Previous entry");
    const nextControl = screen.getByLabelText("Next entry");

    expect(previousControl).toHaveAttribute("data-disabled", "true");
    expect(previousControl).not.toHaveAttribute("href");
    expect(nextControl).toHaveAttribute("data-disabled", "true");
    expect(nextControl).not.toHaveAttribute("href");
  });

  it("updates reader content when a new entry is rendered", () => {
    const { rerender } = render(
      <EntryReader
        entry={{
          id: "entry-10",
          title: "Morning in Oslo",
          body: "Cold air and warm coffee.",
          createdAt: "2025-05-03T00:00:00.000Z",
          media: [],
          navigation: {
            previousEntryId: null,
            nextEntryId: "entry-11",
            previousEntryTitle: null,
            nextEntryTitle: "Late-night harbor",
            previousEntryDate: null,
            nextEntryDate: null,
          },
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Morning in Oslo" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Next entry")).toHaveTextContent(
      "Late-night harbor",
    );

    rerender(
      <EntryReader
        entry={{
          id: "entry-11",
          title: "Late-night harbor",
          body: "City lights over the water.",
          createdAt: "2025-05-04T00:00:00.000Z",
          media: [],
          navigation: {
            previousEntryId: "entry-10",
            nextEntryId: null,
            previousEntryTitle: "Morning in Oslo",
            nextEntryTitle: null,
            previousEntryDate: null,
            nextEntryDate: null,
          },
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Late-night harbor" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Previous entry")).toHaveTextContent(
      "Morning in Oslo",
    );
  });
});
