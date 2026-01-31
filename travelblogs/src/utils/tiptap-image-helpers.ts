import type { Editor } from '@tiptap/core'

type TiptapNode = {
  type?: string
  attrs?: Record<string, unknown>
  content?: TiptapNode[]
}

const getStringAttr = (node: TiptapNode, key: string): string | null => {
  const value = node.attrs?.[key]
  return typeof value === 'string' ? value : null
}

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
 * Insert an entry video node into the editor at the current cursor position.
 *
 * @param editor - Tiptap editor instance
 * @param entryMediaId - EntryMedia.id from database
 * @param src - Video URL
 *
 * Used in Story 10.1 to insert videos from the gallery into the editor.
 */
export const insertEntryVideo = (
  editor: Editor,
  entryMediaId: string,
  src: string
) => {
  // Get current position
  const { to } = editor.state.selection

  // Insert the video node
  editor
    .chain()
    .insertContentAt(to, {
      type: 'entryVideo',
      attrs: {
        entryMediaId,
        src,
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
  const json = editor.getJSON() as TiptapNode
  const ids: string[] = []

  const traverse = (node: TiptapNode) => {
    const entryMediaId = getStringAttr(node, 'entryMediaId')
    if ((node.type === 'entryImage' || node.type === 'entryVideo') && entryMediaId) {
      ids.push(entryMediaId)
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(traverse)
    }
  }

  if (Array.isArray(json.content)) {
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
    const json = JSON.parse(tiptapJsonString) as TiptapNode
    const ids: string[] = []

    const traverse = (node: TiptapNode) => {
      const entryMediaId = getStringAttr(node, 'entryMediaId')
      if ((node.type === 'entryImage' || node.type === 'entryVideo') && entryMediaId) {
        ids.push(entryMediaId)
      }
      if (Array.isArray(node.content)) {
        node.content.forEach(traverse)
      }
    }

    if (Array.isArray(json.content)) {
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
    const json = JSON.parse(tiptapJsonString) as TiptapNode
    const nodes: EntryImageNodeData[] = []

    const traverse = (node: TiptapNode) => {
      if (node.type === 'entryImage') {
        nodes.push({
          entryMediaId: getStringAttr(node, 'entryMediaId'),
          src: getStringAttr(node, 'src'),
          alt: getStringAttr(node, 'alt'),
        })
      }
      if (Array.isArray(node.content)) {
        node.content.forEach(traverse)
      }
    }

    if (Array.isArray(json.content)) {
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
    const parsed = JSON.parse(tiptapJsonString) as TiptapNode
    let updated = false

    const visitNode = (node: TiptapNode | null): TiptapNode | null => {
      if (!node) {
        return node
      }
      if (node.type === 'entryImage' && getStringAttr(node, 'entryMediaId') === entryMediaId) {
        updated = true
        return null
      }
      const currentContent = node.content
      if (Array.isArray(currentContent)) {
        const nextContent = currentContent
          .map(visitNode)
          .filter((child): child is TiptapNode => child !== null)
        if (
          nextContent.length !== currentContent.length ||
          nextContent.some((child, index) => child !== currentContent[index])
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

/**
 * Remove all entryVideo nodes with matching entryMediaId from Tiptap JSON.
 *
 * @param tiptapJsonString - Serialized Tiptap JSON
 * @param entryMediaId - EntryMedia.id to remove
 * @returns Updated Tiptap JSON string with video nodes removed
 *
 * Used in Story 10.1 when user deletes video from gallery to clean up inline references.
 */
export const removeEntryVideoNodesFromJson = (
  tiptapJsonString: string,
  entryMediaId: string,
): string => {
  try {
    const parsed = JSON.parse(tiptapJsonString) as TiptapNode
    let updated = false

    const visitNode = (node: TiptapNode | null): TiptapNode | null => {
      if (!node) {
        return node
      }
      if (node.type === 'entryVideo' && getStringAttr(node, 'entryMediaId') === entryMediaId) {
        updated = true
        return null
      }
      const currentContent = node.content
      if (Array.isArray(currentContent)) {
        const nextContent = currentContent
          .map(visitNode)
          .filter((child): child is TiptapNode => child !== null)
        if (
          nextContent.length !== currentContent.length ||
          nextContent.some((child, index) => child !== currentContent[index])
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
    console.error('Failed to parse Tiptap JSON for video removal:', error)
    return tiptapJsonString
  }
}
