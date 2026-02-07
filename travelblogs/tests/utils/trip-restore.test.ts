import { describe, it, expect } from 'vitest'
import {
  validateRestoreArchive,
  type RestoreZipInput,
} from '@/utils/trip-restore'
import packageJson from '../../package.json'

const baseMeta = {
  schemaVersion: 1,
  tripId: 'trip-1',
  appVersion: packageJson.version,
  exportedAt: '2025-01-01T00:00:00.000Z',
  counts: {
    trip: 1,
    entries: 2,
    media: 2,
  },
}

const baseTrip = {
  trip: {
    id: 'trip-1',
    title: 'Trip Title',
    description: null,
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2025-01-02T00:00:00.000Z',
    coverImageUrl: '/uploads/trips/cover.jpg',
    ownerId: 'creator',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
  },
  tags: [
    {
      id: 'tag-1',
      name: 'Beach',
      normalizedName: 'beach',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
  ],
}

const baseEntries = {
  entries: [
    {
      id: 'entry-1',
      tripId: 'trip-1',
      title: 'Entry One',
      text: 'Hello',
      entryDate: '2025-01-01T00:00:00.000Z',
      coverImageUrl: '/uploads/entries/cover.jpg',
      tags: [
        {
          id: 'tag-1',
          name: 'Beach',
          normalizedName: 'beach',
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      media: [
        {
          id: 'media-1',
          url: '/uploads/entries/photo.jpg',
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      latitude: null,
      longitude: null,
      locationName: null,
      weatherCondition: null,
      weatherTemperature: null,
      weatherIconCode: null,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
    },
    {
      id: 'entry-2',
      tripId: 'trip-1',
      title: 'Entry Two',
      text: 'Hello again',
      entryDate: '2025-01-02T00:00:00.000Z',
      coverImageUrl: null,
      tags: [],
      media: [
        {
          id: 'media-2',
          url: '/uploads/entries/photo-2.jpg',
          createdAt: '2025-01-02T00:00:00.000Z',
        },
      ],
      latitude: null,
      longitude: null,
      locationName: null,
      weatherCondition: null,
      weatherTemperature: null,
      weatherIconCode: null,
      createdAt: '2025-01-02T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
    },
  ],
}

const makeInput = (overrides: Partial<RestoreZipInput> = {}): RestoreZipInput => ({
  entries: [
    'meta.json',
    'trip.json',
    'entries.json',
    'media/entries/photo.jpg',
    'media/entries/photo-2.jpg',
    'media/entries/cover.jpg',
    'media/trips/cover.jpg',
  ],
  files: {
    meta: baseMeta,
    trip: baseTrip,
    entries: baseEntries,
  },
  ...overrides,
})

describe('validateRestoreArchive', () => {
  it('fails when required files are missing', () => {
    const result = validateRestoreArchive(
      makeInput({ entries: ['trip.json', 'entries.json'] }),
    )

    expect(result.error?.code).toBe('MISSING_FILE')
  })

  it('fails when schema version is unsupported', () => {
    const result = validateRestoreArchive(
      makeInput({
        files: {
          meta: { ...baseMeta, schemaVersion: 999 },
          trip: baseTrip,
          entries: baseEntries,
        },
      }),
    )

    expect(result.error?.code).toBe('UNSUPPORTED_SCHEMA')
  })

  it('fails when app version is unsupported', () => {
    const result = validateRestoreArchive(
      makeInput({
        files: {
          meta: { ...baseMeta, appVersion: '99.0.0' },
          trip: baseTrip,
          entries: baseEntries,
        },
      }),
    )

    expect(result.error?.code).toBe('UNSUPPORTED_APP_VERSION')
  })

  it('accepts prerelease app versions with matching major/minor', () => {
    const result = validateRestoreArchive(
      makeInput({
        files: {
          meta: { ...baseMeta, appVersion: `v${packageJson.version}-beta.1` },
          trip: baseTrip,
          entries: baseEntries,
        },
      }),
    )

    expect(result.error).toBeNull()
  })

  it('fails when trip JSON is invalid', () => {
    const result = validateRestoreArchive(
      makeInput({
        files: {
          meta: baseMeta,
          trip: { tags: [] },
          entries: baseEntries,
        },
      }),
    )

    expect(result.error?.code).toBe('INVALID_TRIP')
  })

  it('builds a dry-run summary with conflicts', () => {
    const result = validateRestoreArchive(
      makeInput({
        files: {
          meta: baseMeta,
          trip: baseTrip,
          entries: {
            entries: [
              baseEntries.entries[0],
              {
                ...baseEntries.entries[1],
                id: 'entry-1',
                media: [
                  {
                    id: 'media-1',
                    url: '/uploads/entries/photo.jpg',
                    createdAt: '2025-01-03T00:00:00.000Z',
                  },
                ],
              },
            ],
          },
        },
      }),
    )

    expect(result.error).toBeNull()
    expect(result.summary?.counts).toEqual({
      trip: 1,
      entries: 2,
      tags: 1,
      media: 4,
    })
    expect(result.summary?.conflicts.entries).toEqual(['entry-1'])
    expect(result.summary?.conflicts.media).toEqual(['media-1'])
    expect(result.summary?.conflicts.mediaUrls).toEqual([
      '/uploads/entries/photo.jpg',
    ])
  })

  it('rejects invalid media paths', () => {
    const result = validateRestoreArchive(
      makeInput({
        entries: [
          'meta.json',
          'trip.json',
          'entries.json',
          'media/../evil.txt',
        ],
      }),
    )

    expect(result.error?.code).toBe('INVALID_MEDIA_PATH')
  })

  it('rejects duplicate normalized tag names', () => {
    const result = validateRestoreArchive(
      makeInput({
        files: {
          meta: baseMeta,
          trip: {
            ...baseTrip,
            tags: [
              baseTrip.tags[0],
              { ...baseTrip.tags[0], id: 'tag-2' },
            ],
          },
          entries: baseEntries,
        },
      }),
    )

    expect(result.error?.code).toBe('DUPLICATE_TAG_NAME')
  })

  it('rejects duplicate entry tag pairs', () => {
    const result = validateRestoreArchive(
      makeInput({
        files: {
          meta: baseMeta,
          trip: baseTrip,
          entries: {
            entries: [
              {
                ...baseEntries.entries[0],
                tags: [baseTrip.tags[0], baseTrip.tags[0]],
              },
            ],
          },
        },
      }),
    )

    expect(result.error?.code).toBe('DUPLICATE_ENTRY_TAG')
  })
})
