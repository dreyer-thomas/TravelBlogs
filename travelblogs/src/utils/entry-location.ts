/**
 * Entry location type definitions and helper functions for filtering
 * entries that have valid GPS coordinates.
 */

export type EntryLocation = {
  latitude: number;
  longitude: number;
  label?: string | null;
  countryCode?: string | null;
};

export type EntryWithLocation = {
  id: string;
  tripId: string;
  title: string;
  createdAt: string;
  location?: EntryLocation | null;
};

export const formatEntryLocationDisplay = (
  location?: EntryLocation | null,
): string | null => {
  if (!location) {
    return null;
  }
  const label = location.label?.trim();
  if (label) {
    return label;
  }
  if (
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude)
  ) {
    return null;
  }
  return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
};

export const hasEntryLocation = (entry: EntryWithLocation): boolean => {
  const location = entry.location;
  if (!location) {
    return false;
  }
  return (
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude)
  );
};

export const filterEntriesWithLocation = (
  entries: EntryWithLocation[],
): EntryWithLocation[] => entries.filter(hasEntryLocation);

// Re-export GPS extraction from image-gps module for backward compatibility
export { extractGpsFromImage } from "./image-gps";
