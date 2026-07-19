import { promises as fs } from "node:fs";

import { getImageMimeTypeFromUrl, resolveUploadFilePath } from "./media";

export type SharedTripSummary = {
  title: string;
  coverImageUrl?: string | null;
};

export const loadSharedTripSummary = async (
  baseUrl: string,
  token: string,
): Promise<SharedTripSummary | null> => {
  try {
    const response = await fetch(`${baseUrl}/api/trips/share/${token}`, {
      method: "GET",
      cache: "no-store",
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.error || !body?.data?.trip) {
      return null;
    }
    return body.data.trip as SharedTripSummary;
  } catch {
    return null;
  }
};

export const loadImageDataUri = async (url: string): Promise<string | null> => {
  const mimeType = getImageMimeTypeFromUrl(url);
  const filePath = resolveUploadFilePath(url);
  if (!mimeType || !filePath) {
    return null;
  }
  try {
    const buffer = await fs.readFile(filePath);
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
};

export const loadFirstAvailableImageDataUri = async (
  urls: string[],
): Promise<string | null> => {
  for (const url of urls) {
    const dataUri = await loadImageDataUri(url);
    if (dataUri) {
      return dataUri;
    }
  }
  return null;
};
