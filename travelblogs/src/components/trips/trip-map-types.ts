import type { EntryLocation } from "../../utils/entry-location";

export type TripMapLocation = {
  entryId: string;
  title: string;
  location: EntryLocation;
  createdAt?: string;
};
