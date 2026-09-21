// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ImgHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider } from "../../src/utils/locale-context";

/**
 * AC 4 of Story 16.2: no view count may appear on any `/trips/share/{token}`
 * page, including in data attributes or embedded JSON.
 *
 * This renders the real share server components rather than the shared
 * `TripOverview` in isolation, so it also covers whatever those routes
 * serialize into their own markup. The share API payloads below deliberately
 * carry count-shaped fields: if a future change ever threads them through to
 * the public render path, these assertions fail.
 */

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    // Strip the Next-only props so React does not warn about unknown DOM
    // attributes; everything else is forwarded so the markup stays realistic.
    const rest = { ...props };
    delete (rest as Record<string, unknown>).priority;
    delete (rest as Record<string, unknown>).unoptimized;
    delete (rest as Record<string, unknown>).fill;
    return <img {...rest} />;
  },
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("../../src/components/trips/shared-trip-guard", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("next/cache", () => ({
  unstable_noStore: () => undefined,
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => null),
}));

vi.mock("next/headers", () => ({
  headers: () => ({
    get: (key: string) => {
      if (key === "host") {
        return "localhost";
      }
      if (key === "x-forwarded-proto") {
        return "http";
      }
      return null;
    },
  }),
}));

const sharedTripPayload = {
  trip: {
    id: "trip-shared-counts",
    title: "Shared Adventure",
    startDate: "2026-06-01T00:00:00.000Z",
    endDate: "2026-06-08T00:00:00.000Z",
    coverImageUrl: null,
    ownerName: "Alex Owner",
    // Count-shaped bait: the share API does not return these today, and the
    // public page must not render them if it ever does.
    viewCounts: { total: 4242, last30Days: 777 },
  },
  entries: [
    {
      id: "entry-shared-1",
      title: "Shared Morning",
      text: "A quiet start.",
      createdAt: "2026-06-02T00:00:00.000Z",
      updatedAt: "2026-06-02T00:00:00.000Z",
      coverImageUrl: null,
      media: [],
      tags: [],
      location: null,
      viewTotal: 4242,
    },
  ],
};

const sharedEntryPayload = {
  id: "entry-shared-1",
  tripId: "trip-shared-counts",
  title: "Shared Morning",
  text: "A quiet start.",
  createdAt: "2026-06-02T00:00:00.000Z",
  coverImageUrl: null,
  media: [],
  viewTotal: 4242,
};

const expectNoCountsInMarkup = (markup: string) => {
  // Rendered labels, in both catalogs.
  expect(screen.queryByText(/total views/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/views \(last 30 days\)/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Aufrufe/i)).not.toBeInTheDocument();
  expect(screen.queryByTestId("trip-views-total")).not.toBeInTheDocument();
  expect(
    screen.queryByTestId("trip-views-last-30-days"),
  ).not.toBeInTheDocument();

  // Raw markup: covers data attributes and any embedded JSON.
  expect(markup).not.toMatch(/view-?counts?/i);
  expect(markup).not.toMatch(/last30Days/i);
  expect(markup).not.toMatch(/viewTotal/i);
  expect(markup).not.toContain("4242");
  expect(markup).not.toContain("777");
};

describe("view counts never reach a shared page (AC 4)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not leak counts on /trips/share/[token]", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ data: sharedTripPayload, error: null }),
          { status: 200 },
        ),
      ),
    );

    const { default: SharedTripPage } = await import(
      "../../src/app/trips/share/[token]/page"
    );

    const element = await SharedTripPage({ params: { token: "token-1" } });
    const { container } = render(
      <LocaleProvider initialLocale="en">{element}</LocaleProvider>,
    );

    expect(screen.getByText("Shared Adventure")).toBeInTheDocument();
    expectNoCountsInMarkup(container.innerHTML);
  });

  it("does not leak counts on /trips/share/[token]/entries/[entryId]", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ data: sharedEntryPayload, error: null }),
          { status: 200 },
        ),
      ),
    );

    const { default: SharedEntryPage } = await import(
      "../../src/app/trips/share/[token]/entries/[entryId]/page"
    );

    const element = await SharedEntryPage({
      params: { token: "token-1", entryId: "entry-shared-1" },
    });
    const { container } = render(
      <LocaleProvider initialLocale="en">{element}</LocaleProvider>,
    );

    expect(screen.getByText("Shared Morning")).toBeInTheDocument();
    expectNoCountsInMarkup(container.innerHTML);
  });
});
