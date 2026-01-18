// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { EntryVideo } from '../../src/utils/tiptap-entry-video-extension'

describe('EntryVideo extension', () => {
  it('creates a node with correct name', () => {
    expect(EntryVideo.name).toBe('entryVideo')
  })

  it('is configured as block-level atomic node', () => {
    expect(EntryVideo.config.group).toBe('block')
    expect(EntryVideo.config.atom).toBe(true)
  })

  it('is draggable', () => {
    expect(EntryVideo.config.draggable).toBe(true)
  })
})
