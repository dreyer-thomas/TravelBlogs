"use client";

import { useTranslation } from "../../../../../../utils/use-translation";

const SharedEntryNotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
      <main className="mx-auto w-full max-w-3xl">
        <section className="rounded-2xl border border-black/10 bg-white p-8 text-center">
          <p className="text-sm text-[#B34A3C]">
            {t('trips.shareLinkNoLongerValid')}
          </p>
        </section>
      </main>
    </div>
  );
};

export default SharedEntryNotFound;
