"use client";

import Link from "next/link";
import { useTranslation } from "../../utils/use-translation";

const TripsRestorePageHeader = () => {
  const { t } = useTranslation();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold text-[#2D2A26]">
          {t("admin.restoreTrips")}
        </h1>
        <p className="mt-2 text-sm text-[#6B635B]">
          {t("admin.restoreTripsDescription")}
        </p>
      </div>
      <Link
        href="/trips"
        className="rounded-xl border border-[#1F6F78]/30 px-4 py-2 text-sm font-semibold text-[#1F6F78] transition hover:bg-[#1F6F78]/10"
      >
        {t("trips.backToTrips")}
      </Link>
    </header>
  );
};

export default TripsRestorePageHeader;
