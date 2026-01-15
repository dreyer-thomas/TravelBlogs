/**
 * Entry Format Detection Utilities
 *
 * Provides format detection for Entry text field content to distinguish
 * between plain text and Tiptap JSON formats. Supports dual-format storage
 * strategy for backward compatibility with existing plain text entries.
 */

export type EntryFormat = 'plain' | 'tiptap'

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
