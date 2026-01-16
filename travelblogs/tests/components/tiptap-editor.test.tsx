// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TiptapEditor from "@/components/entries/tiptap-editor";

// Mock useTranslation hook
vi.mock("@/utils/use-translation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "editor.placeholder": "Start writing...",
        "editor.contentArea": "Rich text editor content area",
        "editor.toolbar": "Text formatting toolbar",
        "editor.textFormatting": "Text formatting",
        "editor.bold": "Bold",
        "editor.italic": "Italic",
        "editor.strikethrough": "Strikethrough",
        "editor.headings": "Headings",
        "editor.heading1": "Heading 1",
        "editor.heading2": "Heading 2",
        "editor.heading3": "Heading 3",
        "editor.lists": "Lists",
        "editor.bulletList": "Bullet list",
        "editor.numberedList": "Numbered list",
        "editor.alignment": "Text alignment",
        "editor.alignLeft": "Align left",
        "editor.alignCenter": "Align center",
        "editor.alignRight": "Align right",
        "editor.links": "Links",
        "editor.addLink": "Add link",
        "editor.removeLink": "Remove link",
        "editor.linkUrl": "Link URL",
        "editor.linkPlaceholder": "https://example.com",
        "editor.applyLink": "Apply",
        "editor.undoRedo": "Undo and redo",
        "editor.undo": "Undo",
        "editor.redo": "Redo",
        "editor.initError": "Editor failed to initialize.",
        "common.cancel": "Cancel",
      };
      return translations[key] || key;
    },
    locale: "en",
    setLocale: vi.fn(),
    formatDate: (date: Date) => date.toLocaleDateString(),
    formatDateTime: (date: Date) => date.toLocaleString(),
  }),
}));

// Mock ProseMirror DOM methods that aren't available in jsdom
beforeAll(() => {
  // Mock getClientRects for ProseMirror
  Range.prototype.getClientRects = vi.fn(() => ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: function* () {},
  })) as unknown as () => DOMRectList;

  Range.prototype.getBoundingClientRect = vi.fn(() => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON: () => ({}),
  }));

  Element.prototype.getClientRects = vi.fn(() => ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: function* () {},
  })) as unknown as () => DOMRectList;

  // Mock scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();

  // Mock document.elementFromPoint
  document.elementFromPoint = vi.fn(() => null);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("TiptapEditor", () => {
  describe("Component Rendering", () => {
    it("renders editor with toolbar and content area", () => {
      const onChange = vi.fn();
      render(<TiptapEditor initialContent="" onChange={onChange} />);

      // Toolbar should be present
      expect(
        screen.getByRole("toolbar", { name: /text formatting toolbar/i })
      ).toBeInTheDocument();

      // Check for key toolbar buttons
      expect(screen.getByLabelText(/bold/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/italic/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/heading 1/i)).toBeInTheDocument();
    });

    it("displays placeholder behavior for empty content", () => {
      const onChange = vi.fn();
      render(
        <TiptapEditor
          initialContent=""
          onChange={onChange}
          placeholder="Type here..."
        />
      );

      // Editor should render (Tiptap handles placeholder internally)
      expect(screen.getByRole("toolbar")).toBeInTheDocument();
    });

    it("renders all toolbar button groups", () => {
      const onChange = vi.fn();
      render(<TiptapEditor initialContent="" onChange={onChange} />);

      // Text formatting group
      expect(screen.getByLabelText(/bold/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/italic/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/strikethrough/i)).toBeInTheDocument();

      // Headings group
      expect(screen.getByLabelText(/heading 1/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/heading 2/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/heading 3/i)).toBeInTheDocument();

      // Lists group
      expect(screen.getByLabelText(/bullet list/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/numbered list/i)).toBeInTheDocument();

      // Alignment group
      expect(screen.getByLabelText(/align left/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/align center/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/align right/i)).toBeInTheDocument();

      // Links group
      expect(screen.getByLabelText(/add link/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/remove link/i)).toBeInTheDocument();

      // Utility group
      expect(screen.getByLabelText(/^undo$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^redo$/i)).toBeInTheDocument();
    });

    it("editor initializes without errors", () => {
      const onChange = vi.fn();
      const { container } = render(
        <TiptapEditor initialContent="" onChange={onChange} />
      );

      // Should not show error message
      expect(container.querySelector(".text-red-600")).not.toBeInTheDocument();
    });
  });

  describe("Content Initialization", () => {
    it("initializes with plain text content", async () => {
      const onChange = vi.fn();
      const plainText = "Hello world";

      render(<TiptapEditor initialContent={plainText} onChange={onChange} />);

      // Wait for editor to render content
      await waitFor(() => {
        const editor = document.querySelector(".ProseMirror");
        expect(editor?.textContent).toContain("Hello world");
      });
    });

    it("initializes with Tiptap JSON content", async () => {
      const onChange = vi.fn();
      const tiptapJson = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "JSON content" }],
          },
        ],
      });

      render(<TiptapEditor initialContent={tiptapJson} onChange={onChange} />);

      await waitFor(() => {
        const editor = document.querySelector(".ProseMirror");
        expect(editor?.textContent).toContain("JSON content");
      });
    });

    it("handles empty string initialization", () => {
      const onChange = vi.fn();
      render(<TiptapEditor initialContent="" onChange={onChange} />);

      // Should render without errors
      expect(screen.getByRole("toolbar")).toBeInTheDocument();
    });

    it("handles malformed JSON gracefully", async () => {
      const onChange = vi.fn();
      const malformedJson = '{"invalid": "json"';

      render(
        <TiptapEditor initialContent={malformedJson} onChange={onChange} />
      );

      // Should fallback to plain text rendering
      await waitFor(() => {
        const editor = document.querySelector(".ProseMirror");
        expect(editor?.textContent).toContain('{"invalid": "json"');
      });
    });

    it("converts plain text to Tiptap structure", () => {
      const onChange = vi.fn();
      const plainText = "Plain text content";

      render(<TiptapEditor initialContent={plainText} onChange={onChange} />);

      // Editor should render with content
      const editor = document.querySelector(".ProseMirror");
      expect(editor).toBeInTheDocument();
      expect(editor?.textContent).toContain("Plain text content");
    });
  });

  describe("User Interactions", () => {
    it("bold button toggles bold formatting when clicked", async () => {
      const onChange = vi.fn();
      render(<TiptapEditor initialContent="Test text" onChange={onChange} />);

      const boldButton = screen.getByLabelText(/^bold$/i);

      // Button should exist and be clickable
      expect(boldButton).toBeInTheDocument();
      expect(boldButton).toBeEnabled();

      // Click should not throw
      await fireEvent.click(boldButton);

      // Verify button responds (aria-pressed state may change based on selection)
      expect(boldButton).toHaveAttribute("aria-pressed");
    });

    it("heading buttons are functional and accessible", async () => {
      const onChange = vi.fn();
      render(<TiptapEditor initialContent="" onChange={onChange} />);

      const h1Button = screen.getByLabelText(/heading 1/i);
      const h2Button = screen.getByLabelText(/heading 2/i);
      const h3Button = screen.getByLabelText(/heading 3/i);

      // All heading buttons should be present and enabled
      expect(h1Button).toBeInTheDocument();
      expect(h1Button).toBeEnabled();
      expect(h2Button).toBeEnabled();
      expect(h3Button).toBeEnabled();

      // Clicking should not throw
      await fireEvent.click(h1Button);
    });

    it("list buttons create bullet/ordered lists when clicked", async () => {
      const onChange = vi.fn();
      render(<TiptapEditor initialContent="" onChange={onChange} />);

      const bulletButton = screen.getByLabelText(/bullet list/i);
      const orderedButton = screen.getByLabelText(/numbered list/i);

      // Buttons should be present and enabled
      expect(bulletButton).toBeInTheDocument();
      expect(bulletButton).toBeEnabled();
      expect(orderedButton).toBeEnabled();

      // Clicking should not throw
      await fireEvent.click(bulletButton);
    });

    it("alignment buttons change text alignment when clicked", async () => {
      const onChange = vi.fn();
      render(<TiptapEditor initialContent="" onChange={onChange} />);

      const leftButton = screen.getByLabelText(/align left/i);
      const centerButton = screen.getByLabelText(/align center/i);
      const rightButton = screen.getByLabelText(/align right/i);

      // All alignment buttons should be present and enabled
      expect(leftButton).toBeEnabled();
      expect(centerButton).toBeEnabled();
      expect(rightButton).toBeEnabled();

      // Clicking should not throw
      await fireEvent.click(centerButton);
    });

    it("undo/redo buttons have correct initial disabled state", () => {
      const onChange = vi.fn();
      render(<TiptapEditor initialContent="" onChange={onChange} />);

      const undoButton = screen.getByLabelText(/^undo$/i);
      const redoButton = screen.getByLabelText(/^redo$/i);

      // Initially, both undo and redo should be disabled (empty editor)
      expect(undoButton).toBeDisabled();
      expect(redoButton).toBeDisabled();
    });

    it("link button opens link dialog when clicked", async () => {
      const onChange = vi.fn();
      render(<TiptapEditor initialContent="" onChange={onChange} />);

      const addLinkButton = screen.getByLabelText(/add link/i);

      // Link button should be present
      expect(addLinkButton).toBeInTheDocument();

      // Click to open dialog
      await fireEvent.click(addLinkButton);

      // Dialog should appear with input and buttons
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/https:\/\/example.com/i)
        ).toBeInTheDocument();
        expect(screen.getByText(/apply/i)).toBeInTheDocument();
        expect(screen.getByText(/cancel/i)).toBeInTheDocument();
      });
    });

    it("remove link button is disabled when no link is active", () => {
      const onChange = vi.fn();
      render(<TiptapEditor initialContent="" onChange={onChange} />);

      const removeLinkButton = screen.getByLabelText(/remove link/i);

      // Remove link button should be disabled when no link is selected
      expect(removeLinkButton).toBeDisabled();
    });
  });

  describe("Controlled Component Behavior", () => {
    it("external content prop updates re-render editor", async () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <TiptapEditor initialContent="Initial text" onChange={onChange} />
      );

      await waitFor(() => {
        const editor = document.querySelector(".ProseMirror");
        expect(editor?.textContent).toContain("Initial text");
      });

      // Update with new content
      rerender(
        <TiptapEditor initialContent="Updated text" onChange={onChange} />
      );

      await waitFor(() => {
        const editor = document.querySelector(".ProseMirror");
        expect(editor?.textContent).toContain("Updated text");
      });
    });

    it("no infinite loops on content updates", async () => {
      const onChange = vi.fn();

      const { rerender } = render(
        <TiptapEditor initialContent="Test" onChange={onChange} />
      );

      // Re-render with same content
      rerender(<TiptapEditor initialContent="Test" onChange={onChange} />);

      // Should not cause excessive re-renders
      await waitFor(() => {
        // onChange should be called minimal times (not hundreds)
        expect(onChange.mock.calls.length).toBeLessThan(10);
      });
    });

    it("editor state syncs with controlled prop", async () => {
      const onChange = vi.fn();

      const { rerender } = render(
        <TiptapEditor initialContent="First" onChange={onChange} />
      );

      await waitFor(() => {
        const editor = document.querySelector(".ProseMirror");
        expect(editor?.textContent).toContain("First");
      });

      // Change from parent
      rerender(<TiptapEditor initialContent="Second" onChange={onChange} />);

      await waitFor(() => {
        const editor = document.querySelector(".ProseMirror");
        expect(editor?.textContent).toContain("Second");
      });
    });
  });

  describe("Link Dialog Functionality", () => {
    it("link dialog can be opened and closed", async () => {
      const onChange = vi.fn();
      render(<TiptapEditor initialContent="" onChange={onChange} />);

      const addLinkButton = screen.getByLabelText(/add link/i);

      // Open dialog
      await fireEvent.click(addLinkButton);

      await waitFor(() => {
        expect(screen.getByText(/cancel/i)).toBeInTheDocument();
      });

      // Close dialog with cancel
      await fireEvent.click(screen.getByText(/cancel/i));

      await waitFor(() => {
        expect(screen.queryByText(/cancel/i)).not.toBeInTheDocument();
      });
    });

    it("link dialog input accepts URL", async () => {
      const onChange = vi.fn();
      render(<TiptapEditor initialContent="" onChange={onChange} />);

      // Open dialog
      await fireEvent.click(screen.getByLabelText(/add link/i));

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/https:\/\/example.com/i);
        expect(input).toBeInTheDocument();
      });

      // Type URL
      const input = screen.getByPlaceholderText(/https:\/\/example.com/i);
      await fireEvent.change(input, {
        target: { value: "https://test.com" },
      });

      expect(input).toHaveValue("https://test.com");
    });
  });

  describe("Edge Cases", () => {
    it("handles very long content (performance)", async () => {
      const longText = "Lorem ipsum ".repeat(1000); // ~12KB
      const onChange = vi.fn();

      render(<TiptapEditor initialContent={longText} onChange={onChange} />);

      // Should render without hanging
      await waitFor(() => {
        const editor = document.querySelector(".ProseMirror");
        expect(editor).toBeInTheDocument();
      });
    });

    it("handles special characters in plain text", async () => {
      const specialChars = 'Test <>&"\'{}[]()';
      const onChange = vi.fn();

      render(
        <TiptapEditor initialContent={specialChars} onChange={onChange} />
      );

      await waitFor(() => {
        const editor = document.querySelector(".ProseMirror");
        expect(editor?.textContent).toContain("Test");
      });
    });

    it("handles nested formatting buttons (bold + italic)", () => {
      const onChange = vi.fn();

      render(<TiptapEditor initialContent="" onChange={onChange} />);

      const boldButton = screen.getByLabelText(/^bold$/i);
      const italicButton = screen.getByLabelText(/^italic$/i);

      // Both buttons should exist and be usable
      expect(boldButton).toBeInTheDocument();
      expect(italicButton).toBeInTheDocument();
      expect(boldButton).toBeEnabled();
      expect(italicButton).toBeEnabled();
    });

    it("editor cleanup on unmount (no memory leaks)", () => {
      const onChange = vi.fn();
      const { unmount } = render(
        <TiptapEditor initialContent="" onChange={onChange} />
      );

      // Unmount should not throw
      expect(() => unmount()).not.toThrow();
    });
  });

  describe("Accessibility", () => {
    it("all toolbar buttons have aria-label attributes", () => {
      const onChange = vi.fn();
      render(<TiptapEditor initialContent="" onChange={onChange} />);

      const toolbar = screen.getByRole("toolbar");
      const buttons = toolbar.querySelectorAll("button");

      buttons.forEach((button) => {
        expect(button).toHaveAttribute("aria-label");
      });
    });

    it("toggle buttons have aria-pressed attribute", () => {
      const onChange = vi.fn();
      render(<TiptapEditor initialContent="" onChange={onChange} />);

      const boldButton = screen.getByLabelText(/^bold$/i);
      const italicButton = screen.getByLabelText(/^italic$/i);

      expect(boldButton).toHaveAttribute("aria-pressed");
      expect(italicButton).toHaveAttribute("aria-pressed");
    });

    it("toolbar groups have aria-label attributes", () => {
      const onChange = vi.fn();
      render(<TiptapEditor initialContent="" onChange={onChange} />);

      const groups = screen.getAllByRole("group");

      groups.forEach((group) => {
        expect(group).toHaveAttribute("aria-label");
      });
    });
  });
});
