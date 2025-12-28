"use client";

import { useRouter } from "next/navigation";

import CreateEntryForm from "./create-entry-form";

type CreateEntryFormWrapperProps = {
  tripId: string;
};

const CreateEntryFormWrapper = ({ tripId }: CreateEntryFormWrapperProps) => {
  const router = useRouter();

  return (
    <CreateEntryForm
      tripId={tripId}
      onEntryCreated={(entry: { id: string; tripId: string }) => {
        router.push(`/trips/${entry.tripId}/entries/${entry.id}`);
        router.refresh();
      }}
    />
  );
};

export default CreateEntryFormWrapper;
