// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import EntryImage from '@/utils/tiptap-entry-image-extension'
import {
  insertEntryImage,
  extractEntryMediaIds,
  extractEntryMediaIdsFromJson,
  removeEntryImageNodesFromJson,
} from '@/utils/tiptap-image-helpers'

describe('Tiptap Image Helpers', () => {
  let editor: Editor

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, EntryImage],
      content: '',
    })
  })

  afterEach(() => {
    editor?.destroy()
  })

  describe('insertEntryImage', () => {
    it('inserts image at cursor position', () => {
      insertEntryImage(editor, 'clxyz123', '/api/media/clxyz123.jpg', 'Test image')

      const json = editor.getJSON()
      const imageNode = json.content?.[0]

      expect(imageNode?.type).toBe('entryImage')
      expect(imageNode?.attrs?.entryMediaId).toBe('clxyz123')
      expect(imageNode?.attrs?.src).toBe('/api/media/clxyz123.jpg')
      expect(imageNode?.attrs?.alt).toBe('Test image')
    })

    it('inserts image with empty alt text when not provided', () => {
      insertEntryImage(editor, 'clxyz123', '/api/media/clxyz123.jpg')

      const json = editor.getJSON()
      const imageNode = json.content?.[0]

      expect(imageNode?.attrs?.alt).toBe('')
    })

    it('inserts image with explicit empty alt text', () => {
      insertEntryImage(editor, 'clxyz123', '/api/media/clxyz123.jpg', '')

      const json = editor.getJSON()
      const imageNode = json.content?.[0]

      expect(imageNode?.attrs?.alt).toBe('')
    })

    it('inserts multiple images sequentially', () => {
      insertEntryImage(editor, 'img1', '/img1.jpg', 'First')
      insertEntryImage(editor, 'img2', '/img2.jpg', 'Second')
      insertEntryImage(editor, 'img3', '/img3.jpg', 'Third')

      const json = editor.getJSON()
      const imageNodes = json.content?.filter((node: any) => node.type === 'entryImage')
      expect(imageNodes).toHaveLength(3)
      expect(imageNodes?.[0]?.attrs?.entryMediaId).toBe('img1')
      expect(imageNodes?.[1]?.attrs?.entryMediaId).toBe('img2')
      expect(imageNodes?.[2]?.attrs?.entryMediaId).toBe('img3')
    })

    it('inserts image at current cursor position in document', () => {
      // Add some text first
      editor.commands.setContent('<p>Start</p><p>End</p>')

      // Move cursor to position 6 (end of first paragraph)
      editor.commands.setTextSelection(6)

      insertEntryImage(editor, 'mid', '/mid.jpg', 'Middle image')

      const json = editor.getJSON()
      // Should have: paragraph (Start), entryImage (mid), paragraph (End)
      expect(json.content).toHaveLength(3)
      expect(json.content?.[1]?.type).toBe('entryImage')
      expect(json.content?.[1]?.attrs?.entryMediaId).toBe('mid')
    })

    it('successfully inserts image node', () => {
      insertEntryImage(editor, 'test', '/test.jpg', 'Test')

      // Verify image was inserted
      const json = editor.getJSON()
      const imageNode = json.content?.find((node: any) => node.type === 'entryImage')
      expect(imageNode).toBeDefined()
      expect(imageNode?.attrs?.entryMediaId).toBe('test')
    })
  })

  describe('extractEntryMediaIds', () => {
    it('extracts single entryMediaId', () => {
      insertEntryImage(editor, 'clxyz123', '/api/media/clxyz123.jpg', 'Test')

      const ids = extractEntryMediaIds(editor)

      expect(ids).toEqual(['clxyz123'])
    })

    it('extracts multiple entryMediaIds', () => {
      insertEntryImage(editor, 'img1', '/img1.jpg', 'First')
      insertEntryImage(editor, 'img2', '/img2.jpg', 'Second')
      insertEntryImage(editor, 'img3', '/img3.jpg', 'Third')

      const ids = extractEntryMediaIds(editor)

      expect(ids).toEqual(['img1', 'img2', 'img3'])
    })

    it('returns empty array when no images present', () => {
      editor.commands.setContent('<p>Just text, no images</p>')

      const ids = extractEntryMediaIds(editor)

      expect(ids).toEqual([])
    })

    it('returns empty array for empty editor', () => {
      const ids = extractEntryMediaIds(editor)

      expect(ids).toEqual([])
    })

    it('extracts IDs from nested content', () => {
      // Create complex content with images interspersed
      editor.commands.setContent('<p>Text before</p>')
      insertEntryImage(editor, 'img1', '/img1.jpg', 'First')
      editor.commands.setContent(editor.getHTML() + '<h1>Heading</h1>', false)
      insertEntryImage(editor, 'img2', '/img2.jpg', 'Second')
      editor.commands.setContent(editor.getHTML() + '<ul><li>List item</li></ul>', false)
      insertEntryImage(editor, 'img3', '/img3.jpg', 'Third')

      const ids = extractEntryMediaIds(editor)

      expect(ids).toContain('img1')
      expect(ids).toContain('img2')
      expect(ids).toContain('img3')
      expect(ids.length).toBe(3)
    })

    it('maintains order of entryMediaIds', () => {
      insertEntryImage(editor, 'first', '/first.jpg', 'First')
      insertEntryImage(editor, 'second', '/second.jpg', 'Second')
      insertEntryImage(editor, 'third', '/third.jpg', 'Third')

      const ids = extractEntryMediaIds(editor)

      expect(ids).toEqual(['first', 'second', 'third'])
    })

    it('handles duplicate entryMediaIds', () => {
      insertEntryImage(editor, 'same', '/img1.jpg', 'First')
      insertEntryImage(editor, 'same', '/img2.jpg', 'Second (same ID)')

      const ids = extractEntryMediaIds(editor)

      expect(ids).toEqual(['same', 'same'])
      expect(ids.length).toBe(2)
    })

    it('ignores image nodes with null entryMediaId', () => {
      // Insert valid image
      insertEntryImage(editor, 'valid', '/valid.jpg', 'Valid')

      // Insert image with null entryMediaId at end (shouldn't happen in practice)
      const { to } = editor.state.selection
      editor.commands.insertContentAt(to, {
        type: 'entryImage',
        attrs: {
          entryMediaId: null,
          src: '/null-id.jpg',
          alt: 'No ID',
        },
      })

      const ids = extractEntryMediaIds(editor)

      expect(ids).toEqual(['valid'])
    })
  })

  describe('extractEntryMediaIdsFromJson', () => {
    it('extracts IDs from JSON string', () => {
      insertEntryImage(editor, 'clxyz123', '/api/media/clxyz123.jpg', 'Test')

      const jsonString = JSON.stringify(editor.getJSON())
      const ids = extractEntryMediaIdsFromJson(jsonString)

      expect(ids).toEqual(['clxyz123'])
    })

    it('extracts multiple IDs from JSON string', () => {
      insertEntryImage(editor, 'img1', '/img1.jpg', 'First')
      insertEntryImage(editor, 'img2', '/img2.jpg', 'Second')
      insertEntryImage(editor, 'img3', '/img3.jpg', 'Third')

      const jsonString = JSON.stringify(editor.getJSON())
      const ids = extractEntryMediaIdsFromJson(jsonString)

      expect(ids).toEqual(['img1', 'img2', 'img3'])
    })

    it('returns empty array for JSON with no images', () => {
      editor.commands.setContent('<p>Just text</p>')

      const jsonString = JSON.stringify(editor.getJSON())
      const ids = extractEntryMediaIdsFromJson(jsonString)

      expect(ids).toEqual([])
    })

    it('returns empty array for empty document JSON', () => {
      const emptyJson = JSON.stringify({ type: 'doc', content: [] })
      const ids = extractEntryMediaIdsFromJson(emptyJson)

      expect(ids).toEqual([])
    })

    it('returns empty array for invalid JSON', () => {
      const ids = extractEntryMediaIdsFromJson('{invalid json')

      expect(ids).toEqual([])
    })

    it('returns empty array for non-Tiptap JSON', () => {
      const regularJson = JSON.stringify({ foo: 'bar', baz: 123 })
      const ids = extractEntryMediaIdsFromJson(regularJson)

      expect(ids).toEqual([])
    })

    it('handles JSON without content array', () => {
      const noContentJson = JSON.stringify({ type: 'doc' })
      const ids = extractEntryMediaIdsFromJson(noContentJson)

      expect(ids).toEqual([])
    })

    it('works independently of editor instance', () => {
      // Create one editor, insert images, get JSON
      const editor1 = new Editor({
        extensions: [StarterKit, EntryImage],
        content: '',
      })

      insertEntryImage(editor1, 'test1', '/test1.jpg', 'Test 1')
      insertEntryImage(editor1, 'test2', '/test2.jpg', 'Test 2')

      const jsonString = JSON.stringify(editor1.getJSON())
      editor1.destroy()

      // Extract IDs without an editor instance
      const ids = extractEntryMediaIdsFromJson(jsonString)

      expect(ids).toEqual(['test1', 'test2'])
    })

    it('handles deeply nested content structures', () => {
      const complexJson = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Start' }],
          },
          {
            type: 'entryImage',
            attrs: {
              entryMediaId: 'img1',
              src: '/img1.jpg',
              alt: 'First',
            },
          },
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Heading' }],
          },
          {
            type: 'entryImage',
            attrs: {
              entryMediaId: 'img2',
              src: '/img2.jpg',
              alt: 'Second',
            },
          },
        ],
      })

      const ids = extractEntryMediaIdsFromJson(complexJson)

      expect(ids).toEqual(['img1', 'img2'])
    })

    it('maintains ID order from JSON', () => {
      const jsonString = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'entryImage',
            attrs: { entryMediaId: 'first', src: '/first.jpg', alt: 'First' },
          },
          {
            type: 'entryImage',
            attrs: { entryMediaId: 'second', src: '/second.jpg', alt: 'Second' },
          },
          {
            type: 'entryImage',
            attrs: { entryMediaId: 'third', src: '/third.jpg', alt: 'Third' },
          },
        ],
      })

      const ids = extractEntryMediaIdsFromJson(jsonString)

      expect(ids).toEqual(['first', 'second', 'third'])
    })

    it('ignores nodes with null entryMediaId', () => {
      const jsonString = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'entryImage',
            attrs: { entryMediaId: 'valid', src: '/valid.jpg', alt: 'Valid' },
          },
          {
            type: 'entryImage',
            attrs: { entryMediaId: null, src: '/null.jpg', alt: 'Null ID' },
          },
        ],
      })

      const ids = extractEntryMediaIdsFromJson(jsonString)

      expect(ids).toEqual(['valid'])
    })
  })

  describe('removeEntryImageNodesFromJson', () => {
    it('removes matching entryImage nodes from JSON', () => {
      const jsonString = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'entryImage',
            attrs: { entryMediaId: 'remove', src: '/remove.jpg', alt: 'Remove' },
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Keep me' }],
          },
          {
            type: 'entryImage',
            attrs: { entryMediaId: 'keep', src: '/keep.jpg', alt: 'Keep' },
          },
        ],
      })

      const updated = removeEntryImageNodesFromJson(jsonString, 'remove')
      const parsed = JSON.parse(updated)
      const imageNodes = parsed.content?.filter((node: any) => node.type === 'entryImage')

      expect(imageNodes).toHaveLength(1)
      expect(imageNodes?.[0]?.attrs?.entryMediaId).toBe('keep')
    })

    it('preserves JSON when no matches are found', () => {
      const jsonString = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'entryImage',
            attrs: { entryMediaId: 'keep', src: '/keep.jpg', alt: 'Keep' },
          },
        ],
      })

      const updated = removeEntryImageNodesFromJson(jsonString, 'missing')

      expect(updated).toBe(jsonString)
    })

    it('returns original JSON for invalid input', () => {
      const jsonString = '{invalid json'

      const updated = removeEntryImageNodesFromJson(jsonString, 'remove')

      expect(updated).toBe(jsonString)
    })

    it('removes all matching nodes including duplicates', () => {
      const jsonString = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Start' }],
          },
          {
            type: 'entryImage',
            attrs: { entryMediaId: 'dup', src: '/dup1.jpg', alt: 'First' },
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Middle' }],
          },
          {
            type: 'entryImage',
            attrs: { entryMediaId: 'dup', src: '/dup2.jpg', alt: 'Second' },
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'End' }],
          },
        ],
      })

      const updated = removeEntryImageNodesFromJson(jsonString, 'dup')
      const parsed = JSON.parse(updated)

      const imageNodes = parsed.content?.filter((node: any) => node.type === 'entryImage')
      const paragraphNodes = parsed.content?.filter((node: any) => node.type === 'paragraph')

      expect(imageNodes).toHaveLength(0)
      expect(paragraphNodes).toHaveLength(3)
      expect(paragraphNodes?.[0]?.content?.[0]?.text).toBe('Start')
      expect(paragraphNodes?.[1]?.content?.[0]?.text).toBe('Middle')
      expect(paragraphNodes?.[2]?.content?.[0]?.text).toBe('End')
    })
  })

  describe('Helper Integration', () => {
    it('extracts same IDs using both helper methods', () => {
      insertEntryImage(editor, 'img1', '/img1.jpg', 'First')
      insertEntryImage(editor, 'img2', '/img2.jpg', 'Second')

      const idsFromEditor = extractEntryMediaIds(editor)
      const jsonString = JSON.stringify(editor.getJSON())
      const idsFromJson = extractEntryMediaIdsFromJson(jsonString)

      expect(idsFromEditor).toEqual(idsFromJson)
    })

    it('round-trips: insert → extract → verify', () => {
      const testImages = [
        { id: 'abc123', src: '/abc.jpg', alt: 'ABC' },
        { id: 'def456', src: '/def.jpg', alt: 'DEF' },
        { id: 'ghi789', src: '/ghi.jpg', alt: 'GHI' },
      ]

      // Insert all images
      testImages.forEach((img) => {
        insertEntryImage(editor, img.id, img.src, img.alt)
      })

      // Extract IDs
      const extractedIds = extractEntryMediaIds(editor)

      // Verify all IDs present
      expect(extractedIds).toEqual(testImages.map((img) => img.id))
    })
  })
})
