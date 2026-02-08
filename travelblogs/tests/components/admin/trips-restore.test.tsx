// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TripsRestoreDashboard from "../../../src/components/admin/trips-restore-dashboard";
import { LocaleProvider } from "../../../src/utils/locale-context";

class MockXMLHttpRequest {
  static instances: MockXMLHttpRequest[] = [];
  status = 0;
  response: unknown = null;
  responseText = "";
  responseType = "";
  upload = {
    onprogress: null as ((event: ProgressEvent) => void) | null,
    onloadend: null as ((event: ProgressEvent) => void) | null,
  };
  onload: ((event: ProgressEvent) => void) | null = null;
  onerror: ((event: ProgressEvent) => void) | null = null;
  open = vi.fn();
  send = vi.fn();
  abort = vi.fn();

  constructor() {
    MockXMLHttpRequest.instances.push(this);
  }
}

describe("TripsRestoreDashboard", () => {
  const originalXhr = global.XMLHttpRequest;

  beforeEach(() => {
    MockXMLHttpRequest.instances = [];
    global.XMLHttpRequest = MockXMLHttpRequest as unknown as typeof XMLHttpRequest;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.XMLHttpRequest = originalXhr;
  });

  it("shows restore summary after validation", async () => {
    render(
      <LocaleProvider>
        <TripsRestoreDashboard />
      </LocaleProvider>,
    );

    const input = screen.getByLabelText("Trip export ZIP") as HTMLInputElement;
    const file = new File(["zip"], "trip.zip", { type: "application/zip" });

    await userEvent.upload(input, file);
    await userEvent.click(
      screen.getByRole("button", { name: "Validate restore" }),
    );

    const xhr = MockXMLHttpRequest.instances[0];
    xhr.upload.onprogress?.(
      { lengthComputable: true, loaded: 5, total: 10 } as ProgressEvent,
    );
    expect(await screen.findByText("Uploading restore... 50%")).toBeInTheDocument();
    xhr.upload.onloadend?.(new ProgressEvent("loadend"));
    xhr.status = 200;
    xhr.response = {
      data: {
        summary: {
          tripId: "trip-1",
          counts: { trip: 1, entries: 2, tags: 3, media: 4 },
          conflicts: { entries: [], tags: [], media: [], mediaUrls: [] },
        },
      },
      error: null,
    };
    xhr.onload?.(new ProgressEvent("load"));

    expect(await screen.findByText("Restore summary")).toBeInTheDocument();
    expect(screen.getByText("Trip ID: trip-1")).toBeInTheDocument();
    expect(screen.getByText("Trip: 1")).toBeInTheDocument();
    expect(screen.getByText("Entries: 2")).toBeInTheDocument();
    expect(
      await screen.findByText("Validation complete."),
    ).toBeInTheDocument();
  });

  it("surfaces errors from the API", async () => {
    render(
      <LocaleProvider>
        <TripsRestoreDashboard />
      </LocaleProvider>,
    );

    const input = screen.getByLabelText("Trip export ZIP") as HTMLInputElement;
    const file = new File(["zip"], "trip.zip", { type: "application/zip" });

    await userEvent.upload(input, file);
    await userEvent.click(
      screen.getByRole("button", { name: "Validate restore" }),
    );

    const xhr = MockXMLHttpRequest.instances[0];
    xhr.upload.onprogress?.(
      { lengthComputable: true, loaded: 10, total: 10 } as ProgressEvent,
    );
    xhr.upload.onloadend?.(new ProgressEvent("loadend"));
    xhr.status = 400;
    xhr.response = {
      data: null,
      error: { code: "INVALID_ZIP", message: "Restore archive is invalid." },
    };
    xhr.onload?.(new ProgressEvent("load"));

    expect(
      await screen.findByText("Restore archive is invalid."),
    ).toBeInTheDocument();
  });

  it("shows success after running a restore", async () => {
    render(
      <LocaleProvider>
        <TripsRestoreDashboard />
      </LocaleProvider>,
    );

    const input = screen.getByLabelText("Trip export ZIP") as HTMLInputElement;
    const file = new File(["zip"], "trip.zip", { type: "application/zip" });

    await userEvent.upload(input, file);
    await userEvent.click(
      screen.getByRole("button", { name: "Restore trip" }),
    );

    const xhr = MockXMLHttpRequest.instances[0];
    xhr.upload.onprogress?.(
      { lengthComputable: true, loaded: 2, total: 4 } as ProgressEvent,
    );
    expect(await screen.findByText("Uploading restore... 50%")).toBeInTheDocument();
    xhr.upload.onloadend?.(new ProgressEvent("loadend"));
    xhr.status = 201;
    xhr.response = {
      data: {
        summary: {
          tripId: "trip-2",
          counts: { trip: 1, entries: 1, tags: 0, media: 0 },
          conflicts: { entries: [], tags: [], media: [], mediaUrls: [] },
        },
      },
      error: null,
    };
    xhr.onload?.(new ProgressEvent("load"));

    expect(
      await screen.findByText("Trip restored successfully."),
    ).toBeInTheDocument();
    expect(await screen.findByText("Restore summary")).toBeInTheDocument();
  });

  it("surfaces errors during restore runs", async () => {
    render(
      <LocaleProvider>
        <TripsRestoreDashboard />
      </LocaleProvider>,
    );

    const input = screen.getByLabelText("Trip export ZIP") as HTMLInputElement;
    const file = new File(["zip"], "trip.zip", { type: "application/zip" });

    await userEvent.upload(input, file);
    await userEvent.click(
      screen.getByRole("button", { name: "Restore trip" }),
    );

    const xhr = MockXMLHttpRequest.instances[0];
    xhr.upload.onprogress?.(
      { lengthComputable: true, loaded: 4, total: 4 } as ProgressEvent,
    );
    xhr.upload.onloadend?.(new ProgressEvent("loadend"));
    xhr.status = 500;
    xhr.response = {
      data: null,
      error: { code: "RESTORE_FAILED", message: "Restore failed." },
    };
    xhr.onload?.(new ProgressEvent("load"));

    expect(await screen.findByText("Restore failed.")).toBeInTheDocument();
  });
});
