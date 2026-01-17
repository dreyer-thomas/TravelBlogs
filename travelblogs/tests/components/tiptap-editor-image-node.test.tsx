// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import TiptapEditor from "@/components/entries/tiptap-editor";

vi.mock("@/utils/use-translation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: "en",
    setLocale: vi.fn(),
    formatDate: (date: Date) => date.toLocaleDateString(),
    formatDateTime: (date: Date) => date.toLocaleString(),
  }),
}));

beforeAll(() => {
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

  Element.prototype.scrollIntoView = vi.fn();
  document.elementFromPoint = vi.fn(() => null);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("TiptapEditor entryImage rendering", () => {
  it("renders entryImage nodes from JSON content", async () => {
    const onChange = vi.fn();
    const entryImageJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "entryImage",
          attrs: {
            entryMediaId: "clxyz123",
            src: "/api/media/clxyz123.jpg",
            alt: "Entry photo",
          },
        },
      ],
    });

    render(<TiptapEditor initialContent={entryImageJson} onChange={onChange} />);

    await waitFor(() => {
      const image = document.querySelector('img[data-entry-media-id="clxyz123"]');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("src", "/api/media/clxyz123.jpg");
      expect(image).toHaveAttribute("alt", "Entry photo");
      expect(image).toHaveClass("max-w-full");
      expect(image).toHaveClass("h-auto");
      expect(image).toHaveClass("rounded-lg");
    });
  });
});
