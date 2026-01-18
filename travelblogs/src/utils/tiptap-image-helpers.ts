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

export type EntryImageNodeData = {
  entryMediaId: string | null
  src: string | null
  alt: string | null
}

export const extractEntryImageNodesFromJson = (
  tiptapJsonString: string,
): EntryImageNodeData[] => {
  try {
    const json = JSON.parse(tiptapJsonString)
    const nodes: EntryImageNodeData[] = []

    const traverse = (node: any) => {
      if (node.type === 'entryImage') {
        nodes.push({
          entryMediaId: node.attrs?.entryMediaId ?? null,
          src: node.attrs?.src ?? null,
          alt: node.attrs?.alt ?? null,
        })
      }
      if (node.content) {
        node.content.forEach(traverse)
      }
    }

    if (json.content) {
      json.content.forEach(traverse)
    }

    return nodes
  } catch {
    return []
  }
}

export const removeEntryImageNodesFromJson = (
  tiptapJsonString: string,
  entryMediaId: string,
): string => {
  try {
    const parsed = JSON.parse(tiptapJsonString)
    let updated = false

    const visitNode = (node: any): any => {
      if (!node || typeof node !== 'object') {
        return node
      }
      if (node.type === 'entryImage' && node.attrs?.entryMediaId === entryMediaId) {
        updated = true
        return null
      }
      if (Array.isArray(node.content)) {
        const nextContent = node.content
          .map(visitNode)
          .filter((child: any) => child !== null)
        if (
          nextContent.length !== node.content.length ||
          nextContent.some((child: any, index: number) => child !== node.content[index])
        ) {
          updated = true
          return { ...node, content: nextContent }
        }
      }
      return node
    }

    const nextParsed = visitNode(parsed)
    if (!updated || !nextParsed) {
      return tiptapJsonString
    }
    return JSON.stringify(nextParsed)
  } catch (error) {
    // Log parse errors but return original to prevent data loss
    console.error('Failed to parse Tiptap JSON for image removal:', error)
    return tiptapJsonString
  }
}
