export type EntryContentBlock =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "image";
      url: string;
      alt: string;
    };

const INLINE_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
const URL_TIMESTAMP_REGEX = /-(\d{10,})-/;

export const parseEntryContent = (text: string): EntryContentBlock[] => {
  const blocks: EntryContentBlock[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  INLINE_IMAGE_REGEX.lastIndex = 0;
  while ((match = INLINE_IMAGE_REGEX.exec(text)) !== null) {
    const [fullMatch, alt, url] = match;
    if (match.index > lastIndex) {
      blocks.push({
        type: "text",
        value: text.slice(lastIndex, match.index),
      });
    }

    blocks.push({
      type: "image",
      url,
      alt: alt || "Entry photo",
    });

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    blocks.push({
      type: "text",
      value: text.slice(lastIndex),
    });
  }

  return blocks;
};

export const extractInlineImageUrls = (text: string) => {
  return parseEntryContent(text)
    .filter((block) => block.type === "image")
    .map((block) => block.url);
};

export const stripInlineImages = (text: string) => {
  INLINE_IMAGE_REGEX.lastIndex = 0;
  return text.replace(INLINE_IMAGE_REGEX, "").trim();
};

export const getPhotoTimestamp = (url: string, fallback?: string) => {
  const match = url.match(URL_TIMESTAMP_REGEX);
  if (match) {
    const timestamp = Number(match[1]);
    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
  }

  if (fallback) {
    const parsed = Date.parse(fallback);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return 0;
};
