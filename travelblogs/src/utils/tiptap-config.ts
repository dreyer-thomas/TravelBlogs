import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'

/**
 * Returns configured Tiptap extensions for the rich text editor.
 *
 * Extensions included:
 * - StarterKit: Bold, Italic, Headings (H1-H3), Lists, etc.
 * - TextAlign: Left, center, right alignment for paragraphs and headings
 * - Link: Hyperlink support with custom styling
 *
 * Used in Story 9.3+ for editor component initialization.
 */
export const getTiptapExtensions = () => [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3], // Only H1, H2, H3 as per requirements
    },
  }),
  TextAlign.configure({
    types: ['heading', 'paragraph'],
    alignments: ['left', 'center', 'right'],
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'text-[#1F6F78] underline hover:text-[#2D2A26]',
    },
  }),
]
