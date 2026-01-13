import { sortTagNames } from "./tag-sort";

export const tagMaxLength = 40;

export const normalizeTagName = (value: string) => value.trim().toLowerCase();

export const buildTagInputs = (tags: string[]) =>
  tags.map((tag) => {
    const name = tag.trim();
    return {
      name,
      normalizedName: normalizeTagName(name),
    };
  });

export const getDistinctTagList = (entries: Array<{ tags: string[] }>) => {
  const normalizedToTag = new Map<string, string>();

  entries.forEach((entry) => {
    entry.tags.forEach((tag) => {
      const trimmed = tag.trim();
      if (!trimmed) {
        return;
      }
      const normalized = normalizeTagName(trimmed);
      if (!normalizedToTag.has(normalized)) {
        normalizedToTag.set(normalized, trimmed);
      }
    });
  });

  return sortTagNames(Array.from(normalizedToTag.values()));
};
