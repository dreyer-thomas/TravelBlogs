"use client";

import Link from "next/link";
import { useTranslation } from "../../utils/use-translation";

type EditTripHeaderProps = {
  tripId: string;
};

const EditTripHeader = ({ tripId }: EditTripHeaderProps) => {
  const { t } = useTranslation();

  return (
    <header className="space-y-2">
      <Link
        href={`/trips/${tripId}`}
        className="text-sm text-[#1F6F78] hover:underline"
      >
        ← {t('trips.backToTrip')}
      </Link>
      <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
        {t('trips.tripSetup')}
      </p>
      <h1 className="text-3xl font-semibold text-[#2D2A26]">
        {t('trips.editTripDetails')}
      </h1>
      <p className="text-sm text-[#6B635B]">
        {t('trips.updateBasics')}
      </p>
    </header>
  );
};

export default EditTripHeader;
