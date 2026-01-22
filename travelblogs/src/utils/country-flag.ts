const REGIONAL_INDICATOR_START = 0x1f1e6;
const ASCII_A_CODE = 65;

export const countryCodeToFlag = (code: string): string | null => {
  const normalized = code.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalized)) {
    return null;
  }

  const firstCodePoint =
    REGIONAL_INDICATOR_START + (normalized.charCodeAt(0) - ASCII_A_CODE);
  const secondCodePoint =
    REGIONAL_INDICATOR_START + (normalized.charCodeAt(1) - ASCII_A_CODE);

  return String.fromCodePoint(firstCodePoint, secondCodePoint);
};

export const countryCodeToName = (
  code: string,
  locale: string,
): string | null => {
  const normalized = code.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalized)) {
    return null;
  }

  if (typeof Intl === "undefined" || !("DisplayNames" in Intl)) {
    return null;
  }

  try {
    const displayNames = new Intl.DisplayNames([locale], { type: "region" });
    return displayNames.of(normalized) ?? null;
  } catch {
    return null;
  }
};
