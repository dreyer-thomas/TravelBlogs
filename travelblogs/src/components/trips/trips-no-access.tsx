"use client";

import { useTranslation } from "../../utils/use-translation";

const TripsNoAccess = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
      <main className="mx-auto w-full max-w-4xl space-y-8">
        <header>
          <h1 className="text-3xl font-semibold text-[#2D2A26]">
            {t('common.trips')}
          </h1>
          <p className="mt-2 text-sm text-[#6B635B]">
            {t('trips.noAccess')}
          </p>
        </header>
        <section className="rounded-2xl border border-black/10 bg-white p-8 text-center">
          <p className="text-sm text-[#B34A3C]">
            {t('trips.accessRestricted')}
          </p>
        </section>
      </main>
    </div>
  );
};

export default TripsNoAccess;
