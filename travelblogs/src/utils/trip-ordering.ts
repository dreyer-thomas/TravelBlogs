export const tripOrderBy = [
  { startDate: "desc" },
  { title: "asc" },
  { id: "desc" },
] as const;

export const tripAccessOrderBy = tripOrderBy.map((order) => ({
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
  const titleDiff = a.title.localeCompare(b.title, "en");
  if (titleDiff !== 0) {
    return titleDiff;
  }
  return b.id.localeCompare(a.id);
};
