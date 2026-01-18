/**
 * Entry Format Detection Utilities
 *
 * Provides format detection for Entry text field content to distinguish
 * between plain text and Tiptap JSON formats. Supports dual-format storage
 * strategy for backward compatibility with existing plain text entries.
 */

import { DEFAULT_INLINE_ALT, parseEntryContent } from "./entry-content";

export type EntryFormat = 'plain' | 'tiptap'

export type EntryMediaItem = {
  id: string
  url: string
}

export type EntryMediaLookup = Map<string, string> | EntryMediaItem[] | undefined

/**
 * Represents the format status of a single entry.
 *
 * Used for tracking migration progress from plain text to Tiptap JSON format.
 *
 * @property entryId - The unique identifier of the entry
 * @property format - The detected format ('plain' or 'tiptap')
 */
export type EntryFormatStatus = {
  entryId: string
  format: EntryFormat
}

/**
 * Summary statistics of entry format distribution.
 *
 * Provides aggregated counts for migration reporting and diagnostics.
 *
 * @property totalCount - Total number of entries analyzed
 * @property plainCount - Number of entries in plain text format
 * @property tiptapCount - Number of entries in Tiptap JSON format
 */
export type EntryFormatSummary = {
  totalCount: number
  plainCount: number
  tiptapCount: number
}

export const getEntryFormatStatus = (
  entries: Array<{ id: string; text: string }>,
): EntryFormatStatus[] =>
  entries.map((entry) => ({
    entryId: entry.id,
    format: detectEntryFormat(entry.text ?? ''),
  }))

export const formatEntryFormatSummary = (
  statuses: EntryFormatStatus[],
): EntryFormatSummary => {
  const counts = statuses.reduce(
    (accumulator, status) => {
      if (status.format === 'tiptap') {
        accumulator.tiptapCount += 1
      } else {
        accumulator.plainCount += 1
      }
      return accumulator
    },
    { plainCount: 0, tiptapCount: 0 },
  )

  return {
    totalCount: statuses.length,
    plainCount: counts.plainCount,
    tiptapCount: counts.tiptapCount,
  }
}

/**
 * Detects whether entry text content is plain text or Tiptap JSON format.
 *
 * @param text - The entry text content to analyze
 * @returns 'tiptap' if content is valid Tiptap JSON, 'plain' otherwise
 *
 * @example
 * ```typescript
 * detectEntryFormat('Hello world') // => 'plain'
 * detectEntryFormat('{"type":"doc","content":[]}') // => 'tiptap'
 * ```
 */
export function detectEntryFormat(text: string): EntryFormat {
  // Handle empty or whitespace-only strings
  if (!text || text.trim() === '') {
    return 'plain'
  }

  // 1. Try to parse as JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    // Not valid JSON → plain text
    return 'plain'
  }

  // 2. Check for Tiptap document structure
  if (isTiptapJson(parsed)) {
    return 'tiptap'
  }

  // 3. Valid JSON but not Tiptap → treat as plain text
  return 'plain'
}

/**
 * Validates whether a parsed JSON object is a valid Tiptap document.
 *
 * @param json - The parsed JSON object to validate
 * @returns true if object has Tiptap document structure, false otherwise
 *
 * Tiptap document structure requires:
 * - Type must be 'object' (not null, array, or primitive)
 * - Must have type property set to 'doc'
 * - Must have content property that is an array
 *
 * @example
 * ```typescript
 * const doc = { type: 'doc', content: [] }
 * isTiptapJson(doc) // => true
 * isTiptapJson({ type: 'paragraph' }) // => false
 * ```
 */
function isTiptapJson(json: unknown): boolean {
  // Type guard: must be non-null object
  if (typeof json !== 'object' || json === null) {
    return false
  }

  // Type guard: must have 'type' and 'content' properties
  const doc = json as Record<string, unknown>

  // Check for required Tiptap document structure
  return (
    doc.type === 'doc' &&
    Array.isArray(doc.content)
  )
}

/**
 * Validates the structure of a Tiptap JSON document.
 *
 * This function parses a JSON string and validates that it conforms to the
 * Tiptap document structure. Unlike isTiptapJson which works with parsed objects,
 * this function accepts a string and handles parsing internally.
 *
 * @param json - The JSON string or parsed object to validate
 * @returns true if the content is valid Tiptap JSON structure, false otherwise
 *
 * @example
 * ```typescript
 * validateTiptapStructure('{"type":"doc","content":[]}') // => true
 * validateTiptapStructure('{"type":"paragraph"}') // => false
 * validateTiptapStructure('{invalid json}') // => false
 * ```
 */
export function validateTiptapStructure(json: string | unknown): boolean {
  let parsed: unknown

  // If already parsed object, use directly
  if (typeof json !== 'string') {
    parsed = json
  } else {
    // Try to parse string as JSON
    try {
      parsed = JSON.parse(json)
    } catch {
      return false
    }
  }

  // Validate using isTiptapJson helper
  return isTiptapJson(parsed)
}

/**
 * Converts plain text to Tiptap JSON format.
 *
 * Splits plain text on double newlines to create paragraphs.
 * Each paragraph becomes a Tiptap paragraph node with text content.
 * Empty paragraphs are filtered out.
 *
 * @param plainText - The plain text content to convert
 * @param entryMedia - Optional media context for resolving inline image URLs to entryMediaIds.
 *   Can be a Map<url, id>, an array of {id, url} objects, or undefined.
 *   - If provided: inline images matching a URL are converted to entryImage nodes with entryMediaId set
 *   - If provided but URL not found: inline images are converted to plain text markdown
 *   - If undefined: inline images are converted to entryImage nodes with entryMediaId=null
 * @returns Tiptap JSON string with paragraph structure
 *
 * @example
 * ```typescript
 * plainTextToTiptapJson('Hello\n\nWorld')
 * // => '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello"}]},{"type":"paragraph","content":[{"type":"text","text":"World"}]}]}'
 *
 * // With media mapping
 * const mediaMap = new Map([['https://example.com/img.jpg', 'media-1']])
 * plainTextToTiptapJson('Look ![Photo](https://example.com/img.jpg)', mediaMap)
 * // => entryImage node with entryMediaId: 'media-1'
 * ```
 */
export function plainTextToTiptapJson(
  plainText: string,
  entryMedia?: EntryMediaLookup,
): string {
  if (!plainText || !plainText.trim()) {
    return JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph' }]
    })
  }

  const content: Array<Record<string, unknown>> = []
  const blocks = parseEntryContent(plainText)
  const entryMediaIdByUrl = resolveEntryMediaIdMap(entryMedia)

  blocks.forEach(block => {
    if (block.type === 'text') {
      const paragraphs = block.value
        .split(/\n{2,}/)
        .map(paragraph => paragraph.trim())
        .filter(Boolean)

      paragraphs.forEach(paragraph => {
        content.push({
          type: 'paragraph',
          content: [{ type: 'text', text: paragraph }]
        })
      })
      return
    }

    if (!entryMediaIdByUrl) {
      content.push({
        type: 'entryImage',
        attrs: {
          entryMediaId: null,
          src: block.url,
          alt: block.alt ?? ''
        }
      })
      return
    }

    const entryMediaId = entryMediaIdByUrl.get(block.url)
    if (entryMediaId) {
      content.push({
        type: 'entryImage',
        attrs: {
          entryMediaId,
          src: block.url,
          alt: block.alt ?? ''
        }
      })
      return
    }

    const alt = block.alt ?? DEFAULT_INLINE_ALT
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: `![${alt}](${block.url})` }]
    })
  })

  return JSON.stringify({
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph' }]
  })
}

const resolveEntryMediaIdMap = (
  entryMedia?: EntryMediaLookup,
): Map<string, string> | null => {
  if (!entryMedia) {
    return null
  }

  if (entryMedia instanceof Map) {
    return entryMedia
  }

  return new Map(entryMedia.map((item) => [item.url, item.id]))
}
