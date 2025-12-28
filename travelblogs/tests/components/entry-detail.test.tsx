// @vitest-environment jsdom
import type { ImgHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import EntryDetail from "../../src/components/entries/entry-detail";

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("EntryDetail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the entry title in the header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: "entry-1",
            tripId: "trip-1",
            title: "Sunset in Positano",
            coverImageUrl: null,
            text: "Golden hour on the cliffs.",
            createdAt: "2025-05-03T00:00:00.000Z",
            updatedAt: "2025-05-03T00:00:00.000Z",
            media: [],
          },
          error: null,
        }),
        { status: 200 },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    render(<EntryDetail tripId="trip-1" entryId="entry-1" />);

    expect(
      await screen.findByRole("heading", { name: "Sunset in Positano" }),
    ).toBeInTheDocument();
  });
});
