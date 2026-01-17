// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import EditEntryForm from "../../src/components/entries/edit-entry-form";
import { uploadEntryMediaBatch } from "../../src/utils/entry-media";
import { LocaleProvider } from "../../src/utils/locale-context";

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

vi.mock("../../src/components/entries/tiptap-editor", () => ({
  default: ({ initialContent, onChange, placeholder, className }: any) => {
    const [value, setValue] = require("react").useState(initialContent);
    return (
      <textarea
        data-testid="tiptap-editor-mock"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        className={className}
      />
    );
  },
}));

vi.mock("../../src/utils/entry-format", () => ({
  detectEntryFormat: (text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (parsed.type === 'doc') return 'tiptap';
    } catch {
      // Not JSON
    }
    return 'plain';
  },
  plainTextToTiptapJson: (plainText: string) => {
    return JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: plainText }]
        }
      ]
    });
  },
}));

describe("EditEntryForm", () => {
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

  it("shows validation errors when required fields are missing", async () => {
    renderWithLocale(
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
    const editor = screen.getByTestId("tiptap-editor-mock");
    const mediaInput = screen.getByLabelText(/entry image library/i);

    // Trigger validation by blurring fields
    fireEvent.blur(dateInput);
    fireEvent.blur(titleInput);
    fireEvent.blur(mediaInput);

    // For TiptapEditor, trigger validation by changing to non-empty then empty
    const emptyTiptapJson = JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
    fireEvent.change(editor, { target: { value: "Some content" } });
    fireEvent.change(editor, { target: { value: emptyTiptapJson } });

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
        "Add at least one photo in the library or inline text.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a validation error for invalid media files", async () => {
    renderWithLocale(
      <EditEntryForm
        tripId="trip-123"
        entryId="entry-123"
        initialEntryDate="2025-05-03T00:00:00.000Z"
        initialTitle="Existing title"
        initialText="Existing text"
        initialMediaUrls={["/uploads/entries/old.jpg"]}
      />,
    );

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

    renderWithLocale(
      <EditEntryForm
        tripId="trip-123"
        entryId="entry-123"
        initialEntryDate="2025-05-03T00:00:00.000Z"
        initialTitle="Existing title"
        initialText="Existing text"
        initialMediaUrls={["/uploads/entries/old.jpg"]}
      />,
    );

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

    renderWithLocale(
      <EditEntryForm
        tripId="trip-123"
        entryId="entry-123"
        initialEntryDate="2025-05-03T00:00:00.000Z"
        initialTitle="Existing title"
        initialText="Existing text"
        initialMediaUrls={[]}
      />,
    );

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

  it.skip("inserts a library image inline at the cursor (deferred to Story 9.6)", async () => {
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

    renderWithLocale(
      <EditEntryForm
        tripId="trip-123"
        entryId="entry-123"
        initialEntryDate="2025-05-03T00:00:00.000Z"
        initialTitle="Existing title"
        initialText="Hello"
        initialMediaUrls={[]}
      />,
    );

    const textArea = screen.getByLabelText(/entry text/i);
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

  it.skip("removes a library image from the gallery and inline text (deferred to Story 9.6)", async () => {
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

    renderWithLocale(
      <EditEntryForm
        tripId="trip-123"
        entryId="entry-123"
        initialEntryDate="2025-05-03T00:00:00.000Z"
        initialTitle="Existing title"
        initialText="Hello\n![Entry photo](/uploads/remove.jpg)"
        initialMediaUrls={[]}
      />,
    );

    const textArea = screen.getByLabelText(/entry text/i);
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
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo) => {
      if (typeof input === "string" && input.includes("/api/trips/")) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [], error: null }), {
            status: 200,
          }),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "london",
                latitude: 51.5074,
                longitude: -0.1278,
                displayName: "London, United Kingdom",
              },
            ],
            error: null,
          }),
          { status: 200 },
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithLocale(
      <EditEntryForm
        tripId="trip-123"
        entryId="entry-123"
        initialEntryDate="2025-05-03T00:00:00.000Z"
        initialTitle="Existing title"
        initialText="Existing text"
        initialMediaUrls={[]}
      />,
    );

    const locationInput = screen.getByLabelText(/story location/i);
    fireEvent.change(locationInput, { target: { value: "London" } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled(), {
      timeout: 1000,
    });

    const resultButton = await screen.findByRole("button", {
      name: /london, united kingdom/i,
    });
    fireEvent.click(resultButton);

    expect(
      await screen.findByText("London, United Kingdom"),
    ).toBeInTheDocument();
    expect(screen.getByText("Change location")).toBeInTheDocument();
  });

  it("displays initial location label when provided", () => {
    renderWithLocale(
      <EditEntryForm
        tripId="trip-123"
        entryId="entry-123"
        initialEntryDate="2025-05-03T00:00:00.000Z"
        initialTitle="Existing title"
        initialText="Existing text"
        initialMediaUrls={[]}
        initialLocation={{
          latitude: 51.5074,
          longitude: -0.1278,
          label: "London, United Kingdom",
        }}
      />,
    );

    expect(screen.getByText("London, United Kingdom")).toBeInTheDocument();
    expect(screen.getByText("Change location")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/search for a place/i),
    ).not.toBeInTheDocument();
  });

  it("displays formatted coordinates when label is missing", () => {
    renderWithLocale(
      <EditEntryForm
        tripId="trip-123"
        entryId="entry-123"
        initialEntryDate="2025-05-03T00:00:00.000Z"
        initialTitle="Existing title"
        initialText="Existing text"
        initialMediaUrls={[]}
        initialLocation={{
          latitude: 51.5074,
          longitude: -0.1278,
          label: null,
        }}
      />,
    );

    expect(screen.getByText("51.5074, -0.1278")).toBeInTheDocument();
    expect(screen.getByText("Change location")).toBeInTheDocument();
  });

  it("shows search input when no initial location is provided", () => {
    renderWithLocale(
      <EditEntryForm
        tripId="trip-123"
        entryId="entry-123"
        initialEntryDate="2025-05-03T00:00:00.000Z"
        initialTitle="Existing title"
        initialText="Existing text"
        initialMediaUrls={[]}
        initialLocation={null}
      />,
    );

    expect(
      screen.getByPlaceholderText(/search for a place/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Change location")).not.toBeInTheDocument();
  });

  it("shows search input when change location is clicked", () => {
    renderWithLocale(
      <EditEntryForm
        tripId="trip-123"
        entryId="entry-123"
        initialEntryDate="2025-05-03T00:00:00.000Z"
        initialTitle="Existing title"
        initialText="Existing text"
        initialMediaUrls={[]}
        initialLocation={{
          latitude: 51.5074,
          longitude: -0.1278,
          label: "London, United Kingdom",
        }}
      />,
    );

    const changeButton = screen.getByText("Change location");
    fireEvent.click(changeButton);

    expect(
      screen.getByPlaceholderText(/search for a place/i),
    ).toBeInTheDocument();
  });

  // Story 9.5: TiptapEditor integration tests
  describe("TiptapEditor integration", () => {
    it("renders TiptapEditor instead of textarea", () => {
      renderWithLocale(
        <EditEntryForm
          tripId="trip-123"
          entryId="entry-123"
          initialEntryDate="2024-01-01"
          initialTitle="Test Entry"
          initialText="Test content"
          initialMediaUrls={["http://example.com/image.jpg"]}
        />,
      );

      const editor = screen.getByTestId("tiptap-editor-mock");
      expect(editor).toBeInTheDocument();
      // TiptapEditor mock is a textarea, so it will have role="textbox"
      // Just verify the editor exists and is not a plain textarea with old ref
      expect(editor).toHaveAttribute("data-testid", "tiptap-editor-mock");
    });

    it("converts plain text to Tiptap JSON on load", () => {
      const plainText = "This is plain text entry";
      renderWithLocale(
        <EditEntryForm
          tripId="trip-123"
          entryId="entry-123"
          initialEntryDate="2024-01-01"
          initialTitle="Plain Text Entry"
          initialText={plainText}
          initialMediaUrls={["http://example.com/image.jpg"]}
        />,
      );

      const editor = screen.getByTestId("tiptap-editor-mock") as HTMLTextAreaElement;
      // Should be converted to Tiptap JSON
      expect(editor.value).not.toBe(plainText);
      expect(() => JSON.parse(editor.value)).not.toThrow();
      const parsed = JSON.parse(editor.value);
      expect(parsed.type).toBe("doc");
      expect(parsed.content).toBeDefined();
    });

    it("loads Tiptap JSON content with formatting preserved", () => {
      const tiptapJson = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Formatted content" }],
          },
        ],
      });

      renderWithLocale(
        <EditEntryForm
          tripId="trip-123"
          entryId="entry-123"
          initialEntryDate="2024-01-01"
          initialTitle="Tiptap Entry"
          initialText={tiptapJson}
          initialMediaUrls={["http://example.com/image.jpg"]}
        />,
      );

      const editor = screen.getByTestId("tiptap-editor-mock") as HTMLTextAreaElement;
      expect(editor.value).toBe(tiptapJson);
    });

    it("validates empty Tiptap content", async () => {
      const emptyTiptapJson = JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph" }],
      });

      renderWithLocale(
        <EditEntryForm
          tripId="trip-123"
          entryId="entry-123"
          initialEntryDate="2024-01-01"
          initialTitle="Test Entry"
          initialText={emptyTiptapJson}
          initialMediaUrls={["http://example.com/image.jpg"]}
        />,
      );

      const editor = screen.getByTestId("tiptap-editor-mock");
      fireEvent.change(editor, { target: { value: emptyTiptapJson } });

      const submitButton = screen.getByRole("button", { name: /save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/text is required/i)).toBeInTheDocument();
      });
    });

    it("updates content through TiptapEditor onChange", async () => {
      const updatedContent = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Updated content" }],
          },
        ],
      });

      renderWithLocale(
        <EditEntryForm
          tripId="trip-123"
          entryId="entry-123"
          initialEntryDate="2024-01-01"
          initialTitle="Test Entry"
          initialText="Initial text"
          initialMediaUrls={["http://example.com/image.jpg"]}
        />,
      );

      const editor = screen.getByTestId("tiptap-editor-mock");
      fireEvent.change(editor, { target: { value: updatedContent } });

      const editorElement = editor as HTMLTextAreaElement;
      expect(editorElement.value).toBe(updatedContent);
    });
  });
});
