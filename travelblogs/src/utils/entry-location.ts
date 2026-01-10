/**
 * Entry location type definitions and helper functions for filtering
 * entries that have valid GPS coordinates.
 */

export type EntryLocation = {
  latitude: number;
  longitude: number;
  label?: string | null;
};

export type EntryWithLocation = {
  id: string;
  tripId: string;
  title: string;
  createdAt: string;
  location?: EntryLocation | null;
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
