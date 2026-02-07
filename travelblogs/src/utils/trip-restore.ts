import path from 'node:path'
import { z } from 'zod'
import { APP_VERSION } from './app-version'
import { EXPORT_SCHEMA_VERSION, type ExportMeta } from './trip-export'

const dateString = z.string().datetime()
const nullableDateString = dateString.nullable()

const exportMetaSchema = z.object({
  schemaVersion: z.number(),
  tripId: z.string().min(1),
  appVersion: z.string().min(1),
  exportedAt: dateString,
  counts: z.object({
    trip: z.number(),
    entries: z.number(),
    media: z.number(),
  }),
})

const tagSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  normalizedName: z.string().min(1),
  createdAt: dateString,
})

const tripSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  startDate: dateString,
  endDate: dateString,
  coverImageUrl: z.string().nullable().optional(),
  ownerId: z.string().min(1),
  createdAt: nullableDateString,
  updatedAt: nullableDateString,
})

const tripPayloadSchema = z.object({
  trip: tripSchema,
  tags: z.array(tagSchema),
})

const mediaSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  createdAt: dateString,
})

const entrySchema = z.object({
  id: z.string().min(1),
  tripId: z.string().min(1),
  title: z.string().min(1),
  text: z.string(),
  entryDate: nullableDateString,
  coverImageUrl: z.string().nullable().optional(),
  tags: z.array(tagSchema),
  media: z.array(mediaSchema),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  locationName: z.string().nullable().optional(),
  weatherCondition: z.string().nullable().optional(),
  weatherTemperature: z.number().nullable().optional(),
  weatherIconCode: z.string().nullable().optional(),
  createdAt: nullableDateString,
  updatedAt: nullableDateString,
})

const entriesPayloadSchema = z.object({
  entries: z.array(entrySchema),
})

export type SerializedTag = z.infer<typeof tagSchema>
export type SerializedMedia = z.infer<typeof mediaSchema>
export type SerializedEntry = z.infer<typeof entrySchema>
export type SerializedTrip = z.infer<typeof tripSchema>

export type RestoreArchive = {
  meta: ExportMeta
  trip: SerializedTrip
  tags: SerializedTag[]
  entries: SerializedEntry[]
  mediaPaths: string[]
}

export type RestoreDryRunSummary = {
  tripId: string
  counts: {
    trip: number
    entries: number
    tags: number
    media: number
  }
  conflicts: {
    entries: string[]
    tags: string[]
    media: string[]
    mediaUrls: string[]
  }
}

export type RestoreValidationError = {
  code: string
  message: string
}

export type RestoreValidationResult =
  | {
      data: RestoreArchive
      summary: RestoreDryRunSummary
      error: null
    }
  | {
      data: null
      summary: null
      error: RestoreValidationError
    }

export type RestoreZipInput = {
  entries: string[]
  files: {
    meta: unknown
    trip: unknown
    entries: unknown
  }
}

const requiredZipFiles = ['meta.json', 'trip.json', 'entries.json']

const findDuplicates = (values: string[]) => {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  values.forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value)
      return
    }
    seen.add(value)
  })

  return Array.from(duplicates)
}

export const normalizeMediaPath = (value: string) => {
  if (!value || value.startsWith('/') || value.includes('\\')) {
    return null
  }
  const segments = value.split('/').filter(Boolean)
  if (segments.some((segment) => segment === '..')) {
    return null
  }
  const normalized = path.posix.normalize(value)
  if (normalized.startsWith('../') || normalized === '..') {
    return null
  }
  return normalized
}

const buildMediaPaths = (entries: string[]) => {
  const invalid: string[] = []
  const mediaPaths = entries
    .filter((name) => name.startsWith('media/') && !name.endsWith('/'))
    .map((name) => name.replace(/^media\//, ''))
    .map((name) => {
      const normalized = normalizeMediaPath(name)
      if (!normalized) {
        invalid.push(name)
        return null
      }
      return normalized
    })
    .filter((name): name is string => Boolean(name))
  return { mediaPaths, invalid }
}

const validateZipStructure = (
  entries: string[],
  mediaCount: number,
): RestoreValidationError | null => {
  for (const file of requiredZipFiles) {
    if (!entries.includes(file)) {
      return {
        code: 'MISSING_FILE',
        message: `Missing required file: ${file}.`,
      }
    }
  }

  if (mediaCount > 0) {
    const hasMediaEntries = entries.some(
      (name) => name.startsWith('media/') && !name.endsWith('/'),
    )
    if (!hasMediaEntries) {
      return {
        code: 'MISSING_MEDIA',
        message: 'Media directory is missing from the export archive.',
      }
    }
  }

  return null
}

const errorResult = (error: RestoreValidationError): RestoreValidationResult => ({
  data: null,
  summary: null,
  error,
})

const parseVersion = (value: string) => {
  const match = value.trim().match(/^[vV]?(\d+)\.(\d+)\.(\d+)/)
  if (!match) {
    return null
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  }
}

const isAppVersionCompatible = (exportedVersion: string, currentVersion: string) => {
  const exported = parseVersion(exportedVersion)
  const current = parseVersion(currentVersion)
  if (!exported || !current) {
    return false
  }
  if (exported.major !== current.major) {
    return false
  }
  return exported.minor <= current.minor
}

export const validateRestoreArchive = (
  input: RestoreZipInput,
): RestoreValidationResult => {
  const metaParsed = exportMetaSchema.safeParse(input.files.meta)
  if (!metaParsed.success) {
    return errorResult({
      code: 'INVALID_META',
      message: 'Export metadata is invalid.',
    })
  }

  const meta = metaParsed.data

  const structureError = validateZipStructure(input.entries, meta.counts.media)
  if (structureError) {
    return errorResult(structureError)
  }

  if (meta.schemaVersion !== EXPORT_SCHEMA_VERSION) {
    return errorResult({
      code: 'UNSUPPORTED_SCHEMA',
      message: 'Export schema version is not supported.',
    })
  }

  if (!isAppVersionCompatible(meta.appVersion, APP_VERSION)) {
    return errorResult({
      code: 'UNSUPPORTED_APP_VERSION',
      message: 'Export app version is not supported.',
    })
  }

  const tripParsed = tripPayloadSchema.safeParse(input.files.trip)
  if (!tripParsed.success) {
    return errorResult({
      code: 'INVALID_TRIP',
      message: 'Trip payload is invalid.',
    })
  }

  const entriesParsed = entriesPayloadSchema.safeParse(input.files.entries)
  if (!entriesParsed.success) {
    return errorResult({
      code: 'INVALID_ENTRIES',
      message: 'Entries payload is invalid.',
    })
  }

  if (tripParsed.data.trip.id !== meta.tripId) {
    return errorResult({
      code: 'TRIP_ID_MISMATCH',
      message: 'Trip ID does not match export metadata.',
    })
  }

  const entries = entriesParsed.data.entries
  const mismatchedEntry = entries.find((entry) => entry.tripId !== meta.tripId)
  if (mismatchedEntry) {
    return errorResult({
      code: 'ENTRY_TRIP_MISMATCH',
      message: 'Entry tripId does not match export metadata.',
    })
  }

  const { mediaPaths, invalid } = buildMediaPaths(input.entries)
  if (invalid.length > 0) {
    return errorResult({
      code: 'INVALID_MEDIA_PATH',
      message: 'Export archive contains invalid media paths.',
    })
  }

  const entryIds = entries.map((entry) => entry.id)
  const tagIds = tripParsed.data.tags.map((tag) => tag.id)
  const tagNames = tripParsed.data.tags.map((tag) => tag.normalizedName)
  const mediaIds = entries.flatMap((entry) => entry.media.map((media) => media.id))
  const mediaUrls = entries.flatMap((entry) => entry.media.map((media) => media.url))
  const entryTagPairs = entries.flatMap((entry) =>
    entry.tags.map((tag) => `${entry.id}:${tag.id}`),
  )
  const duplicateTagNames = findDuplicates(tagNames)
  if (duplicateTagNames.length > 0) {
    return errorResult({
      code: 'DUPLICATE_TAG_NAME',
      message: 'Duplicate tag names detected in export.',
    })
  }
  const duplicateEntryTags = findDuplicates(entryTagPairs)
  if (duplicateEntryTags.length > 0) {
    return errorResult({
      code: 'DUPLICATE_ENTRY_TAG',
      message: 'Duplicate entry tags detected in export.',
    })
  }

  const summary: RestoreDryRunSummary = {
    tripId: meta.tripId,
    counts: {
      trip: 1,
      entries: entries.length,
      tags: tripParsed.data.tags.length,
      media: mediaPaths.length,
    },
    conflicts: {
      entries: findDuplicates(entryIds),
      tags: findDuplicates(tagIds),
      media: findDuplicates(mediaIds),
      mediaUrls: findDuplicates(mediaUrls),
    },
  }

  return {
    data: {
      meta,
      trip: tripParsed.data.trip,
      tags: tripParsed.data.tags,
      entries,
      mediaPaths,
    },
    summary,
    error: null,
  }
}
