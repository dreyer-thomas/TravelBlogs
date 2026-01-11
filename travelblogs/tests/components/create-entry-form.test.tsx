// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import CreateEntryForm from "../../src/components/entries/create-entry-form";
import { uploadEntryMediaBatch } from "../../src/utils/entry-media";
import { extractGpsFromImage } from "../../src/utils/entry-location";
import { LocaleProvider } from "../../src/utils/locale-context";

vi.mock("../../src/utils/entry-media", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/utils/entry-media")>();
  return {
    ...actual,
    uploadEntryMediaBatch: vi.fn(),
  };
});

vi.mock("../../src/utils/entry-location", () => ({
  extractGpsFromImage: vi.fn(),
}));

describe("CreateEntryForm", () => {
  const renderWithLocale = (component: JSX.Element) =>
    render(<LocaleProvider>{component}</LocaleProvider>);

  beforeEach(() => {
    vi.clearAllMocks();
    if (!URL.createObjectURL) {
      URL.createObjectURL = () => "blob:preview";
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("shows validation errors when submitting without required fields", async () => {
    renderWithLocale(<CreateEntryForm tripId="trip-123" />);

    const submitButton = screen.getByRole("button", { name: /add entry/i });
    expect(submitButton).toBeDisabled();

    const titleInput = screen.getByLabelText(/entry title/i);
    const textArea = screen.getByLabelText(/entry text/i);
    const mediaInput = screen.getByLabelText(/entry image library/i);

    fireEvent.blur(titleInput);
    fireEvent.blur(textArea);
    fireEvent.blur(mediaInput);

    expect(
      await screen.findByText("Entry title is required."),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Entry text is required."),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Add at least one photo in the library or inline text.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a validation error for invalid media files", async () => {
    renderWithLocale(<CreateEntryForm tripId="trip-123" />);

    const input = screen.getByLabelText(/entry image library/i);
    const badFile = new File(["bad"], "bad.txt", { type: "text/plain" });
    const worseFile = new File(["worse"], "worse.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [badFile, worseFile] } });

    expect(await screen.findByText("bad.txt")).toBeInTheDocument();
    expect(await screen.findByText("worse.txt")).toBeInTheDocument();
    expect(
      await screen.findAllByText(
        "Failed: Media files must be a JPG, PNG, or WebP file.",
      ),
    ).toHaveLength(2);
    expect(uploadEntryMediaBatch).not.toHaveBeenCalled();
  });

  it("shows per-file statuses for multi-file uploads", async () => {
    const uploadEntryMediaBatchMock = vi.mocked(uploadEntryMediaBatch);
    uploadEntryMediaBatchMock.mockImplementation(async (files, options) => ({
      uploads: [
        {
          fileId: options?.getFileId?.(files[0]) ?? files[0].name,
          fileName: files[0].name,
          url: "/uploads/first.jpg",
        },
      ],
      failures: [
        {
          fileId: options?.getFileId?.(files[1]) ?? files[1].name,
          fileName: files[1].name,
          message: "Upload failed.",
        },
      ],
    }));

    renderWithLocale(<CreateEntryForm tripId="trip-123" />);

    const input = screen.getByLabelText(/entry image library/i);
    const firstFile = new File(["first"], "first.jpg", { type: "image/jpeg" });
    const secondFile = new File(["second"], "second.jpg", {
      type: "image/jpeg",
    });

    fireEvent.change(input, { target: { files: [firstFile, secondFile] } });

    expect(await screen.findByText("first.jpg")).toBeInTheDocument();
    expect(await screen.findByText("second.jpg")).toBeInTheDocument();
    expect(await screen.findByText("Uploaded")).toBeInTheDocument();
    expect(await screen.findByText("Failed: Upload failed.")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /retry/i }),
    ).toBeInTheDocument();
  });

  it("allows selecting a story image from the library", async () => {
    const uploadEntryMediaBatchMock = vi.mocked(uploadEntryMediaBatch);
    uploadEntryMediaBatchMock.mockImplementation(async (files, options) => ({
      uploads: [
        {
          fileId: options?.getFileId?.(files[0]) ?? files[0].name,
          fileName: files[0].name,
          url: "/uploads/story.jpg",
        },
      ],
      failures: [],
    }));

    renderWithLocale(<CreateEntryForm tripId="trip-123" />);

    const input = screen.getByLabelText(/entry image library/i);
    const file = new File(["photo"], "story.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });

    const setButton = await screen.findByRole("button", {
      name: /set as story image/i,
    });
    await waitFor(() => expect(setButton).toBeEnabled());
    fireEvent.click(setButton);

    const selectedButton = await screen.findByRole("button", {
      name: /clear story image/i,
    });
    expect(selectedButton).toHaveAttribute("aria-pressed", "true");
  });

  it("inserts a library image inline at the cursor", async () => {
    const uploadEntryMediaBatchMock = vi.mocked(uploadEntryMediaBatch);
    uploadEntryMediaBatchMock.mockImplementation(async (files, options) => ({
      uploads: [
        {
          fileId: options?.getFileId?.(files[0]) ?? files[0].name,
          fileName: files[0].name,
          url: "/uploads/inline.jpg",
        },
      ],
      failures: [],
    }));

    renderWithLocale(<CreateEntryForm tripId="trip-123" />);

    const textArea = screen.getByLabelText(/entry text/i);
    fireEvent.change(textArea, { target: { value: "Hello" } });
    textArea.setSelectionRange(5, 5);
    fireEvent.click(textArea);

    const input = screen.getByLabelText(/entry image library/i);
    const file = new File(["photo"], "inline.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });

    const insertButton = await screen.findByRole("button", {
      name: /insert inline/i,
    });
    fireEvent.click(insertButton);

    expect(textArea.value).toMatch(
      /^Hello!\[Entry photo\]\(\/uploads\/inline\.jpg\)$/,
    );
  });

  it("removes a library image from the gallery and inline text", async () => {
    const uploadEntryMediaBatchMock = vi.mocked(uploadEntryMediaBatch);
    uploadEntryMediaBatchMock.mockImplementation(async (files, options) => ({
      uploads: [
        {
          fileId: options?.getFileId?.(files[0]) ?? files[0].name,
          fileName: files[0].name,
          url: "/uploads/remove.jpg",
        },
      ],
      failures: [],
    }));

    renderWithLocale(<CreateEntryForm tripId="trip-123" />);

    const textArea = screen.getByLabelText(/entry text/i);
    fireEvent.change(textArea, {
      target: { value: "Hello\n![Entry photo](/uploads/remove.jpg)" },
    });

    const input = screen.getByLabelText(/entry image library/i);
    const file = new File(["photo"], "remove.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });

    const selectButton = await screen.findByRole("button", {
      name: /set as story image/i,
    });
    fireEvent.click(selectButton);
    expect(
      await screen.findByRole("button", { name: /clear story image/i }),
    ).toBeInTheDocument();

    const removeButton = await screen.findByRole("button", {
      name: /remove/i,
    });
    fireEvent.click(removeButton);

    expect(textArea.value).not.toContain("/uploads/remove.jpg");
    expect(
      screen.queryByRole("button", { name: /clear story image/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /remove/i }),
    ).not.toBeInTheDocument();
  });

  it("searches locations and selects a result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "paris",
              latitude: 48.8566,
              longitude: 2.3522,
              displayName: "Paris, France",
            },
          ],
          error: null,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithLocale(<CreateEntryForm tripId="trip-123" />);

    const locationInput = screen.getByLabelText(/story location/i);
    fireEvent.change(locationInput, { target: { value: "Paris" } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled(), {
      timeout: 1000,
    });

    const resultButton = await screen.findByRole("button", {
      name: /paris, france/i,
    });
    fireEvent.click(resultButton);

    expect(await screen.findByText("Paris, France")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /clear location/i }),
    ).toBeInTheDocument();
  });

  it("uses photo GPS metadata to set the story location", async () => {
    const uploadEntryMediaBatchMock = vi.mocked(uploadEntryMediaBatch);
    uploadEntryMediaBatchMock.mockImplementation(async (files, options) => ({
      uploads: [
        {
          fileId: options?.getFileId?.(files[0]) ?? files[0].name,
          fileName: files[0].name,
          url: "/uploads/story.jpg",
        },
      ],
      failures: [],
    }));

    const extractGpsFromImageMock = vi.mocked(extractGpsFromImage);
    extractGpsFromImageMock.mockResolvedValue({
      latitude: 51.5055,
      longitude: -0.0754,
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(new Blob(["photo"], { type: "image/jpeg" }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderWithLocale(<CreateEntryForm tripId="trip-123" />);

    const input = screen.getByLabelText(/entry image library/i);
    const file = new File(["photo"], "story.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });

    const useLocationButton = await screen.findByRole("button", {
      name: /use photo location/i,
    });
    fireEvent.click(useLocationButton);

    expect(
      await screen.findByText(/photo location/i),
    ).toBeInTheDocument();
  });
});
