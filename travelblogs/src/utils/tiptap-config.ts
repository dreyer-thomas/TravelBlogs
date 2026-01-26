import StarterKit from '@tiptap/starter-kit'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import EntryImage from './tiptap-entry-image-extension'
import EntryVideo from './tiptap-entry-video-extension'

/**
 * Returns configured Tiptap extensions for the rich text editor.
 *
 * Extensions included:
 * - StarterKit: Headings (H1-H3), Lists, Paragraph, etc. (Bold, Italic, Strike, Link disabled)
 * - Bold/Italic: Custom versions without input rules (formatting only via toolbar buttons)
 * - Underline: Underline text support
 * - TextAlign: Left, center, right alignment for paragraphs and headings
 * - Link: Hyperlink support with custom styling
 * - EntryImage: Custom image node with entryMediaId reference (Story 9.6)
 * - EntryVideo: Custom video node with entryMediaId reference (Story 10.1)
 *
 * Used in Story 9.3+ for editor component initialization.
 */
export const getTiptapExtensions = () => [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3], // Only H1, H2, H3 as per requirements
    },
    // Disable bold, italic from StarterKit to use custom versions without input rules
    bold: false,
    italic: false,
    strike: false,
    // Disable built-in Link to use custom configured version below
    link: false,
    // Disable underline from StarterKit (if it exists there)
    underline: false,
  }),
  // Custom Bold without any automatic formatting - ONLY via toolbar button
  Bold.configure({
    // Completely disable any automatic HTML rendering of bold
    HTMLAttributes: {},
  }).extend({
    addInputRules() {
      return []; // Disable typing patterns like **text**
    },
    addPasteRules() {
      return []; // Disable pasted bold detection
    },
    addKeyboardShortcuts() {
      return {
        // Disable Cmd+B / Ctrl+B keyboard shortcut
        'Mod-b': () => true,
        'Mod-B': () => true,
      };
    },
  }),
  // Custom Italic without any automatic formatting - ONLY via toolbar button
  Italic.extend({
    addInputRules() {
      return []; // Disable typing patterns like *text*
    },
    addPasteRules() {
      return []; // Disable pasted italic detection
    },
    addKeyboardShortcuts() {
      return {
        // Disable Cmd+I / Ctrl+I keyboard shortcut
        'Mod-i': () => true,
        'Mod-I': () => true,
      };
    },
  }),
  // Underline extension (not in StarterKit by default)
  Underline,
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
  EntryImage, // Story 9.6 - Custom image node with entryMediaId
  EntryVideo, // Story 10.1 - Custom video node with entryMediaId
]
