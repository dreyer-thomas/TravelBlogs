"use client";

import { useTranslation } from "../../utils/use-translation";

const NewTripHeader = () => {
  const { t } = useTranslation();

  return (
    <header className="space-y-2">
      <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
        {t('trips.tripSetup')}
      </p>
      <h1 className="text-3xl font-semibold text-[#2D2A26]">
        {t('trips.createNewTrip')}
      </h1>
      <p className="text-sm text-[#6B635B]">
        {t('trips.addCoreDetails')}
      </p>
    </header>
  );
};

export default NewTripHeader;
