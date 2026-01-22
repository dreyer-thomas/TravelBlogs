type EntryLocation = {
  countryCode?: string | null;
};

type TripEntry = {
  createdAt: string;
  location?: EntryLocation | null;
};

const normalizeCountryCode = (code: string) => code.trim().toUpperCase();

const isValidCountryCode = (code: string) => /^[A-Z]{2}$/.test(code);

const getEntryTime = (createdAt: string) => {
  const timestamp = new Date(createdAt).getTime();
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
};

export const getTripCountries = (entries: TripEntry[]): string[] => {
  const seen = new Set<string>();
  const orderedEntries = [...entries].sort(
    (left, right) => getEntryTime(left.createdAt) - getEntryTime(right.createdAt),
  );

  return orderedEntries.reduce<string[]>((countries, entry) => {
    const rawCode = entry.location?.countryCode;
    if (!rawCode) {
      return countries;
    }
    const normalized = normalizeCountryCode(rawCode);
    if (!isValidCountryCode(normalized) || seen.has(normalized)) {
      return countries;
    }
    seen.add(normalized);
    countries.push(normalized);
    return countries;
  }, []);
};
