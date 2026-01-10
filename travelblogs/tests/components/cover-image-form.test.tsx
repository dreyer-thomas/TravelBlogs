// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import CreateTripForm from "../../src/components/trips/create-trip-form";
import { uploadCoverImage } from "../../src/utils/cover-upload";
import { LocaleProvider } from "../../src/utils/locale-context";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("../../src/utils/cover-upload", () => ({
  uploadCoverImage: vi.fn(),
}));

describe("CreateTripForm cover image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (!URL.createObjectURL) {
      URL.createObjectURL = () => "blob:preview";
    }
  });

  it("shows validation error for invalid file types", async () => {
    render(
      <LocaleProvider>
        <CreateTripForm />
      </LocaleProvider>
    );
    const input = screen.getByLabelText(/cover image/i);
    const badFile = new File(["bad"], "bad.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [badFile] } });

    expect(
      await screen.findByText("Cover image must be a JPG, PNG, or WebP file."),
    ).toBeInTheDocument();
    expect(uploadCoverImage).not.toHaveBeenCalled();
  });

  it("renders a preview after selecting a valid file", async () => {
    vi.mocked(uploadCoverImage).mockResolvedValue(
      "/uploads/trips/cover-123.jpg",
    );

    render(
      <LocaleProvider>
        <CreateTripForm />
      </LocaleProvider>
    );
    const input = screen.getByLabelText(/cover image/i);
    const file = new File(["img"], "cover.png", { type: "image/png" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadCoverImage).toHaveBeenCalledWith(
        file,
        expect.objectContaining({
          onProgress: expect.any(Function),
          translate: expect.any(Function),
        }),
      );
    });

    expect(await screen.findByAltText(/cover preview/i)).toBeInTheDocument();
  });
});
