import type { EntryLocation } from "./entry-location";
import { findInlineImageAlt } from "./entry-content";

export type EntryApiMedia = {
  id: string;
  url: string;
  createdAt?: string;
};

export type EntryApiData = {
  id: string;
  tripId: string;
  title: string;
  text: string;
  createdAt: string;
  coverImageUrl?: string | null;
  media: EntryApiMedia[];
  location?: EntryLocation | null;
  navigation?: EntryApiNavigation;
};

export type EntryApiNavigation = {
  previousEntryId: string | null;
  nextEntryId: string | null;
  previousEntryTitle?: string | null;
  nextEntryTitle?: string | null;
  previousEntryDate?: string | null;
  nextEntryDate?: string | null;
};

export type EntryReaderNavigation = {
  previousEntryId: string | null;
  nextEntryId: string | null;
  previousEntryTitle: string | null;
  nextEntryTitle: string | null;
  previousEntryDate: string | null;
  nextEntryDate: string | null;
};

export type EntryReaderMedia = {
  id: string;
  url: string;
  type: "image" | "video" | null;
  width: number | null;
  height: number | null;
  alt: string | null;
};

export type EntryReaderData = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  media: EntryReaderMedia[];
  location?: EntryLocation | null;
  navigation?: EntryReaderNavigation;
};

const imageExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);
const videoExtensions = new Set(["mp4", "webm", "mov", "m4v"]);

const inferMediaType = (url: string): "image" | "video" | null => {
  const extension = url.split(".").pop()?.toLowerCase();
  if (!extension) {
    return null;
  }
  if (imageExtensions.has(extension)) {
    return "image";
  }
  if (videoExtensions.has(extension)) {
    return "video";
  }
  return null;
};

export const mapEntryToReader = (entry: EntryApiData): EntryReaderData => {
  const coverUrl = entry.coverImageUrl?.trim();
  const coverItem = coverUrl
    ? entry.media.find((item) => item.url === coverUrl)
    : undefined;
  const remainingMedia = entry.media.filter(
    (item) => item.url !== coverUrl,
  );
  const orderedMedia = coverUrl
    ? [
        {
          id: coverItem?.id ?? `cover-${entry.id}`,
          url: coverUrl,
          createdAt: coverItem?.createdAt,
        },
        ...remainingMedia,
      ]
    : entry.media;

  return {
    id: entry.id,
    title: entry.title,
    body: entry.text,
    createdAt: entry.createdAt,
    media: orderedMedia.map((item) => ({
      id: item.id,
      url: item.url,
      type: inferMediaType(item.url),
      width: null,
      height: null,
      alt: findInlineImageAlt(entry.text, item.url),
    })),
    location: entry.location ?? null,
    navigation: {
      previousEntryId: entry.navigation?.previousEntryId ?? null,
      nextEntryId: entry.navigation?.nextEntryId ?? null,
      previousEntryTitle: entry.navigation?.previousEntryTitle ?? null,
      nextEntryTitle: entry.navigation?.nextEntryTitle ?? null,
      previousEntryDate: entry.navigation?.previousEntryDate ?? null,
      nextEntryDate: entry.navigation?.nextEntryDate ?? null,
    },
  };
};
