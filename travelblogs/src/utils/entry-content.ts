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
export const DEFAULT_INLINE_ALT = "Entry photo";

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

export const findInlineImageAlt = (text: string, url: string) => {
  INLINE_IMAGE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = INLINE_IMAGE_REGEX.exec(text)) !== null) {
    const alt = match[1];
    const matchUrl = match[2];
    if (matchUrl === url) {
      return alt.trim() ? alt : DEFAULT_INLINE_ALT;
    }
  }

  return null;
};

export const insertInlineImageAtCursor = (
  text: string,
  url: string,
  selectionStart: number,
  selectionEnd: number,
) => {
  const safeStart = Math.max(0, Math.min(selectionStart, text.length));
  const safeEnd = Math.max(safeStart, Math.min(selectionEnd, text.length));
  const before = text.slice(0, safeStart);
  const after = text.slice(safeEnd);
  const alt = findInlineImageAlt(text, url) ?? DEFAULT_INLINE_ALT;
  const snippet = `![${alt}](${url})`;
  const formattedSnippet = snippet;

  return {
    nextText: before + formattedSnippet + after,
    nextCursor: safeStart + formattedSnippet.length,
  };
};

export const removeInlineImageByUrl = (text: string, url: string) => {
  INLINE_IMAGE_REGEX.lastIndex = 0;
  return text.replace(INLINE_IMAGE_REGEX, (match, _alt, matchUrl) => {
    return matchUrl === url ? "" : match;
  });
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
