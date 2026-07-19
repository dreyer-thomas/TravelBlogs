import type { Prisma } from "@prisma/client";

// Kept for the two-query trips list endpoint (world-map route selects trip
// fields via TripAccess.trip and needs the relation-shaped variant). Final
// response ordering for every role/surface is always produced by
// `compareTripsByStartDate` below, not by these Prisma `orderBy` clauses, so
// that all trip lists share identical (locale-aware) tie-break semantics
// regardless of the underlying DB's collation.
export const tripOrderBy: Prisma.TripOrderByWithRelationInput[] = [
  { startDate: "desc" },
  { title: "asc" },
  { id: "desc" },
];

export const tripAccessOrderBy: Prisma.TripAccessOrderByWithRelationInput[] =
  tripOrderBy.map((order) => ({
    trip: order,
  }));

type TripOrderable = {
  id: string;
  title: string;
  startDate: Date;
};

export const compareTripsByStartDate = (a: TripOrderable, b: TripOrderable) => {
  const startDateDiff = b.startDate.getTime() - a.startDate.getTime();
  if (startDateDiff !== 0) {
    return startDateDiff;
  }
  const titleDiff = a.title.localeCompare(b.title, "en", { sensitivity: "base" });
  if (titleDiff !== 0) {
    return titleDiff;
  }
  // `id` (cuid) is roughly time-ordered, so descending approximates
  // newest-first for the rare case where startDate and title also tie.
  // Do not "simplify" this to ascending — it would silently change the
  // final tie-break order at every call site that uses this comparator.
  return b.id.localeCompare(a.id);
};
