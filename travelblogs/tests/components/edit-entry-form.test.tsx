// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import EditEntryForm from "../../src/components/entries/edit-entry-form";
import { uploadEntryMediaBatch } from "../../src/utils/entry-media";
import { detectEntryFormat, plainTextToTiptapJson } from "../../src/utils/entry-format";
import { insertEntryImage } from "../../src/utils/tiptap-image-helpers";
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
  default: ({
    initialContent,
    onChange,
    onEditorReady,
    placeholder,
    className,
  }: any) => {
    const [value, setValue] = require("react").useState(initialContent);
    const { useEffect } = require("react");
    const mockEditor = { commands: {} };
    useEffect(() => {
      onEditorReady?.(mockEditor);
    }, [onEditorReady]);
    return (
      <textarea
        data-testid="tiptap-editor-mock"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          const nextValue = e.target.value;
          try {
            const parsed = JSON.parse(nextValue);
            if (parsed?.type === "doc") {
              onChange(nextValue);
              return;
            }
          } catch {
            // Not JSON
          }
          onChange(nextValue);
        }}
        placeholder={placeholder}
        className={className}
      />
    );
  },
}));

vi.mock("../../src/utils/tiptap-image-helpers", () => ({
  insertEntryImage: vi.fn(),
}));

vi.mock("../../src/utils/entry-format", () => ({
  detectEntryFormat: vi.fn((text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (parsed.type === 'doc') return 'tiptap';
    } catch {
      // Not JSON
    }
    return 'plain';
  }),
  plainTextToTiptapJson: vi.fn((plainText: string) => {
    return JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: plainText }]
        }
      ]
    });
  }),
}));

describe("EditEntryForm", () => {
  const renderWithLocale = (component: JSX.Element) =>
    render(<LocaleProvider>{component}</LocaleProvider>);

  beforeEach(() => {
    vi.resetAllMocks();
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

  it("converts plain text to Tiptap JSON for editing (AC2)", () => {
    const detectSpy = vi.mocked(detectEntryFormat);
    const conversionSpy = vi.mocked(plainTextToTiptapJson);
    detectSpy.mockReturnValue("plain");
    conversionSpy.mockReturnValue(
      JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Converted for edit" }],
          },
        ],
      }),
    );

    renderWithLocale(
      <EditEntryForm
        tripId="trip-123"
        entryId="entry-123"
        initialEntryDate="2025-05-03T00:00:00.000Z"
        initialTitle="Existing title"
        initialText="Plain text body"
        initialMediaUrls={["/uploads/entries/old.jpg"]}
      />,
    );

    const editor = screen.getByTestId("tiptap-editor-mock");
    expect(detectSpy).toHaveBeenCalledWith("Plain text body");
    expect(conversionSpy).toHaveBeenCalledTimes(1);
    expect(editor).toHaveValue(
      JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Converted for edit" }],
          },
        ],
      }),
    );
  });

  it("keeps stored Tiptap JSON without reconversion (AC3)", () => {
    const detectSpy = vi.mocked(detectEntryFormat);
    const conversionSpy = vi.mocked(plainTextToTiptapJson);
    const tiptapJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Stored JSON" }],
        },
      ],
    });

    detectSpy.mockReturnValue("tiptap");

    renderWithLocale(
      <EditEntryForm
        tripId="trip-123"
        entryId="entry-123"
        initialEntryDate="2025-05-03T00:00:00.000Z"
        initialTitle="Existing title"
        initialText={tiptapJson}
        initialMediaUrls={["/uploads/entries/old.jpg"]}
      />,
    );

    const editor = screen.getByTestId("tiptap-editor-mock");
    expect(detectSpy).toHaveBeenCalledWith(tiptapJson);
    expect(conversionSpy).not.toHaveBeenCalled();
    expect(editor).toHaveValue(tiptapJson);
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

  it("inserts a library image inline as an entryImage node", async () => {
    renderWithLocale(
      <EditEntryForm
        tripId="trip-123"
        entryId="entry-123"
        initialEntryDate="2025-05-03T00:00:00.000Z"
        initialTitle="Existing title"
        initialText="Hello"
        initialMediaUrls={["/uploads/inline.jpg"]}
        initialMedia={[{ id: "media-1", url: "/uploads/inline.jpg" }]}
      />,
    );

    const insertButton = await screen.findByRole("button", {
      name: /insert inline/i,
    });
    fireEvent.click(insertButton);

    expect(insertEntryImage).toHaveBeenCalledWith(
      expect.anything(),
      "media-1",
      "/uploads/inline.jpg",
      expect.any(String),
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

    it("submits entry with entryImage nodes containing real entryMediaId (AC 3)", async () => {
      const fetchMock = vi.fn().mockImplementation(
        (input: RequestInfo, init?: RequestInit) => {
          if (typeof input === "string" && input.includes("/api/trips/")) {
            return Promise.resolve(
              new Response(JSON.stringify({ data: [], error: null }), {
                status: 200,
              }),
            );
          }
          if (
            typeof input === "string" &&
            input.includes("/api/entries/entry-123") &&
            init?.method === "PATCH"
          ) {
            const body = JSON.parse(init.body as string);
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  data: {
                    id: "entry-123",
                    tripId: body.tripId || "trip-123",
                    title: body.title,
                    text: body.text,
                    media: [
                      { id: "media-1", url: "/uploads/photo.jpg" },
                    ],
                  },
                  error: null,
                }),
                { status: 200 },
              ),
            );
          }
          return Promise.resolve(
            new Response(JSON.stringify({ data: null }), { status: 404 }),
          );
        },
      );
      vi.stubGlobal("fetch", fetchMock);

      renderWithLocale(
        <EditEntryForm
          tripId="trip-123"
          entryId="entry-123"
          initialEntryDate="2025-05-03T00:00:00.000Z"
          initialTitle="Test Entry"
          initialText="Initial text"
          initialMediaUrls={["/uploads/photo.jpg"]}
          initialMedia={[
            { id: "media-1", url: "/uploads/photo.jpg" },
          ]}
        />,
      );

      // Simulate editor content with entryImage node
      const editor = screen.getByTestId("tiptap-editor-mock");
      const tiptapJsonWithImage = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "entryImage",
            attrs: {
              entryMediaId: "media-1",
              src: "/uploads/photo.jpg",
              alt: "Entry photo",
            },
          },
        ],
      });
      fireEvent.change(editor, { target: { value: tiptapJsonWithImage } });

      const submitButton = screen.getByRole("button", { name: /save entry/i });
      await waitFor(() => expect(submitButton).toBeEnabled());
      fireEvent.click(submitButton);

      await waitFor(() => {
        const patchCalls = fetchMock.mock.calls.filter(
          (call: [RequestInfo, RequestInit?]) =>
            typeof call[0] === "string" &&
            call[0].includes("/api/entries/entry-123") &&
            call[1]?.method === "PATCH",
        );
        expect(patchCalls.length).toBeGreaterThan(0);

        // AC 3 validation: Verify JSON contains entryImage with real entryMediaId (not URL)
        const body = JSON.parse(patchCalls[0][1]?.body as string);
        const parsedText = JSON.parse(body.text);
        expect(parsedText.type).toBe("doc");
        const entryImageNode = parsedText.content.find(
          (node: any) => node.type === "entryImage",
        );
        expect(entryImageNode).toBeDefined();
        expect(entryImageNode.attrs.entryMediaId).toBe("media-1");
        expect(entryImageNode.attrs.src).toBe("/uploads/photo.jpg");
      });
    });
  });

  it("converts plain text on edit and submits JSON payload (AC2, AC3)", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo, init?: RequestInit) => {
      if (typeof input === "string" && input.includes("/api/trips/")) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [], error: null }), { status: 200 }),
        );
      }
      if (
        typeof input === "string" &&
        input.includes("/api/entries/entry-plain") &&
        init?.method === "PATCH"
      ) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: { id: "entry-plain", media: [{ id: "media-1", url: "/uploads/photo.jpg" }] },
              error: null,
            }),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ data: null }), { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const { detectEntryFormat, plainTextToTiptapJson } = await import("../../src/utils/entry-format");

    renderWithLocale(
      <EditEntryForm
        tripId="trip-plain"
        entryId="entry-plain"
        initialEntryDate="2025-05-03T00:00:00.000Z"
        initialTitle="Plain entry"
        initialText="Plain text body"
        initialMediaUrls={["/uploads/photo.jpg"]}
        initialMedia={[{ id: "media-1", url: "/uploads/photo.jpg" }]}
      />,
    );

    await waitFor(() => {
      expect(vi.mocked(detectEntryFormat)).toHaveBeenCalledWith("Plain text body");
    });
    expect(vi.mocked(plainTextToTiptapJson)).toHaveBeenCalledTimes(1);
    const [plainArg, mediaArg] = vi.mocked(plainTextToTiptapJson).mock.calls[0] ?? [];
    expect(plainArg).toBe("Plain text body");
    expect(mediaArg instanceof Map).toBe(true);
    expect(mediaArg?.get("/uploads/photo.jpg")).toBe("media-1");

    const submitButton = screen.getByRole("button", { name: /save entry/i });
    await waitFor(() => expect(submitButton).toBeEnabled());
    fireEvent.click(submitButton);

    await waitFor(() => {
      const patchCalls = fetchMock.mock.calls.filter(
        (call: [RequestInfo, RequestInit?]) =>
          typeof call[0] === "string" &&
          call[0].includes("/api/entries/entry-plain") &&
          call[1]?.method === "PATCH",
      );
      expect(patchCalls.length).toBeGreaterThan(0);
      const body = JSON.parse(patchCalls[0][1]?.body as string);
      expect(() => JSON.parse(body.text)).not.toThrow();
      expect(body.text).not.toBe("Plain text body");
    });
  });

  it("skips conversion when entry text is already Tiptap JSON (AC4)", async () => {
    const tiptapJson = JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Stored JSON" }] }],
    });
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo, init?: RequestInit) => {
      if (typeof input === "string" && input.includes("/api/trips/")) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [], error: null }), { status: 200 }),
        );
      }
      if (
        typeof input === "string" &&
        input.includes("/api/entries/entry-json") &&
        init?.method === "PATCH"
      ) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { id: "entry-json", media: [] }, error: null }), {
            status: 200,
          }),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ data: null }), { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const { detectEntryFormat, plainTextToTiptapJson } = await import("../../src/utils/entry-format");

    renderWithLocale(
      <EditEntryForm
        tripId="trip-json"
        entryId="entry-json"
        initialEntryDate="2025-05-03T00:00:00.000Z"
        initialTitle="JSON entry"
        initialText={tiptapJson}
        initialMediaUrls={["/uploads/photo.jpg"]}
      />,
    );

    await waitFor(() => {
      expect(vi.mocked(detectEntryFormat)).toHaveBeenCalledWith(tiptapJson);
    });
    expect(vi.mocked(plainTextToTiptapJson)).not.toHaveBeenCalled();

    const submitButton = screen.getByRole("button", { name: /save entry/i });
    await waitFor(() => expect(submitButton).toBeEnabled());
    fireEvent.click(submitButton);

    await waitFor(() => {
      const patchCalls = fetchMock.mock.calls.filter(
        (call: [RequestInfo, RequestInit?]) =>
          typeof call[0] === "string" &&
          call[0].includes("/api/entries/entry-json") &&
          call[1]?.method === "PATCH",
      );
      expect(patchCalls.length).toBeGreaterThan(0);
      const body = JSON.parse(patchCalls[0][1]?.body as string);
      expect(body.text).toBe(tiptapJson);
    });
  });
});
