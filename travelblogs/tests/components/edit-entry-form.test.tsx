// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import EditEntryForm from "../../src/components/entries/edit-entry-form";
import { uploadEntryMedia } from "../../src/utils/entry-media";

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
    uploadEntryMedia: vi.fn(),
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
        initialText=""
        initialMediaUrls={[]}
      />,
    );

    const submitButton = screen.getByRole("button", { name: /save entry/i });
    expect(submitButton).toBeDisabled();

    const textArea = screen.getByLabelText(/entry text/i);
    const mediaInput = screen.getByLabelText(/photos section/i);

    fireEvent.blur(textArea);
    fireEvent.blur(mediaInput);

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
        initialText="Existing text"
        initialMediaUrls={["/uploads/entries/old.jpg"]}
      />,
    );

    const input = screen.getByLabelText(/photos section/i);
    const badFile = new File(["bad"], "bad.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [badFile] } });

    expect(
      await screen.findByText("Media files must be a JPG, PNG, or WebP file."),
    ).toBeInTheDocument();
    expect(uploadEntryMedia).not.toHaveBeenCalled();
  });
});
