import path from "node:path";
import { APP_VERSION } from "./app-version";

export const EXPORT_SCHEMA_VERSION = 1;

const toIso = (value: Date | string | null | undefined) => {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  return value.toISOString();
};

export type ExportMeta = {
  schemaVersion: number;
  tripId: string;
  appVersion: string;
  exportedAt: string;
  counts: {
    trip: number;
    entries: number;
    media: number;
  };
};

export const buildExportMeta = (input: {
  tripId: string;
  entryCount: number;
  mediaCount: number;
  exportedAt?: Date;
}): ExportMeta => {
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    tripId: input.tripId,
    appVersion: APP_VERSION,
    exportedAt: (input.exportedAt ?? new Date()).toISOString(),
    counts: {
      trip: 1,
      entries: input.entryCount,
      media: input.mediaCount,
    },
  };
};

export const resolveUploadRoot = () => {
  const configured = process.env.MEDIA_UPLOAD_DIR?.trim();
  if (configured) {
    return configured;
  }
  return path.join(process.cwd(), "public", "uploads");
};

export type SerializedTrip = {
  id: string;
  title: string;
  description?: string | null;
  startDate: string | null;
  endDate: string | null;
  coverImageUrl?: string | null;
  ownerId: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export const serializeTrip = (trip: {
  id: string;
  title: string;
  description?: string | null;
  startDate: Date;
  endDate: Date;
  coverImageUrl?: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}): SerializedTrip => {
  return {
    id: trip.id,
    title: trip.title,
    description: trip.description ?? null,
    startDate: toIso(trip.startDate),
    endDate: toIso(trip.endDate),
    coverImageUrl: trip.coverImageUrl ?? null,
    ownerId: trip.ownerId,
    createdAt: toIso(trip.createdAt),
    updatedAt: toIso(trip.updatedAt),
  };
};

export type SerializedEntry = {
  id: string;
  tripId: string;
  title: string;
  text: string;
  entryDate: string | null;
  coverImageUrl?: string | null;
  tags?: string[];
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
  weatherCondition?: string | null;
  weatherTemperature?: number | null;
  weatherIconCode?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const serializeEntry = (entry: {
  id: string;
  tripId: string;
  title: string;
  text: string;
  entryDate: Date;
  coverImageUrl?: string | null;
  tags?: string[];
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
  weatherIcon?: string | null;
  weatherCondition?: string | null;
  weatherTemperature?: number | null;
  weatherIconCode?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SerializedEntry => {
  return {
    id: entry.id,
    tripId: entry.tripId,
    title: entry.title,
    text: entry.text,
    entryDate: toIso(entry.entryDate),
    coverImageUrl: entry.coverImageUrl ?? null,
    tags: entry.tags ?? [],
    latitude: entry.latitude ?? null,
    longitude: entry.longitude ?? null,
    locationName: entry.locationName ?? null,
    weatherCondition: entry.weatherCondition ?? null,
    weatherTemperature: entry.weatherTemperature ?? null,
    weatherIconCode: entry.weatherIconCode ?? null,
    createdAt: toIso(entry.createdAt),
    updatedAt: toIso(entry.updatedAt),
  };
};

export const serializeEntries = (entries: Array<Parameters<typeof serializeEntry>[0]>) => {
  return entries.map((entry) => serializeEntry(entry));
};
