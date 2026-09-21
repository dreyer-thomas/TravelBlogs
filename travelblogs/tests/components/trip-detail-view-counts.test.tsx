// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ImgHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import TripDetail from "../../src/components/trips/trip-detail";
import TripOverview from "../../src/components/trips/trip-overview";
import { LocaleProvider } from "../../src/utils/locale-context";

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

type ViewCounts = {
  trip: { total: number; last30Days: number };
  entries: { entryId: string; total: number }[];
};

describe("TripDetail view counts", () => {
  const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify({ data, error: null }), { status });

  const tripId = "trip-counts";

  const trip = {
    id: tripId,
    title: "Counted Trip",
    startDate: "2026-05-01T00:00:00.000Z",
    endDate: "2026-05-10T00:00:00.000Z",
    coverImageUrl: null,
    ownerName: "Alex Owner",
  };

  const entries = [
    {
      id: "entry-1",
      tripId,
      title: "Roman morning",
      coverImageUrl: null,
      text: "Great day in Rome.",
      createdAt: "2026-05-02T00:00:00.000Z",
      updatedAt: "2026-05-02T00:00:00.000Z",
      media: [],
      tags: [],
    },
    {
      id: "entry-2",
      tripId,
      title: "Florence afternoon",
      coverImageUrl: null,
      text: "Bridges everywhere.",
      createdAt: "2026-05-03T00:00:00.000Z",
      updatedAt: "2026-05-03T00:00:00.000Z",
      media: [],
      tags: [],
    },
  ];

  const stubFetch = (counts: ViewCounts | null) => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes(`/api/trips/${tripId}/view-counts`)) {
        if (!counts) {
          return new Response(
            JSON.stringify({
              data: null,
              error: { code: "FORBIDDEN", message: "Not authorized." },
            }),
            { status: 403 },
          );
        }
        return jsonResponse(counts);
      }

      if (url.includes(`/api/trips/${tripId}/overview`)) {
        return jsonResponse({
          trip: { ...trip, ownerName: undefined },
          entries: entries.map((entry) => ({
            id: entry.id,
            tripId: entry.tripId,
            title: entry.title,
            createdAt: entry.createdAt,
            coverImageUrl: null,
            media: [],
            tags: [],
            location: null,
          })),
        });
      }

      if (url.includes(`/api/entries?tripId=${tripId}`)) {
        return jsonResponse(entries);
      }

      if (url.includes(`/api/trips/${tripId}/share-link`)) {
        return jsonResponse({ shareUrl: null });
      }

      if (url.includes(`/api/trips/${tripId}`)) {
        return jsonResponse(trip);
      }

      return jsonResponse(null);
    });

    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };

  const renderTripDetail = (canEdit: boolean, locale: "en" | "de" = "en") =>
    render(
      <LocaleProvider initialLocale={locale}>
        <TripDetail
          tripId={tripId}
          canAddEntry={canEdit}
          canEditTrip={canEdit}
          canDeleteTrip={false}
          canManageShare={false}
          canManageViewers={false}
          canTransferOwnership={false}
        />
      </LocaleProvider>,
    );

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows the trip total and the last 30 days for a contributor", async () => {
    stubFetch({
      trip: { total: 142, last30Days: 37 },
      entries: [
        { entryId: "entry-1", total: 12 },
        { entryId: "entry-2", total: 5 },
      ],
    });

    renderTripDetail(true);

    expect(await screen.findByText("Counted Trip")).toBeInTheDocument();

    const total = await screen.findByTestId("trip-views-total");
    const window = await screen.findByTestId("trip-views-last-30-days");

    expect(total).toHaveTextContent("142");
    expect(total).toHaveTextContent("Total views");
    expect(window).toHaveTextContent("37");
    expect(window).toHaveTextContent("Views (last 30 days)");
  });

  it("shows each entry's own total on its card", async () => {
    stubFetch({
      trip: { total: 142, last30Days: 37 },
      entries: [
        { entryId: "entry-1", total: 12 },
        { entryId: "entry-2", total: 1 },
      ],
    });

    renderTripDetail(true);

    const first = await screen.findByTestId("entry-views-entry-1");
    const second = await screen.findByTestId("entry-views-entry-2");

    expect(first.textContent?.trim()).toBe("12 views");
    // A single view must not read "1 views".
    expect(second.textContent?.trim()).toBe("1 view");
  });

  it("renders 0 rather than a blank or a loading state when nothing was viewed", async () => {
    stubFetch({
      trip: { total: 0, last30Days: 0 },
      entries: [
        { entryId: "entry-1", total: 0 },
        { entryId: "entry-2", total: 0 },
      ],
    });

    renderTripDetail(true);

    const total = await screen.findByTestId("trip-views-total");
    expect(total).toHaveTextContent("0");
    expect(
      (await screen.findByTestId("entry-views-entry-1")).textContent?.trim(),
    ).toBe("0 views");
  });

  it("hides every count from a read-only viewer and never requests them", async () => {
    const fetchMock = stubFetch(null);

    renderTripDetail(false);

    expect(await screen.findByText("Roman morning")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(screen.queryByTestId("trip-views-total")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("trip-views-last-30-days"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("entry-views-entry-1")).not.toBeInTheDocument();
    expect(screen.queryByText(/total views/i)).not.toBeInTheDocument();

    const requestedUrls = fetchMock.mock.calls.map(([input]) =>
      typeof input === "string" ? input : String(input),
    );
    expect(requestedUrls.some((url) => url.includes("/view-counts"))).toBe(
      false,
    );
  });

  it("renders the counts in German when the locale is German", async () => {
    stubFetch({
      trip: { total: 9, last30Days: 4 },
      entries: [{ entryId: "entry-1", total: 3 }],
    });

    renderTripDetail(true, "de");

    const total = await screen.findByTestId("trip-views-total");
    const window30 = await screen.findByTestId("trip-views-last-30-days");

    expect(total).toHaveTextContent("Aufrufe insgesamt");
    expect(window30).toHaveTextContent("Aufrufe (letzte 30 Tage)");
    expect(
      (await screen.findByTestId("entry-views-entry-1")).textContent?.trim(),
    ).toBe("3 Aufrufe");
    expect(screen.queryByText(/Besucher/i)).not.toBeInTheDocument();
  });

  it("stays usable when the count request fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/view-counts")) {
        return new Response(
          JSON.stringify({
            data: null,
            error: { code: "INTERNAL_SERVER_ERROR", message: "Boom." },
          }),
          { status: 500 },
        );
      }
      if (url.includes(`/api/trips/${tripId}/overview`)) {
        return jsonResponse({ trip, entries: [] });
      }
      if (url.includes(`/api/entries?tripId=${tripId}`)) {
        return jsonResponse(entries);
      }
      if (url.includes(`/api/trips/${tripId}`)) {
        return jsonResponse(trip);
      }
      return jsonResponse(null);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderTripDetail(true);

    expect(await screen.findByText("Roman morning")).toBeInTheDocument();
    expect(screen.queryByTestId("trip-views-total")).not.toBeInTheDocument();
  });
});

describe("shared trip render path", () => {
  // Both locales are exercised: the label assertions below are per-catalog, so
  // checking only one locale would leave the other one's wording unguarded.
  it.each(["en", "de"] as const)(
    "renders no view count anywhere in the shared markup (%s)",
    (locale) => {
      const { container } = render(
        <LocaleProvider initialLocale={locale}>
          <TripOverview
            trip={{
              id: "trip-shared-counts",
              title: "Shared Adventure",
              startDate: "2026-06-01T00:00:00.000Z",
              endDate: "2026-06-08T00:00:00.000Z",
              coverImageUrl: null,
            }}
            entries={[
              {
                id: "entry-shared-1",
                tripId: "trip-shared-counts",
                title: "Day one",
                createdAt: "2026-06-02T12:00:00.000Z",
                coverImageUrl: "/uploads/entries/day-one.jpg",
                tags: [],
                media: [{ url: "/uploads/entries/day-one-media.jpg" }],
              },
            ]}
            entryLinkBase="/trips/share/abc123/entries"
          />
        </LocaleProvider>,
      );

      const markup = container.innerHTML;

      expect(screen.queryByTestId("trip-views-total")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("trip-views-last-30-days"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("entry-views-entry-shared-1"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/total views/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Aufrufe/i)).not.toBeInTheDocument();

      // Also guard the paths a reader cannot see on screen: data attributes and
      // any embedded JSON payload.
      expect(markup).not.toMatch(/view-?counts?/i);
      expect(markup).not.toMatch(/last30Days/i);
    },
  );
});
