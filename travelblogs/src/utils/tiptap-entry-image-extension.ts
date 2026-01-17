import { Node, mergeAttributes } from '@tiptap/core'

export type EntryImageAttributes = {
  entryMediaId: string | null
  src: string | null
  alt: string
}

/**
 * Custom Tiptap node for entry images with database references.
 *
 * Stores three attributes:
 * - entryMediaId: Reference to EntryMedia.id in database
 * - src: Image URL for rendering
 * - alt: Accessibility text
 *
 * Used in Story 9.6+ to enable inline image insertion while maintaining
 * referential integrity with the entry media library.
 */
export const EntryImage = Node.create({
  name: 'entryImage',

  // Block-level node (not inline)
  group: 'block',

  // Atomic node - cannot contain other nodes or be split
  atom: true,

  // Can be dragged to reposition
  draggable: true,

  // Define node attributes
  addAttributes() {
    return {
      entryMediaId: {
        default: null,
        parseHTML: element => element.getAttribute('data-entry-media-id'),
        renderHTML: attributes => {
          if (!attributes.entryMediaId) return {}
          return {
            'data-entry-media-id': attributes.entryMediaId,
          }
        },
      },
      src: {
        default: null,
        parseHTML: element => element.getAttribute('src'),
        renderHTML: attributes => {
          if (!attributes.src) return {}
          return {
            src: attributes.src,
          }
        },
      },
      alt: {
        default: '',
        parseHTML: element => element.getAttribute('alt'),
        renderHTML: attributes => {
          return {
            alt: attributes.alt || '',
          }
        },
      },
    }
  },

  // Parse HTML to create node (for paste support)
  parseHTML() {
    return [
      {
        tag: 'img[data-entry-media-id]',
        getAttrs: dom => {
          if (!(dom instanceof HTMLElement)) return false

          const entryMediaId = dom.getAttribute('data-entry-media-id')
          const src = dom.getAttribute('src')
          const alt = dom.getAttribute('alt') || ''

          if (!entryMediaId || !src) return false

          return {
            entryMediaId,
            src,
            alt,
          }
        },
      },
    ]
  },

  // Render node as HTML in the editor
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes, {
      class: 'max-w-full h-auto rounded-lg',
      draggable: 'true',
    })]
  },

  // Add keyboard shortcut for deletion
  addKeyboardShortcuts() {
    return {
      Backspace: () => this.editor.commands.deleteSelection(),
      Delete: () => this.editor.commands.deleteSelection(),
    }
  },
})

export default EntryImage
