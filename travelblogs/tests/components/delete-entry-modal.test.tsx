// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import DeleteEntryModal from "../../src/components/entries/delete-entry-modal";
import { LocaleProvider } from "../../src/utils/locale-context";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
    refresh,
  }),
}));

describe("DeleteEntryModal", () => {
  const renderWithLocale = (component: JSX.Element) =>
    render(<LocaleProvider>{component}</LocaleProvider>);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens and closes the confirmation dialog", () => {
    renderWithLocale(
      <DeleteEntryModal
        tripId="trip-123"
        entryId="entry-123"
        entryTitle="Summer sunset"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /delete entry/i }),
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /keep entry/i }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deletes the entry and returns to the trip view", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "entry-123" }, error: null }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithLocale(
      <DeleteEntryModal
        tripId="trip-123"
        entryId="entry-123"
        entryTitle="Summer sunset"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /delete entry/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /yes, delete/i }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/entries/entry-123",
        expect.objectContaining({
          method: "DELETE",
          credentials: "include",
        }),
      );
    });

    expect(replace).toHaveBeenCalledWith("/trips/trip-123");
    expect(refresh).toHaveBeenCalled();
  });

  it("keeps the entry when cancellation is chosen", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderWithLocale(
      <DeleteEntryModal
        tripId="trip-123"
        entryId="entry-123"
        entryTitle="Summer sunset"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /delete entry/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /keep entry/i }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
