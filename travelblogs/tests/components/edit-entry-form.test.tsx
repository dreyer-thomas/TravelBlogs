// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import EditEntryForm from "../../src/components/entries/edit-entry-form";
import { uploadEntryMediaBatch } from "../../src/utils/entry-media";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("../../src/utils/entry-media", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/utils/entry-media")>();
  return {
    ...actual,
    uploadEntryMediaBatch: vi.fn(),
  };
});

describe("EditEntryForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (!URL.createObjectURL) {
      URL.createObjectURL = () => "blob:preview";
    }
  });

  it("shows validation errors when required fields are missing", async () => {
    render(
      <EditEntryForm
        tripId="trip-123"
        entryId="entry-123"
        initialEntryDate=""
        initialTitle=""
        initialText=""
        initialMediaUrls={[]}
      />,
    );

    const submitButton = screen.getByRole("button", { name: /save entry/i });
    expect(submitButton).toBeDisabled();

    const dateInput = screen.getByLabelText(/entry date/i);
    const titleInput = screen.getByLabelText(/entry title/i);
    const textArea = screen.getByLabelText(/entry text/i);
    const mediaInput = screen.getByLabelText(/photos section/i);

    fireEvent.blur(dateInput);
    fireEvent.blur(titleInput);
    fireEvent.blur(textArea);
    fireEvent.blur(mediaInput);

    expect(
      await screen.findByText("Entry date is required."),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Entry title is required."),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Entry text is required."),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Add at least one photo in the text or in the photos section.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a validation error for invalid media files", async () => {
    render(
      <EditEntryForm
        tripId="trip-123"
        entryId="entry-123"
        initialEntryDate="2025-05-03T00:00:00.000Z"
        initialTitle="Existing title"
        initialText="Existing text"
        initialMediaUrls={["/uploads/entries/old.jpg"]}
      />,
    );

    const input = screen.getByLabelText(/photos section/i);
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

    render(
      <EditEntryForm
        tripId="trip-123"
        entryId="entry-123"
        initialEntryDate="2025-05-03T00:00:00.000Z"
        initialTitle="Existing title"
        initialText="Existing text"
        initialMediaUrls={["/uploads/entries/old.jpg"]}
      />,
    );

    const input = screen.getByLabelText(/photos section/i);
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
});
