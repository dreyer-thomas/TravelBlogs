// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";

import CreateEntryForm from "../../src/components/entries/create-entry-form";
import { uploadEntryMediaBatch } from "../../src/utils/entry-media";
import { extractGpsFromImage } from "../../src/utils/entry-location";
import { insertEntryImage } from "../../src/utils/tiptap-image-helpers";
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

vi.mock("../../src/utils/tiptap-image-helpers", () => ({
  insertEntryImage: vi.fn(),
}));

const MockTiptapEditor = vi.hoisted(() => {
  const Component = ({
    onChange,
    onEditorReady,
    placeholder,
  }: {
    initialContent: string;
    onChange: (content: string) => void;
    onEditorReady?: (editor: unknown) => void;
    placeholder?: string;
  }) => {
    const mockEditor = { commands: {} };
    useEffect(() => {
      onEditorReady?.(mockEditor);
    }, [onEditorReady]);

    return (
      <div data-testid="tiptap-editor">
        <textarea
          data-testid="tiptap-mock-textarea"
          placeholder={placeholder}
          aria-label="Entry text"
          onChange={(e) => {
            const value = e.target.value;
            try {
              const parsed = JSON.parse(value);
              if (parsed?.type === "doc") {
                onChange(value);
                return;
              }
            } catch {
              // Not JSON
            }
            if (value.trim()) {
              onChange(
                JSON.stringify({
                  type: "doc",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: value }],
                    },
                  ],
                }),
              );
            } else {
              onChange(JSON.stringify({ type: "doc", content: [] }));
            }
          }}
        />
      </div>
    );
  };
  return Component;
});

// Mock TiptapEditor to avoid complex Tiptap setup in tests
vi.mock("../../src/components/entries/tiptap-editor", () => ({
  default: MockTiptapEditor,
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

  it("renders TiptapEditor instead of textarea", async () => {
    renderWithLocale(<CreateEntryForm tripId="trip-123" />);

    // TiptapEditor should be rendered
    expect(screen.getByTestId("tiptap-editor")).toBeInTheDocument();
    expect(screen.getByText("Entry text")).toBeInTheDocument();
  });

  it("shows validation errors when submitting without required fields", async () => {
    renderWithLocale(<CreateEntryForm tripId="trip-123" />);

    const submitButton = screen.getByRole("button", { name: /add entry/i });
    expect(submitButton).toBeDisabled();

    const titleInput = screen.getByLabelText(/entry title/i);
    const mediaInput = screen.getByLabelText(/entry image library/i);

    fireEvent.blur(titleInput);
    fireEvent.blur(mediaInput);

    expect(
      await screen.findByText("Entry title is required."),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Add at least one photo in the library or inline text.",
      ),
    ).toBeInTheDocument();
  });

  it("validates empty TiptapEditor content and shows error on change", async () => {
    renderWithLocale(<CreateEntryForm tripId="trip-123" />);

    const mockTextarea = screen.getByTestId("tiptap-mock-textarea");

    // Type some content first, then clear it to trigger validation
    fireEvent.change(mockTextarea, { target: { value: "Some text" } });
    fireEvent.change(mockTextarea, { target: { value: "" } });

    // Validation error should appear (updateText validates on change)
    expect(
      await screen.findByText("Entry text is required."),
    ).toBeInTheDocument();

    // The submit button should remain disabled with empty content
    const submitButton = screen.getByRole("button", { name: /add entry/i });
    expect(submitButton).toBeDisabled();
  });

  it("allows content input through TiptapEditor and clears error", async () => {
    renderWithLocale(<CreateEntryForm tripId="trip-123" />);

    const mockTextarea = screen.getByTestId("tiptap-mock-textarea");

    // Type some content first, then clear to trigger error
    fireEvent.change(mockTextarea, { target: { value: "Some text" } });
    fireEvent.change(mockTextarea, { target: { value: "" } });
    expect(
      await screen.findByText("Entry text is required."),
    ).toBeInTheDocument();

    // Type some content - error should clear
    fireEvent.change(mockTextarea, { target: { value: "My travel story" } });

    // Error should be gone
    await waitFor(() => {
      expect(screen.queryByText("Entry text is required.")).not.toBeInTheDocument();
    });

    // Editor should contain the text
    expect(mockTextarea).toHaveValue("My travel story");
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
        "Failed: Media files must be a JPG, PNG, WebP, HEIC, HEIF, MP4, WebM, or MOV file.",
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
          mediaType: "image",
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

  it("renders video previews and disables inline image actions", async () => {
    const uploadEntryMediaBatchMock = vi.mocked(uploadEntryMediaBatch);
    uploadEntryMediaBatchMock.mockImplementation(async (files, options) => ({
      uploads: [
        {
          fileId: options?.getFileId?.(files[0]) ?? files[0].name,
          fileName: files[0].name,
          url: "/uploads/clip.mp4",
          mediaType: "video",
        },
      ],
      failures: [],
    }));

    const { container } = renderWithLocale(
      <CreateEntryForm tripId="trip-123" />,
    );

    const input = screen.getByLabelText(/entry image library/i);
    const file = new File(["video"], "clip.mp4", { type: "video/mp4" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(container.querySelector("video")).toBeInTheDocument(),
    );

    const insertButton = await screen.findByRole("button", {
      name: /insert inline/i,
    });
    const locationButton = await screen.findByRole("button", {
      name: /use photo location/i,
    });
    const setButton = await screen.findByRole("button", {
      name: /set as story image/i,
    });

    expect(insertButton).toBeDisabled();
    expect(locationButton).toBeDisabled();
    expect(setButton).toBeEnabled();
  });

  it("allows selecting a story image from the library", async () => {
    const uploadEntryMediaBatchMock = vi.mocked(uploadEntryMediaBatch);
    uploadEntryMediaBatchMock.mockImplementation(async (files, options) => ({
      uploads: [
        {
          fileId: options?.getFileId?.(files[0]) ?? files[0].name,
          fileName: files[0].name,
          url: "/uploads/story.jpg",
          mediaType: "image",
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

  // Note: Inline image insertion test removed - deferred to Story 9.6
  // The inline image insertion button has been removed from the UI
  // and will be re-added when custom Tiptap image nodes are implemented

  it("removes a library image from the gallery", async () => {
    const uploadEntryMediaBatchMock = vi.mocked(uploadEntryMediaBatch);
    uploadEntryMediaBatchMock.mockImplementation(async (files, options) => ({
      uploads: [
        {
          fileId: options?.getFileId?.(files[0]) ?? files[0].name,
          fileName: files[0].name,
          url: "/uploads/remove.jpg",
          mediaType: "image",
        },
      ],
      failures: [],
    }));

    renderWithLocale(<CreateEntryForm tripId="trip-123" />);

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
    });
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
          mediaType: "image",
        },
      ],
      failures: [],
    }));

    const extractGpsFromImageMock = vi.mocked(extractGpsFromImage);
    extractGpsFromImageMock.mockResolvedValue({
      latitude: 51.5055,
      longitude: -0.0754,
    });

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo) => {
      if (typeof input === "string" && input.includes("/api/trips/")) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [], error: null }), {
            status: 200,
          }),
        );
      }
      return Promise.resolve(
        new Response(new Blob(["photo"], { type: "image/jpeg" }), {
          status: 200,
        }),
      );
    });
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

  it("inserts inline images using entryImage nodes", async () => {
    const uploadEntryMediaBatchMock = vi.mocked(uploadEntryMediaBatch);
    uploadEntryMediaBatchMock.mockImplementation(async (files, options) => ({
      uploads: [
        {
          fileId: options?.getFileId?.(files[0]) ?? files[0].name,
          fileName: files[0].name,
          url: "/uploads/inline.jpg",
          mediaType: "image",
        },
      ],
      failures: [],
    }));

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo) => {
      if (typeof input === "string" && input.includes("/api/trips/")) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [], error: null }), {
            status: 200,
          }),
        );
      }
      return Promise.resolve(
        new Response(new Blob(["photo"], { type: "image/jpeg" }), {
          status: 200,
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithLocale(<CreateEntryForm tripId="trip-123" />);

    const input = screen.getByLabelText(/entry image library/i);
    const file = new File(["photo"], "inline.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });

    const insertButton = await screen.findByRole("button", {
      name: /insert inline/i,
    });
    fireEvent.click(insertButton);

    expect(insertEntryImage).toHaveBeenCalledWith(
      expect.anything(),
      "/uploads/inline.jpg",
      "/uploads/inline.jpg",
      expect.any(String),
    );
  });

  it("submits entry with Tiptap JSON content", async () => {
    const uploadEntryMediaBatchMock = vi.mocked(uploadEntryMediaBatch);
    uploadEntryMediaBatchMock.mockImplementation(async (files, options) => ({
      uploads: [
        {
          fileId: options?.getFileId?.(files[0]) ?? files[0].name,
          fileName: files[0].name,
          url: "/uploads/photo.jpg",
          mediaType: "image",
        },
      ],
      failures: [],
    }));

    const onEntryCreated = vi.fn();
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo, init?: RequestInit) => {
      if (typeof input === "string" && input.includes("/api/trips/")) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [], error: null }), {
            status: 200,
          }),
        );
      }
      if (typeof input === "string" && input === "/api/entries" && init?.method === "POST") {
        const body = JSON.parse(init.body as string);
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "entry-1",
                tripId: body.tripId,
                title: body.title,
                text: body.text,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                media: [],
              },
              error: null,
            }),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ data: null }), { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithLocale(<CreateEntryForm tripId="trip-123" onEntryCreated={onEntryCreated} />);

    // Fill in required fields
    const titleInput = screen.getByLabelText(/entry title/i);
    fireEvent.change(titleInput, { target: { value: "My Test Entry" } });

    const mockTextarea = screen.getByTestId("tiptap-mock-textarea");
    fireEvent.change(mockTextarea, { target: { value: "This is my travel story content" } });

    // Upload an image
    const mediaInput = screen.getByLabelText(/entry image library/i);
    const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(mediaInput, { target: { files: [file] } });

    // Wait for upload to complete and button to enable
    const submitButton = screen.getByRole("button", { name: /add entry/i });
    await waitFor(() => expect(submitButton).toBeEnabled(), { timeout: 3000 });

    // Click submit
    fireEvent.click(submitButton);

    // Verify the API was called
    await waitFor(() => {
      const postCalls = fetchMock.mock.calls.filter(
        (call: [RequestInfo, RequestInit?]) =>
          call[0] === "/api/entries" && call[1]?.method === "POST"
      );
      expect(postCalls.length).toBeGreaterThan(0);

      // Verify the text is Tiptap JSON format
      const body = JSON.parse(postCalls[0][1]?.body as string);
      expect(body.text).toContain('"type":"doc"');
      expect(body.text).toContain('"type":"paragraph"');
    });

    // Verify callback was called
    await waitFor(() => {
      expect(onEntryCreated).toHaveBeenCalled();
    });
  });

  it("submits entry with rich formatting marks preserved", async () => {
    const uploadEntryMediaBatchMock = vi.mocked(uploadEntryMediaBatch);
    uploadEntryMediaBatchMock.mockImplementation(async (files, options) => ({
      uploads: [
        {
          fileId: options?.getFileId?.(files[0]) ?? files[0].name,
          fileName: files[0].name,
          url: "/uploads/entries/rich.jpg",
          mediaType: "image",
        },
      ],
      failures: [],
    }));

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo, init?: RequestInit) => {
      if (typeof input === "string" && input.includes("/api/trips/")) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [], error: null }), { status: 200 }),
        );
      }
      if (typeof input === "string" && input === "/api/entries" && init?.method === "POST") {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { id: "entry-rich" }, error: null }), {
            status: 200,
          }),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ data: null }), { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithLocale(<CreateEntryForm tripId="trip-123" />);

    const titleInput = screen.getByLabelText(/entry title/i);
    fireEvent.change(titleInput, { target: { value: "Rich entry" } });

    const editor = screen.getByTestId("tiptap-mock-textarea");
    const tiptapJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Bold", marks: [{ type: "bold" }] },
            { type: "text", text: " link " },
            { type: "text", text: "here", marks: [{ type: "link", attrs: { href: "https://example.com" } }] },
          ],
        },
      ],
    });
    fireEvent.change(editor, { target: { value: tiptapJson } });

    const mediaInput = screen.getByLabelText(/entry image library/i);
    const file = new File(["photo"], "rich.jpg", { type: "image/jpeg" });
    fireEvent.change(mediaInput, { target: { files: [file] } });

    const submitButton = screen.getByRole("button", { name: /add entry/i });
    await waitFor(() => expect(submitButton).toBeEnabled(), { timeout: 3000 });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const postCalls = fetchMock.mock.calls.filter(
        (call: [RequestInfo, RequestInit?]) =>
          call[0] === "/api/entries" && call[1]?.method === "POST",
      );
      expect(postCalls.length).toBeGreaterThan(0);
      const body = JSON.parse(postCalls[0][1]?.body as string);

      // Parse and validate JSON structure, not just string content
      const parsedText = JSON.parse(body.text);
      expect(parsedText.type).toBe("doc");
      expect(parsedText.content).toHaveLength(1);

      const paragraph = parsedText.content[0] as {
        type?: string;
        content?: Array<{ text?: string; marks?: unknown[] }>;
      };
      expect(paragraph.type).toBe("paragraph");
      expect(paragraph.content).toHaveLength(3);

      // Verify bold mark
      const boldText = paragraph.content?.find(
        (node) => node.text === "Bold",
      );
      expect(boldText).toBeDefined();
      expect(boldText.marks).toEqual([{ type: "bold" }]);

      // Verify link mark with href attribute
      const linkText = paragraph.content?.find(
        (node) => node.text === "here",
      );
      expect(linkText).toBeDefined();
      expect(linkText.marks).toEqual([{ type: "link", attrs: { href: "https://example.com" } }]);
    });
  });

  it("submits entry with entryImage nodes in Tiptap JSON", async () => {
    const uploadEntryMediaBatchMock = vi.mocked(uploadEntryMediaBatch);
    uploadEntryMediaBatchMock.mockImplementation(async (files, options) => ({
      uploads: [
        {
          fileId: options?.getFileId?.(files[0]) ?? files[0].name,
          fileName: files[0].name,
          url: "/uploads/photo.jpg",
          mediaType: "image",
        },
      ],
      failures: [],
    }));

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
          input === "/api/entries" &&
          init?.method === "POST"
        ) {
          const body = JSON.parse(init.body as string);
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: {
                  id: "entry-1",
                  tripId: body.tripId,
                  title: body.title,
                  text: body.text,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  media: [],
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

    renderWithLocale(<CreateEntryForm tripId="trip-123" />);

    const titleInput = screen.getByLabelText(/entry title/i);
    fireEvent.change(titleInput, { target: { value: "Inline entry" } });

    const mediaInput = screen.getByLabelText(/entry image library/i);
    const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(mediaInput, { target: { files: [file] } });

    const editor = screen.getByTestId("tiptap-mock-textarea");
    const tiptapJsonWithImage = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "entryImage",
          attrs: {
            entryMediaId: "/uploads/photo.jpg",
            src: "/uploads/photo.jpg",
            alt: "Entry photo",
          },
        },
      ],
    });
    fireEvent.change(editor, { target: { value: tiptapJsonWithImage } });

    const submitButton = screen.getByRole("button", { name: /add entry/i });
    await waitFor(() => expect(submitButton).toBeEnabled(), { timeout: 3000 });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const postCalls = fetchMock.mock.calls.filter(
        (call: [RequestInfo, RequestInit?]) =>
          call[0] === "/api/entries" && call[1]?.method === "POST",
      );
      expect(postCalls.length).toBeGreaterThan(0);
      const body = JSON.parse(postCalls[0][1]?.body as string);
      expect(body.text).toContain("\"entryImage\"");
      expect(body.text).toContain("\"entryMediaId\"");

      // AC 3 validation: Verify the JSON structure contains entryImage nodes with entryMediaId
      const parsedText = JSON.parse(body.text);
      expect(parsedText.type).toBe("doc");
      const entryImageNode = (parsedText.content as Array<{ type?: string; attrs?: Record<string, unknown> }>).find(
        (node) => node.type === "entryImage",
      );
      expect(entryImageNode).toBeDefined();
      expect(entryImageNode?.attrs?.entryMediaId).toBeDefined();
      expect(entryImageNode?.attrs?.src).toBe("/uploads/photo.jpg");
      // In create flow, entryMediaId starts as URL placeholder until post-save patch
      expect(entryImageNode?.attrs?.entryMediaId).toBe("/uploads/photo.jpg");
    });
  });
});
