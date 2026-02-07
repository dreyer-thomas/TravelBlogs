// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TripsExportDashboard from "../../../src/components/admin/trips-export-dashboard";
import { LocaleProvider } from "../../../src/utils/locale-context";

describe("TripsExportDashboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows export actions for trips", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            estimate: {
              totalBytes: 2048,
              jsonBytes: 256,
              mediaBytes: 1792,
              mediaCount: 2,
            },
          },
          error: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(
      <LocaleProvider>
        <TripsExportDashboard
          trips={[
            {
              id: "trip-1",
              title: "Everest Journey",
              startDate: "2025-05-01T00:00:00.000Z",
              endDate: "2025-05-10T00:00:00.000Z",
              ownerId: "owner-1",
              ownerName: "Owner Name",
              ownerEmail: "owner@example.com",
            },
          ]}
          showOwner
        />
      </LocaleProvider>,
    );

    expect(screen.getByText("Everest Journey")).toBeInTheDocument();
    expect(
      screen.getByText("Owner: Owner Name (owner@example.com)"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Export trip" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Estimated size: 2.0 KB")).toBeInTheDocument();
  });

  it("shows empty state when there are no trips", () => {
    render(
      <LocaleProvider>
        <TripsExportDashboard trips={[]} showOwner={false} />
      </LocaleProvider>,
    );

    expect(
      screen.getByText("No trips available for export."),
    ).toBeInTheDocument();
  });

  it("shows export progress states", async () => {
    let closeStream: (() => void) | null = null;
    const exportStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        closeStream = () => controller.close();
      },
    });

    vi.spyOn(global, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.includes("estimate=true")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                estimate: {
                  totalBytes: 3,
                  jsonBytes: 1,
                  mediaBytes: 2,
                  mediaCount: 1,
                },
              },
              error: null,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      }
      return Promise.resolve(
        new Response(exportStream, {
          status: 200,
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": "attachment; filename=\"trip-export.zip\"",
          },
        }),
      );
    });

    const createObjectUrlSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:trip-export");
    const revokeObjectUrlSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);

    render(
      <LocaleProvider>
        <TripsExportDashboard
          trips={[
            {
              id: "trip-2",
              title: "Progress Trip",
              startDate: "2025-05-01T00:00:00.000Z",
              endDate: "2025-05-10T00:00:00.000Z",
              ownerId: "owner-2",
            },
          ]}
          showOwner={false}
        />
      </LocaleProvider>,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "Export trip" }),
    );

    expect(
      await screen.findByText("Downloading export..."),
    ).toBeInTheDocument();

    closeStream?.();

    expect(await screen.findByText("Export ready.")).toBeInTheDocument();
    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalled();
  });

  it("shows an indeterminate progress bar when estimate is unavailable", async () => {
    let closeStream: (() => void) | null = null;
    const exportStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        closeStream = () => controller.close();
      },
    });

    vi.spyOn(global, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.includes("estimate=true")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: null,
              error: { code: "ESTIMATE_FAILED", message: "Estimate failed." },
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      }
      return Promise.resolve(
        new Response(exportStream, {
          status: 200,
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": "attachment; filename=\"trip-export.zip\"",
          },
        }),
      );
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:trip-export");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    render(
      <LocaleProvider>
        <TripsExportDashboard
          trips={[
            {
              id: "trip-3",
              title: "No Estimate Trip",
              startDate: "2025-05-01T00:00:00.000Z",
              endDate: "2025-05-10T00:00:00.000Z",
              ownerId: "owner-3",
            },
          ]}
          showOwner={false}
        />
      </LocaleProvider>,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "Export trip" }),
    );

    const progressBar = await screen.findByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuetext", "Downloading export...");

    closeStream?.();
    expect(await screen.findByText("Export ready.")).toBeInTheDocument();
  });
});
