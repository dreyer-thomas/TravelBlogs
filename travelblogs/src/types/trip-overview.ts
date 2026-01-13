import type { EntryLocation } from "../utils/entry-location";

export type TripOverviewTrip = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string | null;
};

export type TripOverviewEntry = {
  id: string;
  tripId: string;
  title: string;
  createdAt: string;
  coverImageUrl: string | null;
  tags: string[];
  media: { url: string }[];
  location?: EntryLocation | null;
};
