import { describe, it, expect } from 'vitest'
import {
  detectEntryFormat,
  plainTextToTiptapJson,
  validateTiptapStructure,
  type EntryFormat,
} from '@/utils/entry-format'

describe('detectEntryFormat', () => {
  describe('Plain Text Detection', () => {
    it('detects simple plain text format', () => {
      expect(detectEntryFormat('Hello world')).toBe('plain')
    })

    it('detects multi-line plain text', () => {
      const multiline = `First line
Second line
Third line`
      expect(detectEntryFormat(multiline)).toBe('plain')
    })

    it('detects plain text with special characters', () => {
      expect(detectEntryFormat('Hello! @#$%^&*() world?')).toBe('plain')
    })

    it('treats empty string as plain text', () => {
      expect(detectEntryFormat('')).toBe('plain')
    })

    it('treats whitespace-only string as plain text', () => {
      expect(detectEntryFormat('   ')).toBe('plain')
      expect(detectEntryFormat('\n\t')).toBe('plain')
      expect(detectEntryFormat('  \n  ')).toBe('plain')
    })
  })

  describe('Tiptap JSON Detection', () => {
    it('detects valid Tiptap JSON with doc type', () => {
      const tiptapJson = JSON.stringify({
        type: 'doc',
        content: []
      })
      expect(detectEntryFormat(tiptapJson)).toBe('tiptap')
    })

    it('detects valid Tiptap JSON with nested content', () => {
      const tiptapJson = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello world' }]
          }
        ]
      })
      expect(detectEntryFormat(tiptapJson)).toBe('tiptap')
    })

    it('detects valid Tiptap JSON with formatting marks', () => {
      const tiptapJson = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                marks: [{ type: 'bold' }],
                text: 'Bold text'
              }
            ]
          }
        ]
      })
      expect(detectEntryFormat(tiptapJson)).toBe('tiptap')
    })

    it('detects Tiptap JSON with empty content array', () => {
      const tiptapJson = JSON.stringify({
        type: 'doc',
        content: []
      })
      expect(detectEntryFormat(tiptapJson)).toBe('tiptap')
    })
  })

  describe('Edge Cases', () => {
    it('treats invalid JSON as plain text', () => {
      expect(detectEntryFormat('{invalid')).toBe('plain')
    })

    it('treats valid JSON but not Tiptap structure as plain text', () => {
      const regularJson = JSON.stringify({ foo: 'bar', baz: 123 })
      expect(detectEntryFormat(regularJson)).toBe('plain')
    })

    it('treats JSON array as plain text', () => {
      const jsonArray = JSON.stringify([1, 2, 3, 'test'])
      expect(detectEntryFormat(jsonArray)).toBe('plain')
    })

    it('treats JSON with wrong type as plain text', () => {
      const wrongType = JSON.stringify({
        type: 'paragraph',
        content: []
      })
      expect(detectEntryFormat(wrongType)).toBe('plain')
    })

    it('treats JSON missing content array as plain text', () => {
      const missingContent = JSON.stringify({
        type: 'doc'
      })
      expect(detectEntryFormat(missingContent)).toBe('plain')
    })

    it('treats JSON with non-array content as plain text', () => {
      const badContent = JSON.stringify({
        type: 'doc',
        content: 'not-an-array'
      })
      expect(detectEntryFormat(badContent)).toBe('plain')
    })

    it('handles large JSON strings efficiently', () => {
      const largeContent = {
        type: 'doc',
        content: Array(1000).fill(null).map((_, i) => ({
          type: 'paragraph',
          content: [{ type: 'text', text: `Paragraph ${i}` }]
        }))
      }
      const largeJson = JSON.stringify(largeContent)
      expect(detectEntryFormat(largeJson)).toBe('tiptap')
      expect(largeJson.length).toBeGreaterThan(50000) // Verify it's actually large
    })
  })
})

describe('validateTiptapStructure', () => {
  it('validates valid Tiptap JSON string', () => {
    const tiptapJson = JSON.stringify({
      type: 'doc',
      content: []
    })
    expect(validateTiptapStructure(tiptapJson)).toBe(true)
  })

  it('validates valid Tiptap JSON object', () => {
    const tiptapObj = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }]
    }
    expect(validateTiptapStructure(tiptapObj)).toBe(true)
  })

  it('rejects invalid JSON string', () => {
    expect(validateTiptapStructure('{invalid')).toBe(false)
  })

  it('rejects valid JSON but wrong structure', () => {
    const wrongStructure = JSON.stringify({ type: 'paragraph', content: [] })
    expect(validateTiptapStructure(wrongStructure)).toBe(false)
  })

  it('rejects missing content array', () => {
    const missingContent = JSON.stringify({ type: 'doc' })
    expect(validateTiptapStructure(missingContent)).toBe(false)
  })

  it('rejects non-object types', () => {
    expect(validateTiptapStructure('plain text')).toBe(false)
    expect(validateTiptapStructure(JSON.stringify([1, 2, 3]))).toBe(false)
    expect(validateTiptapStructure(JSON.stringify(null))).toBe(false)
  })
})

describe('plainTextToTiptapJson', () => {
  it('converts paragraphs into Tiptap JSON', () => {
    const result = plainTextToTiptapJson('Hello\n\nWorld')
    const parsed = JSON.parse(result)

    expect(parsed).toMatchObject({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'World' }],
        },
      ],
    })
  })

  it('converts inline image markdown into entryImage nodes', () => {
    const result = plainTextToTiptapJson(
      'Look ![Fresh](https://example.com/inline.jpg) here.',
    )
    const parsed = JSON.parse(result)

    expect(parsed.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'entryImage',
          attrs: {
            entryMediaId: null,
            src: 'https://example.com/inline.jpg',
            alt: 'Fresh',
          },
        }),
      ]),
    )
  })

  it('maps inline image urls to entryMediaId when provided', () => {
    const mediaByUrl = new Map([
      ['https://example.com/inline.jpg', 'media-1'],
    ])
    const result = plainTextToTiptapJson(
      'Look ![Fresh](https://example.com/inline.jpg) here.',
      mediaByUrl,
    )
    const parsed = JSON.parse(result)

    expect(parsed.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'entryImage',
          attrs: {
            entryMediaId: 'media-1',
            src: 'https://example.com/inline.jpg',
            alt: 'Fresh',
          },
        }),
      ]),
    )
  })

  it('converts unmatched inline images to plain text nodes', () => {
    const mediaByUrl = new Map([
      ['https://example.com/other.jpg', 'media-2'],
    ])
    const result = plainTextToTiptapJson(
      'Look ![Fresh](https://example.com/inline.jpg) here.',
      mediaByUrl,
    )
    const parsed = JSON.parse(result)

    const hasEntryImage = parsed.content.some(
      (node: { type?: string }) => node.type === 'entryImage',
    )
    const textNodes = parsed.content
      .flatMap((node: { content?: Array<{ text?: string }> }) =>
        node.content ?? [],
      )
      .map((node: { text?: string }) => node.text)
      .filter(Boolean)

    expect(hasEntryImage).toBe(false)
    expect(textNodes).toContain('![Fresh](https://example.com/inline.jpg)')
  })

  it('accepts EntryMediaItem array format for entryMedia', () => {
    const mediaArray = [
      { id: 'media-1', url: 'https://example.com/inline.jpg' },
      { id: 'media-2', url: 'https://example.com/other.jpg' },
    ]
    const result = plainTextToTiptapJson(
      'Look ![Fresh](https://example.com/inline.jpg) here.',
      mediaArray,
    )
    const parsed = JSON.parse(result)

    expect(parsed.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'entryImage',
          attrs: {
            entryMediaId: 'media-1',
            src: 'https://example.com/inline.jpg',
            alt: 'Fresh',
          },
        }),
      ]),
    )
  })
})
