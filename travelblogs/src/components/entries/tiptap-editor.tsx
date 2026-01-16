"use client";

import { useEffect, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { getTiptapExtensions } from "@/utils/tiptap-config";
import { detectEntryFormat } from "@/utils/entry-format";
import { useTranslation } from "@/utils/use-translation";

/**
 * Props for the TiptapEditor component.
 */
type TiptapEditorProps = {
  /** Initial content as plain text or Tiptap JSON string */
  initialContent: string;
  /** Callback invoked with Tiptap JSON string on content changes */
  onChange: (jsonContent: string) => void;
  /** Optional placeholder text shown when editor is empty */
  placeholder?: string;
  /** Optional additional CSS classes for the container */
  className?: string;
};

/**
 * Parse initial content string into Tiptap-compatible JSON structure.
 * Handles both plain text and Tiptap JSON formats gracefully.
 */
const parseInitialContent = (content: string) => {
  if (!content || !content.trim()) {
    // Empty content → empty Tiptap document
    return { type: "doc", content: [] };
  }

  const format = detectEntryFormat(content);

  if (format === "tiptap") {
    try {
      return JSON.parse(content);
    } catch {
      // Malformed Tiptap JSON → fallback to plain text
      return {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: content }],
          },
        ],
      };
    }
  }

  // Plain text → convert to Tiptap structure
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: content }],
      },
    ],
  };
};

/**
 * TiptapEditor - Rich text editor component using Tiptap
 *
 * Features:
 * - Supports plain text and Tiptap JSON initialization
 * - Controlled component pattern with onChange callback
 * - Toolbar with formatting controls (bold, italic, headings, lists, links, etc.)
 * - WCAG AA accessible with keyboard navigation
 * - Responsive design for desktop and mobile
 * - Full i18n support for English and German
 */
export default function TiptapEditor({
  initialContent,
  onChange,
  placeholder,
  className = "",
}: TiptapEditorProps) {
  const { t } = useTranslation();
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  // Default placeholder from i18n if not provided
  const editorPlaceholder = placeholder ?? t("editor.placeholder");

  const editor = useEditor({
    extensions: [
      ...getTiptapExtensions(),
      Placeholder.configure({
        placeholder: editorPlaceholder,
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: parseInitialContent(initialContent),
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const jsonString = JSON.stringify(json);
      onChange(jsonString);
    },
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none focus:outline-none min-h-[200px] p-4",
        "aria-label": t("editor.contentArea"),
      },
    },
  });

  // Handle external content updates (controlled component behavior)
  useEffect(() => {
    if (!editor) return;

    const currentContent = JSON.stringify(editor.getJSON());
    const parsedInitial = parseInitialContent(initialContent);
    const newContent = JSON.stringify(parsedInitial);

    // Only update if content actually changed (avoid infinite loops)
    if (currentContent !== newContent) {
      editor.commands.setContent(parsedInitial);
    }
  }, [initialContent, editor]);

  // Link handlers
  const handleSetLink = useCallback(() => {
    if (!editor) return;

    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl })
        .run();
    }

    setShowLinkDialog(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const handleOpenLinkDialog = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href || "";
    setLinkUrl(previousUrl);
    setShowLinkDialog(true);
  }, [editor]);

  const handleRemoveLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
  }, [editor]);

  // Editor initialization failed
  if (!editor) {
    return (
      <div className="p-4 text-red-600 border border-red-300 rounded-lg bg-red-50">
        {t("editor.initError")}
      </div>
    );
  }

  // Toolbar button styling constants
  const buttonBaseClass =
    "px-3 py-1.5 text-sm font-medium rounded min-w-[44px] min-h-[44px] focus:ring-2 focus:ring-[#1F6F78] focus:outline-none transition-colors";
  const activeClass = "bg-[#1F6F78] text-white";
  const inactiveClass = "bg-gray-200 text-gray-700 hover:bg-gray-300";

  return (
    <div
      className={`border border-gray-300 rounded-lg overflow-hidden ${className}`}
    >
      {/* Toolbar */}
      <div
        className="flex flex-wrap gap-2 p-2 border-b border-gray-300 bg-gray-50"
        role="toolbar"
        aria-label={t("editor.toolbar")}
      >
        {/* Text Formatting Group */}
        <div className="flex gap-1" role="group" aria-label={t("editor.textFormatting")}>
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`${buttonBaseClass} ${
              editor.isActive("bold") ? activeClass : inactiveClass
            }`}
            aria-label={t("editor.bold")}
            aria-pressed={editor.isActive("bold")}
            type="button"
          >
            B
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`${buttonBaseClass} ${
              editor.isActive("italic") ? activeClass : inactiveClass
            }`}
            aria-label={t("editor.italic")}
            aria-pressed={editor.isActive("italic")}
            type="button"
          >
            I
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`${buttonBaseClass} ${
              editor.isActive("strike") ? activeClass : inactiveClass
            }`}
            aria-label={t("editor.strikethrough")}
            aria-pressed={editor.isActive("strike")}
            type="button"
          >
            S
          </button>
        </div>

        {/* Headings Group */}
        <div
          className="flex gap-1 border-l pl-2"
          role="group"
          aria-label={t("editor.headings")}
        >
          <button
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            className={`${buttonBaseClass} ${
              editor.isActive("heading", { level: 1 })
                ? activeClass
                : inactiveClass
            }`}
            aria-label={t("editor.heading1")}
            aria-pressed={editor.isActive("heading", { level: 1 })}
            type="button"
          >
            H1
          </button>
          <button
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className={`${buttonBaseClass} ${
              editor.isActive("heading", { level: 2 })
                ? activeClass
                : inactiveClass
            }`}
            aria-label={t("editor.heading2")}
            aria-pressed={editor.isActive("heading", { level: 2 })}
            type="button"
          >
            H2
          </button>
          <button
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            className={`${buttonBaseClass} ${
              editor.isActive("heading", { level: 3 })
                ? activeClass
                : inactiveClass
            }`}
            aria-label={t("editor.heading3")}
            aria-pressed={editor.isActive("heading", { level: 3 })}
            type="button"
          >
            H3
          </button>
        </div>

        {/* Lists Group */}
        <div className="flex gap-1 border-l pl-2" role="group" aria-label={t("editor.lists")}>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`${buttonBaseClass} ${
              editor.isActive("bulletList") ? activeClass : inactiveClass
            }`}
            aria-label={t("editor.bulletList")}
            aria-pressed={editor.isActive("bulletList")}
            type="button"
          >
            •
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`${buttonBaseClass} ${
              editor.isActive("orderedList") ? activeClass : inactiveClass
            }`}
            aria-label={t("editor.numberedList")}
            aria-pressed={editor.isActive("orderedList")}
            type="button"
          >
            1.
          </button>
        </div>

        {/* Alignment Group */}
        <div
          className="flex gap-1 border-l pl-2"
          role="group"
          aria-label={t("editor.alignment")}
        >
          <button
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={`${buttonBaseClass} ${
              editor.isActive({ textAlign: "left" })
                ? activeClass
                : inactiveClass
            }`}
            aria-label={t("editor.alignLeft")}
            aria-pressed={editor.isActive({ textAlign: "left" })}
            type="button"
          >
            ⬅
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            className={`${buttonBaseClass} ${
              editor.isActive({ textAlign: "center" })
                ? activeClass
                : inactiveClass
            }`}
            aria-label={t("editor.alignCenter")}
            aria-pressed={editor.isActive({ textAlign: "center" })}
            type="button"
          >
            ↔
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            className={`${buttonBaseClass} ${
              editor.isActive({ textAlign: "right" })
                ? activeClass
                : inactiveClass
            }`}
            aria-label={t("editor.alignRight")}
            aria-pressed={editor.isActive({ textAlign: "right" })}
            type="button"
          >
            ➡
          </button>
        </div>

        {/* Links Group */}
        <div className="flex gap-1 border-l pl-2" role="group" aria-label={t("editor.links")}>
          <button
            onClick={handleOpenLinkDialog}
            className={`${buttonBaseClass} ${
              editor.isActive("link") ? activeClass : inactiveClass
            }`}
            aria-label={t("editor.addLink")}
            aria-pressed={editor.isActive("link")}
            type="button"
          >
            🔗
          </button>
          <button
            onClick={handleRemoveLink}
            disabled={!editor.isActive("link")}
            className={`${buttonBaseClass} ${inactiveClass} disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label={t("editor.removeLink")}
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Utility Group */}
        <div
          className="flex gap-1 border-l pl-2"
          role="group"
          aria-label={t("editor.undoRedo")}
        >
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className={`${buttonBaseClass} ${inactiveClass} disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label={t("editor.undo")}
            type="button"
          >
            ↶
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className={`${buttonBaseClass} ${inactiveClass} disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label={t("editor.redo")}
            type="button"
          >
            ↷
          </button>
        </div>
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="p-3 border-b border-gray-300 bg-gray-100 flex gap-2 items-center flex-wrap">
          <label htmlFor="link-url" className="sr-only">
            {t("editor.linkUrl")}
          </label>
          <input
            id="link-url"
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder={t("editor.linkPlaceholder")}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1F6F78] focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSetLink();
              } else if (e.key === "Escape") {
                setShowLinkDialog(false);
                setLinkUrl("");
              }
            }}
            autoFocus
          />
          <button
            onClick={handleSetLink}
            className={`${buttonBaseClass} ${activeClass}`}
            type="button"
          >
            {t("editor.applyLink")}
          </button>
          <button
            onClick={() => {
              setShowLinkDialog(false);
              setLinkUrl("");
            }}
            className={`${buttonBaseClass} ${inactiveClass}`}
            type="button"
          >
            {t("common.cancel")}
          </button>
        </div>
      )}

      {/* Editor Content Area */}
      <EditorContent
        editor={editor}
        className="prose prose-lg max-w-none p-4 min-h-[300px] [&_.is-editor-empty:first-child::before]:text-gray-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:pointer-events-none"
      />
    </div>
  );
}
