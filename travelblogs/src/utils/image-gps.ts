/**
 * GPS extraction utilities for image EXIF data.
 * Used for extracting location coordinates from photo metadata.
 */

export const extractGpsFromImage = async (
  buffer: Buffer,
): Promise<{ latitude: number; longitude: number } | null> => {
  try {
    const exifr = await import("exifr");
    const gps = await exifr.gps(buffer);

    if (!gps) {
      return null;
    }

    const { latitude, longitude } = gps;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return null;
    }

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }

    return { latitude, longitude };
  } catch {
    return null;
  }
};
