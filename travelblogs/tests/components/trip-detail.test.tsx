// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ImgHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import TripDetail from "../../src/components/trips/trip-detail";
import { LocaleProvider } from "../../src/utils/locale-context";

const pushMock = vi.hoisted(() => vi.fn());

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
    push: pushMock,
    refresh: vi.fn(),
  }),
}));

const renderWithProvider = (component: React.ReactElement) => {
  return render(<LocaleProvider>{component}</LocaleProvider>);
};

describe("TripDetail", () => {
  const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify({ data, error: null }), { status });

  const createFetchMock = (
    handlers: Array<{
      match: string;
      respond: (url: string, init?: RequestInit) => Response;
    }>,
  ) =>
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const handler = handlers.find(({ match }) => url.includes(match));
      if (!handler) {
        return new Response(
          JSON.stringify({
            data: null,
            error: { code: "UNMOCKED", message: `No mock for ${url}` },
          }),
          { status: 500 },
        );
      }
      return handler.respond(url, init);
    });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    pushMock.mockReset();
  });

  it("renders entry titles in the list", async () => {
    const fetchMock = createFetchMock([
      {
        match: "/api/trips/trip-1/overview",
        respond: () =>
          jsonResponse({
            trip: {
              id: "trip-1",
              title: "Italy Highlights",
              startDate: "2025-05-01T00:00:00.000Z",
              endDate: "2025-05-10T00:00:00.000Z",
              coverImageUrl: null,
            },
            entries: [
              {
                id: "entry-1",
                tripId: "trip-1",
                title: "Roman morning",
                coverImageUrl: null,
                createdAt: "2025-05-02T00:00:00.000Z",
                media: [],
                location: null,
              },
            ],
          }),
      },
      {
        match: "/api/entries?tripId=trip-1",
        respond: () =>
          jsonResponse([
            {
              id: "entry-1",
              tripId: "trip-1",
              title: "Roman morning",
              coverImageUrl: null,
              text: "Great day in Rome.",
              createdAt: "2025-05-02T00:00:00.000Z",
              updatedAt: "2025-05-02T00:00:00.000Z",
              media: [],
            },
          ]),
      },
      {
        match: "/api/trips/trip-1",
        respond: () =>
          jsonResponse({
            id: "trip-1",
            title: "Italy Highlights",
            startDate: "2025-05-01T00:00:00.000Z",
            endDate: "2025-05-10T00:00:00.000Z",
            coverImageUrl: null,
            ownerName: "Alex Owner",
          }),
      },
    ]);

    vi.stubGlobal("fetch", fetchMock);

    renderWithProvider(
      <TripDetail
        tripId="trip-1"
        canAddEntry
        canEditTrip
        canDeleteTrip
        canManageShare
        canManageViewers
        canTransferOwnership={false}
      />,
    );

    expect(await screen.findByText("Roman morning")).toBeInTheDocument();
    expect(await screen.findByText("Alex Owner")).toBeInTheDocument();
  });

  it("shows edit trip without delete when delete access is missing", async () => {
    const fetchMock = createFetchMock([
      {
        match: "/api/trips/trip-2/overview",
        respond: () =>
          jsonResponse({
            trip: {
              id: "trip-2",
              title: "Contributor Trip",
              startDate: "2025-06-01T00:00:00.000Z",
              endDate: "2025-06-05T00:00:00.000Z",
              coverImageUrl: null,
            },
            entries: [],
          }),
      },
      {
        match: "/api/entries?tripId=trip-2",
        respond: () => jsonResponse([]),
      },
      {
        match: "/api/trips/trip-2",
        respond: () =>
          jsonResponse({
            id: "trip-2",
            title: "Contributor Trip",
            startDate: "2025-06-01T00:00:00.000Z",
            endDate: "2025-06-05T00:00:00.000Z",
            coverImageUrl: null,
          }),
      },
    ]);

    vi.stubGlobal("fetch", fetchMock);

    renderWithProvider(
      <TripDetail
        tripId="trip-2"
        canAddEntry
        canEditTrip
        canDeleteTrip={false}
        canManageShare={false}
        canManageViewers={false}
        canTransferOwnership={false}
      />,
    );

    expect(await screen.findByText("Edit trip")).toBeInTheDocument();
    expect(screen.queryByText("Delete trip")).not.toBeInTheDocument();
  });

  it("links to edit trip details page from trip overview when canEditTrip is true", async () => {
    const fetchMock = createFetchMock([
      {
        match: "/api/trips/trip-5/overview",
        respond: () =>
          jsonResponse({
            trip: {
              id: "trip-5",
              title: "Edit Navigation Trip",
              startDate: "2025-06-01T00:00:00.000Z",
              endDate: "2025-06-05T00:00:00.000Z",
              coverImageUrl: null,
            },
            entries: [],
          }),
      },
      {
        match: "/api/entries?tripId=trip-5",
        respond: () => jsonResponse([]),
      },
      {
        match: "/api/trips/trip-5",
        respond: () =>
          jsonResponse({
            id: "trip-5",
            title: "Edit Navigation Trip",
            startDate: "2025-06-01T00:00:00.000Z",
            endDate: "2025-06-05T00:00:00.000Z",
            coverImageUrl: null,
          }),
      },
    ]);

    vi.stubGlobal("fetch", fetchMock);

    renderWithProvider(
      <TripDetail
        tripId="trip-5"
        canAddEntry
        canEditTrip
        canDeleteTrip={false}
        canManageShare={false}
        canManageViewers={false}
        canTransferOwnership={false}
      />,
    );

    const editLink = await screen.findByRole("link", { name: "Edit trip" });
    expect(editLink).toHaveAttribute("href", "/trips/trip-5/edit");
  });

  it("shows the view button for read-only users and opens the shared view", async () => {
    const fetchMock = createFetchMock([
      {
        match: "/api/trips/trip-3/share-link",
        respond: (_, init) => {
          if (init?.method === "POST") {
            return jsonResponse({
              shareUrl: "http://localhost/trips/share/shared-token",
              token: "shared-token",
              tripId: "trip-3",
            });
          }
          return jsonResponse(null, 404);
        },
      },
      {
        match: "/api/trips/trip-3/overview",
        respond: () =>
          jsonResponse({
            trip: {
              id: "trip-3",
              title: "Viewer Trip",
              startDate: "2025-06-01T00:00:00.000Z",
              endDate: "2025-06-05T00:00:00.000Z",
              coverImageUrl: null,
            },
            entries: [],
          }),
      },
      {
        match: "/api/trips/trip-3",
        respond: () =>
          jsonResponse({
            id: "trip-3",
            title: "Viewer Trip",
            startDate: "2025-06-01T00:00:00.000Z",
            endDate: "2025-06-05T00:00:00.000Z",
            coverImageUrl: null,
          }),
      },
      {
        match: "/api/entries?tripId=trip-3",
        respond: () => jsonResponse([]),
      },
    ]);

    vi.stubGlobal("fetch", fetchMock);

    renderWithProvider(
      <TripDetail
        tripId="trip-3"
        canAddEntry={false}
        canEditTrip={false}
        canDeleteTrip={false}
        canManageShare={false}
        canManageViewers={false}
        canTransferOwnership={false}
      />,
    );

    const viewButton = await screen.findByRole("button", { name: "View" });

    expect(viewButton).toBeInTheDocument();
    expect(screen.queryByText("Edit trip")).not.toBeInTheDocument();

    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/trips/trip-3/share-link",
        {
          method: "POST",
          credentials: "include",
        },
      );
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/trips/share/shared-token");
    });
  });

  it("lists only eligible users in the transfer ownership selector", async () => {
    const fetchMock = createFetchMock([
      {
        match: "/api/trips/trip-4/transfer-ownership",
        respond: () =>
          jsonResponse([
            {
              id: "admin-1",
              name: "Admin",
              email: "admin@example.com",
              role: "administrator",
              createdAt: "2025-06-01T00:00:00.000Z",
              updatedAt: "2025-06-01T00:00:00.000Z",
            },
            {
              id: "viewer-1",
              name: "Viewer",
              email: "viewer@example.com",
              role: "viewer",
              createdAt: "2025-06-01T00:00:00.000Z",
              updatedAt: "2025-06-01T00:00:00.000Z",
            },
          ]),
      },
      {
        match: "/api/trips/trip-4/overview",
        respond: () =>
          jsonResponse({
            trip: {
              id: "trip-4",
              title: "Transfer Trip",
              startDate: "2025-06-01T00:00:00.000Z",
              endDate: "2025-06-05T00:00:00.000Z",
              coverImageUrl: null,
            },
            entries: [],
          }),
      },
      {
        match: "/api/trips/trip-4",
        respond: () =>
          jsonResponse({
            id: "trip-4",
            title: "Transfer Trip",
            startDate: "2025-06-01T00:00:00.000Z",
            endDate: "2025-06-05T00:00:00.000Z",
            coverImageUrl: null,
          }),
      },
      {
        match: "/api/entries?tripId=trip-4",
        respond: () => jsonResponse([]),
      },
    ]);

    vi.stubGlobal("fetch", fetchMock);

    renderWithProvider(
      <TripDetail
        tripId="trip-4"
        canAddEntry
        canEditTrip
        canDeleteTrip
        canManageShare={false}
        canManageViewers={false}
        canTransferOwnership
      />,
    );

    const transferButton = await screen.findByRole("button", {
      name: "Transfer ownership",
    });

    fireEvent.click(transferButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/trips/trip-4/transfer-ownership",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );
    });

    const select = await screen.findByLabelText("New owner");

    expect(select).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Admin (administrator)" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Viewer (viewer)" }),
    ).not.toBeInTheDocument();
  });
});
