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
