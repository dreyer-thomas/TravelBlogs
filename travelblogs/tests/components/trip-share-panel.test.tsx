// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ImgHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import TripDetail from "../../src/components/trips/trip-detail";

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

describe("TripDetail share panel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders share control in the header near the owner label", async () => {
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
            data: [],
            error: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 404 }));

    vi.stubGlobal("fetch", fetchMock);

    render(<TripDetail tripId="trip-1" />);

    const ownerLabel = await screen.findByText(/owner:/i);
    const headerSection = ownerLabel.closest("section");
    expect(headerSection).not.toBeNull();

    if (!headerSection) {
      return;
    }

    expect(
      within(headerSection).getByRole("button", { name: /share trip/i }),
    ).toBeInTheDocument();
  });

  it("renders share link and copies it", async () => {
    const shareUrl = "http://localhost/trips/share/test-token";
    const viewersResponse = [
      {
        id: "access-1",
        tripId: "trip-1",
        userId: "viewer-1",
        canContribute: false,
        createdAt: "2025-05-01T00:00:00.000Z",
        user: {
          id: "viewer-1",
          name: "Jamie Viewer",
          email: "viewer@example.com",
        },
      },
    ];
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
            data: [],
            error: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: viewersResponse,
            error: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              shareUrl,
              token: "test-token",
              tripId: "trip-1",
            },
            error: null,
          }),
          { status: 200 },
        ),
      );

    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText,
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TripDetail tripId="trip-1" />);

    const shareTrigger = await screen.findByRole("button", {
      name: /share trip/i,
    });
    fireEvent.click(shareTrigger);

    const createButton = await screen.findByRole("button", {
      name: /generate link/i,
    });
    fireEvent.click(createButton);

    const shareInput = await screen.findByLabelText("Share URL");
    expect(shareInput).toHaveValue(shareUrl);

    fireEvent.click(
      screen.getByRole("button", { name: /copy link/i }),
    );

    expect(writeText).toHaveBeenCalledWith(shareUrl);
  });

  it("shows an existing share link without regenerate action", async () => {
    const shareUrl = "http://localhost/trips/share/existing-token";
    const viewersResponse = [
      {
        id: "access-1",
        tripId: "trip-1",
        userId: "viewer-1",
        canContribute: false,
        createdAt: "2025-05-01T00:00:00.000Z",
        user: {
          id: "viewer-1",
          name: "Jamie Viewer",
          email: "viewer@example.com",
        },
      },
    ];
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
              shareUrl,
              token: "existing-token",
              tripId: "trip-1",
            },
            error: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: viewersResponse,
            error: null,
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    render(<TripDetail tripId="trip-1" />);

    const shareTrigger = await screen.findByRole("button", {
      name: /share trip/i,
    });
    fireEvent.click(shareTrigger);

    const shareInput = await screen.findByDisplayValue(shareUrl);
    expect(shareInput).toHaveValue(shareUrl);
    expect(
      screen.queryByRole("button", { name: /regenerate link/i }),
    ).toBeNull();
  });

  it("revokes a share link from the Trip Actions area", async () => {
    const shareUrl = "http://localhost/trips/share/existing-token";
    const viewersResponse = [];
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
              shareUrl,
              token: "existing-token",
              tripId: "trip-1",
            },
            error: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              revoked: true,
              tripId: "trip-1",
            },
            error: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: viewersResponse,
            error: null,
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    render(<TripDetail tripId="trip-1" />);

    const actionsHeader = await screen.findByText(/trip actions/i);
    const actionsSection = actionsHeader.closest("section");
    expect(actionsSection).not.toBeNull();

    if (!actionsSection) {
      return;
    }

    const revokeButton = within(actionsSection).getByRole("button", {
      name: /revoke share link/i,
    });
    fireEvent.click(revokeButton);

    const confirmButton = await screen.findByRole("button", {
      name: /yes, revoke/i,
    });
    fireEvent.click(confirmButton);

    const shareTrigger = await screen.findByRole("button", {
      name: /share trip/i,
    });
    fireEvent.click(shareTrigger);

    await screen.findByText(/link revoked/i);
    expect(screen.queryByLabelText("Share URL")).toBeNull();
  });

  it("lists invited viewers and sends an invite", async () => {
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
            data: [],
            error: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "access-1",
                tripId: "trip-1",
                userId: "viewer-1",
                canContribute: false,
                createdAt: "2025-05-01T00:00:00.000Z",
                user: {
                  id: "viewer-1",
                  name: "Jamie Viewer",
                  email: "viewer@example.com",
                },
              },
            ],
            error: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "access-2",
              tripId: "trip-1",
              userId: "viewer-2",
              canContribute: false,
              createdAt: "2025-05-02T00:00:00.000Z",
              user: {
                id: "viewer-2",
                name: "Riley Guest",
                email: "riley@example.com",
              },
            },
            error: null,
          }),
          { status: 201 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    render(<TripDetail tripId="trip-1" />);

    const shareTrigger = await screen.findByRole("button", {
      name: /share trip/i,
    });
    fireEvent.click(shareTrigger);

    await screen.findByText("Jamie Viewer");
    expect(screen.getByText("viewer@example.com")).toBeInTheDocument();
    const inviteInput = await screen.findByLabelText("Invite viewer email");
    fireEvent.change(inviteInput, {
      target: { value: "riley@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^invite$/i }));

    await screen.findByText("Riley Guest");
    expect(screen.getByText("riley@example.com")).toBeInTheDocument();
    expect(inviteInput).toHaveValue("");
  });

  it("shows invite errors inline", async () => {
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
            data: [],
            error: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
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
            data: null,
            error: {
              code: "NOT_FOUND",
              message: "User not found.",
            },
          }),
          { status: 404 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    render(<TripDetail tripId="trip-1" />);

    const shareTrigger = await screen.findByRole("button", {
      name: /share trip/i,
    });
    fireEvent.click(shareTrigger);

    const inviteInput = await screen.findByLabelText("Invite viewer email");
    fireEvent.change(inviteInput, {
      target: { value: "viewer@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^invite$/i }));

    await screen.findByText("User not found.");
  });
});
