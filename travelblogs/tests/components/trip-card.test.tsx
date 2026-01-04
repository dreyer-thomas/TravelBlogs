// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ImgHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import TripCard from "../../src/components/trips/trip-card";

const pushMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

describe("TripCard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
    pushMock.mockReset();
  });

  it("shows view for all trips and hides edit without edit access", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            shareUrl: "http://localhost/trips/share/shared-token",
            token: "shared-token",
            tripId: "trip-1",
          },
          error: null,
        }),
        { status: 200 },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    render(
      <TripCard
        id="trip-1"
        title="Viewer Trip"
        startDate="2025-05-01T00:00:00.000Z"
        endDate="2025-05-05T00:00:00.000Z"
        coverImageUrl={null}
        canEditTrip={false}
      />,
    );

    const viewButton = screen.getByRole("button", { name: "View" });

    expect(viewButton).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();

    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/trips/trip-1/share-link",
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

  it("links to edit when edit access is available", () => {
    render(
      <TripCard
        id="trip-2"
        title="Contributor Trip"
        startDate="2025-06-01T00:00:00.000Z"
        endDate="2025-06-05T00:00:00.000Z"
        coverImageUrl={null}
        canEditTrip
      />,
    );

    const editLink = screen.getByRole("link", { name: "Edit" });
    expect(editLink).toHaveAttribute("href", "/trips/trip-2/edit");
  });

  it("opens the shared view when the card is clicked", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            shareUrl: "http://localhost/trips/share/card-token",
            token: "card-token",
            tripId: "trip-3",
          },
          error: null,
        }),
        { status: 200 },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    render(
      <TripCard
        id="trip-3"
        title="Clickable Trip"
        startDate="2025-07-01T00:00:00.000Z"
        endDate="2025-07-05T00:00:00.000Z"
        coverImageUrl={null}
        canEditTrip={false}
      />,
    );

    const cardButton = screen.getByTestId("trip-card-trip-3");
    fireEvent.click(cardButton);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/trips/share/card-token");
    });
  });

  it("hides the active badge for trips in the past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-05-03T12:00:00.000Z"));

    render(
      <TripCard
        id="trip-4"
        title="Past Trip"
        startDate="2025-04-01T00:00:00.000Z"
        endDate="2025-04-10T00:00:00.000Z"
        coverImageUrl={null}
        canEditTrip={false}
      />,
    );

    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });

  it("hides the active badge for trips in the future", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-05-03T12:00:00.000Z"));

    render(
      <TripCard
        id="trip-5"
        title="Future Trip"
        startDate="2025-06-01T00:00:00.000Z"
        endDate="2025-06-10T00:00:00.000Z"
        coverImageUrl={null}
        canEditTrip={false}
      />,
    );

    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });

  it("shows the active badge when today is within the trip dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-05-03T12:00:00.000Z"));

    render(
      <TripCard
        id="trip-6"
        title="Current Trip"
        startDate="2025-05-01T00:00:00.000Z"
        endDate="2025-05-05T00:00:00.000Z"
        coverImageUrl={null}
        canEditTrip={false}
      />,
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows the active badge when today matches the start date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-05-01T09:00:00.000Z"));

    render(
      <TripCard
        id="trip-7"
        title="Start Boundary Trip"
        startDate="2025-05-01T00:00:00.000Z"
        endDate="2025-05-05T00:00:00.000Z"
        coverImageUrl={null}
        canEditTrip={false}
      />,
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows the active badge when today matches the end date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-05-05T23:59:00.000Z"));

    render(
      <TripCard
        id="trip-8"
        title="End Boundary Trip"
        startDate="2025-05-01T00:00:00.000Z"
        endDate="2025-05-05T00:00:00.000Z"
        coverImageUrl={null}
        canEditTrip={false}
      />,
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("hides the active badge when dates are invalid", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-05-03T12:00:00.000Z"));

    render(
      <TripCard
        id="trip-9"
        title="Invalid Trip"
        startDate="not-a-date"
        endDate="2025-05-05T00:00:00.000Z"
        coverImageUrl={null}
        canEditTrip={false}
      />,
    );

    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });
});
