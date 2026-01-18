import { Node, mergeAttributes } from '@tiptap/core'

export type EntryVideoAttributes = {
  entryMediaId: string | null
  src: string | null
}

/**
 * Custom Tiptap node for entry videos with database references.
 *
 * Stores two attributes:
 * - entryMediaId: Reference to EntryMedia.id in database
 * - src: Video URL for rendering
 *
 * Used in Story 10.1 to enable inline video insertion while maintaining
 * referential integrity with the entry media library.
 */
export const EntryVideo = Node.create({
  name: 'entryVideo',

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
    }
  },

  // Parse HTML to create node (for paste support)
  parseHTML() {
    return [
      {
        tag: 'video[data-entry-media-id]',
        getAttrs: dom => {
          if (!(dom instanceof HTMLElement)) return false

          const entryMediaId = dom.getAttribute('data-entry-media-id')
          const src = dom.getAttribute('src')

          if (!entryMediaId || !src) return false

          return {
            entryMediaId,
            src,
          }
        },
      },
    ]
  },

  // Render node as HTML in the editor
  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes(HTMLAttributes, {
      class: 'max-w-full h-auto rounded-lg',
      controls: 'true',
      preload: 'metadata',
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

export default EntryVideo
