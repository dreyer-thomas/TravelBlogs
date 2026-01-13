/**
 * Sort tag names in consistent alphabetical order.
 * Uses case-insensitive ASCII comparison for predictable cross-locale behavior.
 */
export const sortTagNames = (tags: string[]): string[] => {
  return tags.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
};
