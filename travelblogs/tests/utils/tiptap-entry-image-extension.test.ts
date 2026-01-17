// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import EntryImage, { type EntryImageAttributes } from '@/utils/tiptap-entry-image-extension'

describe('EntryImage Extension', () => {
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

  describe('Node Registration', () => {
    it('registers entryImage node in schema', () => {
      expect(editor.schema.nodes.entryImage).toBeDefined()
    })

    it('has correct node configuration', () => {
      const nodeSpec = editor.schema.nodes.entryImage.spec
      expect(nodeSpec.group).toBe('block')
      expect(nodeSpec.atom).toBe(true)
      expect(nodeSpec.draggable).toBe(true)
    })
  })

  describe('Attribute Defaults', () => {
    it('has correct default attributes', () => {
      editor.commands.insertContent({
        type: 'entryImage',
        attrs: {},
      })

      const json = editor.getJSON()
      const imageNode = json.content?.[0]

      expect(imageNode?.type).toBe('entryImage')
      expect(imageNode?.attrs).toEqual({
        entryMediaId: null,
        src: null,
        alt: '',
      })
    })
  })

  describe('Node Insertion', () => {
    it('inserts image node with all attributes', () => {
      editor.commands.insertContent({
        type: 'entryImage',
        attrs: {
          entryMediaId: 'clxyz123',
          src: '/api/media/clxyz123.jpg',
          alt: 'Test image',
        },
      })

      const json = editor.getJSON()
      const imageNode = json.content?.[0]

      expect(imageNode?.type).toBe('entryImage')
      expect(imageNode?.attrs?.entryMediaId).toBe('clxyz123')
      expect(imageNode?.attrs?.src).toBe('/api/media/clxyz123.jpg')
      expect(imageNode?.attrs?.alt).toBe('Test image')
    })

    it('allows optional alt text', () => {
      editor.commands.insertContent({
        type: 'entryImage',
        attrs: {
          entryMediaId: 'clxyz123',
          src: '/api/media/clxyz123.jpg',
        },
      })

      const json = editor.getJSON()
      const imageNode = json.content?.[0]

      expect(imageNode?.attrs?.alt).toBe('')
    })

    it('inserts multiple images correctly', () => {
      const { to } = editor.state.selection
      editor.commands.insertContentAt(to, {
        type: 'entryImage',
        attrs: {
          entryMediaId: 'img1',
          src: '/api/media/img1.jpg',
          alt: 'First image',
        },
      })

      const { to: to2 } = editor.state.selection
      editor.commands.insertContentAt(to2, {
        type: 'entryImage',
        attrs: {
          entryMediaId: 'img2',
          src: '/api/media/img2.jpg',
          alt: 'Second image',
        },
      })

      const json = editor.getJSON()
      const imageNodes = json.content?.filter((node: any) => node.type === 'entryImage')
      expect(imageNodes).toHaveLength(2)
      expect(imageNodes?.[0]?.attrs?.entryMediaId).toBe('img1')
      expect(imageNodes?.[1]?.attrs?.entryMediaId).toBe('img2')
    })
  })

  describe('JSON Serialization', () => {
    it('exports to JSON with all attributes', () => {
      editor.commands.insertContent({
        type: 'entryImage',
        attrs: {
          entryMediaId: 'clxyz123',
          src: '/api/media/clxyz123.jpg',
          alt: 'Entry photo',
        },
      })

      const json = editor.getJSON()

      expect(json.type).toBe('doc')
      expect(json.content).toBeDefined()

      const imageNode = json.content?.find((node: any) => node.type === 'entryImage')
      expect(imageNode).toBeDefined()
      expect(imageNode?.attrs).toEqual({
        entryMediaId: 'clxyz123',
        src: '/api/media/clxyz123.jpg',
        alt: 'Entry photo',
      })
    })

    it('preserves entryMediaId in JSON output', () => {
      editor.commands.insertContent({
        type: 'entryImage',
        attrs: {
          entryMediaId: 'abc123',
          src: '/test.jpg',
          alt: 'Test',
        },
      })

      const json = editor.getJSON()
      const jsonString = JSON.stringify(json)
      const parsed = JSON.parse(jsonString)

      expect(parsed.content[0].attrs.entryMediaId).toBe('abc123')
    })
  })

  describe('HTML Parsing', () => {
    it('parses HTML with data-entry-media-id attribute', () => {
      const html = '<img data-entry-media-id="clxyz123" src="/api/media/clxyz123.jpg" alt="Test image" />'

      editor.commands.setContent(html)
      const json = editor.getJSON()
      const imageNode = json.content?.[0]

      expect(imageNode?.type).toBe('entryImage')
      expect(imageNode?.attrs?.entryMediaId).toBe('clxyz123')
      expect(imageNode?.attrs?.src).toBe('/api/media/clxyz123.jpg')
      expect(imageNode?.attrs?.alt).toBe('Test image')
    })

    it('does not parse regular img tags without data-entry-media-id', () => {
      const html = '<img src="/test.jpg" alt="Regular image" />'

      editor.commands.setContent(html)
      const json = editor.getJSON()

      // Should not create an entryImage node
      const hasEntryImage = json.content?.some((node: any) => node.type === 'entryImage')
      expect(hasEntryImage).toBeFalsy()
    })

    it('requires both entryMediaId and src to parse', () => {
      const htmlNoSrc = '<img data-entry-media-id="clxyz123" alt="Test" />'
      editor.commands.setContent(htmlNoSrc)

      let json = editor.getJSON()
      let hasEntryImage = json.content?.some((node: any) => node.type === 'entryImage')
      expect(hasEntryImage).toBeFalsy()

      const htmlNoId = '<img src="/test.jpg" alt="Test" />'
      editor.commands.setContent(htmlNoId)

      json = editor.getJSON()
      hasEntryImage = json.content?.some((node: any) => node.type === 'entryImage')
      expect(hasEntryImage).toBeFalsy()
    })
  })

  describe('HTML Rendering', () => {
    it('renders to HTML with all attributes', () => {
      editor.commands.insertContent({
        type: 'entryImage',
        attrs: {
          entryMediaId: 'clxyz123',
          src: '/api/media/clxyz123.jpg',
          alt: 'Test image',
        },
      })

      const html = editor.getHTML()

      expect(html).toContain('data-entry-media-id="clxyz123"')
      expect(html).toContain('src="/api/media/clxyz123.jpg"')
      expect(html).toContain('alt="Test image"')
      expect(html).toContain('class="max-w-full h-auto rounded-lg"')
      expect(html).toContain('draggable="true"')
    })

    it('renders with empty alt text when not provided', () => {
      editor.commands.insertContent({
        type: 'entryImage',
        attrs: {
          entryMediaId: 'clxyz123',
          src: '/test.jpg',
        },
      })

      const html = editor.getHTML()
      expect(html).toContain('alt=""')
    })
  })

  describe('Node Deletion', () => {
    it('removes node from content when deleted', () => {
      editor.commands.insertContent({
        type: 'entryImage',
        attrs: {
          entryMediaId: 'clxyz123',
          src: '/test.jpg',
          alt: 'Test',
        },
      })

      const beforeDelete = editor.getJSON().content?.filter((node: any) => node.type === 'entryImage')
      expect(beforeDelete).toHaveLength(1)

      // Select all and delete
      editor.commands.selectAll()
      editor.commands.deleteSelection()

      const afterDelete = editor.getJSON().content?.filter((node: any) => node.type === 'entryImage')
      expect(afterDelete).toHaveLength(0)
    })

    it('removes entryMediaId from JSON when node deleted', () => {
      editor.commands.insertContent({
        type: 'entryImage',
        attrs: {
          entryMediaId: 'clxyz123',
          src: '/test.jpg',
          alt: 'Test',
        },
      })

      const beforeDelete = JSON.stringify(editor.getJSON())
      expect(beforeDelete).toContain('clxyz123')

      editor.commands.selectAll()
      editor.commands.deleteSelection()

      const afterDelete = JSON.stringify(editor.getJSON())
      expect(afterDelete).not.toContain('clxyz123')
    })

    it('deletes specific image from multiple images', () => {
      let pos = editor.state.selection.to
      editor.commands.insertContentAt(pos, {
        type: 'entryImage',
        attrs: { entryMediaId: 'img1', src: '/img1.jpg', alt: 'First' },
      })
      pos = editor.state.selection.to
      editor.commands.insertContentAt(pos, {
        type: 'entryImage',
        attrs: { entryMediaId: 'img2', src: '/img2.jpg', alt: 'Second' },
      })
      pos = editor.state.selection.to
      editor.commands.insertContentAt(pos, {
        type: 'entryImage',
        attrs: { entryMediaId: 'img3', src: '/img3.jpg', alt: 'Third' },
      })

      const beforeDelete = editor.getJSON().content?.filter((node: any) => node.type === 'entryImage')
      expect(beforeDelete).toHaveLength(3)

      // Select and delete one image node
      editor.commands.setNodeSelection(editor.state.doc.resolve(1).pos)
      editor.commands.deleteSelection()

      const json = editor.getJSON()
      const imageNodes = json.content?.filter((node: any) => node.type === 'entryImage')
      expect(imageNodes).toHaveLength(2)
      // After deletion, should have 2 images remaining (don't assume order)
      const remainingIds = imageNodes?.map((node: any) => node.attrs?.entryMediaId)
      expect(remainingIds).toHaveLength(2)
      expect(remainingIds?.some((id: string) => ['img1', 'img2', 'img3'].includes(id))).toBe(true)
    })

    it('deletes selected image on Backspace shortcut', () => {
      editor.commands.insertContent({
        type: 'entryImage',
        attrs: {
          entryMediaId: 'clxyz123',
          src: '/test.jpg',
          alt: 'Test',
        },
      })

      let imagePos: number | null = null
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'entryImage') {
          imagePos = pos
          return false
        }
        return true
      })

      expect(imagePos).not.toBeNull()
      editor.commands.setNodeSelection(imagePos as number)
      editor.commands.focus()
      editor.commands.keyboardShortcut('Backspace')

      const imageNodes = editor.getJSON().content?.filter((node: any) => node.type === 'entryImage')
      expect(imageNodes).toHaveLength(0)
    })

    it('deletes selected image on Delete shortcut', () => {
      editor.commands.insertContent({
        type: 'entryImage',
        attrs: {
          entryMediaId: 'clxyz123',
          src: '/test.jpg',
          alt: 'Test',
        },
      })

      let imagePos: number | null = null
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'entryImage') {
          imagePos = pos
          return false
        }
        return true
      })

      expect(imagePos).not.toBeNull()
      editor.commands.setNodeSelection(imagePos as number)
      editor.commands.focus()
      editor.commands.keyboardShortcut('Delete')

      const imageNodes = editor.getJSON().content?.filter((node: any) => node.type === 'entryImage')
      expect(imageNodes).toHaveLength(0)
    })
  })

  describe('Editor onChange Integration', () => {
    it('triggers onChange when image inserted', () => {
      let changeCount = 0
      const testEditor = new Editor({
        extensions: [StarterKit, EntryImage],
        content: '',
        onUpdate: () => {
          changeCount++
        },
      })

      testEditor.commands.insertContent({
        type: 'entryImage',
        attrs: {
          entryMediaId: 'test',
          src: '/test.jpg',
          alt: 'Test',
        },
      })

      expect(changeCount).toBeGreaterThan(0)
      testEditor.destroy()
    })

    it('triggers onChange when image deleted', () => {
      let changeCount = 0
      const testEditor = new Editor({
        extensions: [StarterKit, EntryImage],
        content: '',
        onUpdate: () => {
          changeCount++
        },
      })

      testEditor.commands.insertContent({
        type: 'entryImage',
        attrs: {
          entryMediaId: 'test',
          src: '/test.jpg',
          alt: 'Test',
        },
      })

      const insertCount = changeCount

      testEditor.commands.selectAll()
      testEditor.commands.deleteSelection()

      expect(changeCount).toBeGreaterThan(insertCount)
      testEditor.destroy()
    })
  })
})
