import type { Editor } from '@tiptap/core'

/**
 * Insert an entry image node into the editor at the current cursor position.
 *
 * @param editor - Tiptap editor instance
 * @param entryMediaId - EntryMedia.id from database
 * @param src - Image URL
 * @param alt - Accessibility text (optional)
 *
 * Used in Story 9.7+ to insert images from the gallery into the editor.
 */
export const insertEntryImage = (
  editor: Editor,
  entryMediaId: string,
  src: string,
  alt: string = ''
) => {
  // Get current position
  const { to } = editor.state.selection

  // Insert the image node
  editor
    .chain()
    .insertContentAt(to, {
      type: 'entryImage',
      attrs: {
        entryMediaId,
        src,
        alt,
      },
    })
    .focus()
    .run()
}

/**
 * Extract all entryMediaIds from the editor content.
 *
 * @param editor - Tiptap editor instance
 * @returns Array of entryMediaId strings
 *
 * Used in Story 9.11 to detect which images are used inline before deletion.
 */
export const extractEntryMediaIds = (editor: Editor): string[] => {
  const json = editor.getJSON()
  const ids: string[] = []

  const traverse = (node: any) => {
    if (node.type === 'entryImage' && node.attrs?.entryMediaId) {
      ids.push(node.attrs.entryMediaId)
    }
    if (node.content) {
      node.content.forEach(traverse)
    }
  }

  if (json.content) {
    json.content.forEach(traverse)
  }

  return ids
}

/**
 * Extract entryMediaIds from a Tiptap JSON string.
 *
 * @param tiptapJsonString - Serialized Tiptap JSON
 * @returns Array of entryMediaId strings
 *
 * Used when editor instance is not available (e.g., server-side validation).
 */
export const extractEntryMediaIdsFromJson = (tiptapJsonString: string): string[] => {
  try {
    const json = JSON.parse(tiptapJsonString)
    const ids: string[] = []

    const traverse = (node: any) => {
      if (node.type === 'entryImage' && node.attrs?.entryMediaId) {
        ids.push(node.attrs.entryMediaId)
      }
      if (node.content) {
        node.content.forEach(traverse)
      }
    }

    if (json.content) {
      json.content.forEach(traverse)
    }

    return ids
  } catch {
    return []
  }
}
