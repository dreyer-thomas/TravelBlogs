"use client";

import { useTranslation } from "../../utils/use-translation";

type SharedTripErrorProps = {
  message?: string;
  type?: "host" | "load";
};

const SharedTripError = ({ message, type }: SharedTripErrorProps) => {
  const { t } = useTranslation();

  const defaultMessage = type === "host"
    ? t('trips.unableDetermineHost')
    : t('trips.unableLoadTrip');

  return (
    <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
      <main className="mx-auto w-full max-w-3xl">
        <section className="rounded-2xl border border-black/10 bg-white p-8 text-center">
          <p className="text-sm text-[#B34A3C]">
            {message ?? defaultMessage}
          </p>
        </section>
      </main>
    </div>
  );
};

export default SharedTripError;
