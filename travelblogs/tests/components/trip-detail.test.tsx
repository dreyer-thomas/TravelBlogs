// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ImgHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import TripDetail from "../../src/components/trips/trip-detail";

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

describe("TripDetail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    pushMock.mockReset();
  });

  it("renders entry titles in the list", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "trip-1",
              title: "Italy Highlights",
              startDate: "2025-05-01T00:00:00.000Z",
              endDate: "2025-05-10T00:00:00.000Z",
              coverImageUrl: null,
            },
            error: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
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
            ],
            error: null,
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    render(<TripDetail tripId="trip-1" canAddEntry canEditTrip canDeleteTrip canManageShare canManageViewers />);

    expect(await screen.findByText("Roman morning")).toBeInTheDocument();
  });

  it("shows edit trip without delete when delete access is missing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "trip-2",
              title: "Contributor Trip",
              startDate: "2025-06-01T00:00:00.000Z",
              endDate: "2025-06-05T00:00:00.000Z",
              coverImageUrl: null,
            },
            error: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [],
            error: null,
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    render(
      <TripDetail
        tripId="trip-2"
        canAddEntry
        canEditTrip
        canDeleteTrip={false}
        canManageShare={false}
        canManageViewers={false}
      />,
    );

    expect(await screen.findByText("Edit trip")).toBeInTheDocument();
    expect(screen.queryByText("Delete trip")).not.toBeInTheDocument();
  });

  it("shows the view button for read-only users and opens the shared view", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "trip-3",
              title: "Viewer Trip",
              startDate: "2025-06-01T00:00:00.000Z",
              endDate: "2025-06-05T00:00:00.000Z",
              coverImageUrl: null,
            },
            error: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [],
            error: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              shareUrl: "http://localhost/trips/share/shared-token",
              token: "shared-token",
              tripId: "trip-3",
            },
            error: null,
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    render(
      <TripDetail
        tripId="trip-3"
        canAddEntry={false}
        canEditTrip={false}
        canDeleteTrip={false}
        canManageShare={false}
        canManageViewers={false}
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
});
