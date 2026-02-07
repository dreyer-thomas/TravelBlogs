"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../utils/use-translation";

export type TripExportItem = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  ownerId: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
};

type TripsExportDashboardProps = {
  trips: TripExportItem[];
  showOwner: boolean;
};

type TripExportEstimate = {
  totalBytes: number;
  jsonBytes: number;
  mediaBytes: number;
  mediaCount: number;
};

type EstimateState = {
  status: "idle" | "loading" | "ready" | "error";
  estimate?: TripExportEstimate | null;
};

type ExportState = {
  status: "idle" | "preparing" | "downloading" | "complete" | "error";
  progress?: number | null;
};

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes)) {
    return "--";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const formatted =
    unitIndex === 0 ? `${Math.round(value)}` : value.toFixed(1);
  return `${formatted} ${units[unitIndex]}`;
};

const formatDateRange = (
  startDate: string,
  endDate: string,
  formatDate: (value: Date) => string,
) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startDate} – ${endDate}`;
  }

  return `${formatDate(start)} – ${formatDate(end)}`;
};

const getOwnerLabel = (trip: TripExportItem) => {
  if (trip.ownerName && trip.ownerEmail) {
    return `${trip.ownerName} (${trip.ownerEmail})`;
  }
  if (trip.ownerName) {
    return trip.ownerName;
  }
  if (trip.ownerEmail) {
    return trip.ownerEmail;
  }
  return trip.ownerId;
};

const TripsExportDashboard = ({ trips, showOwner }: TripsExportDashboardProps) => {
  const { t, formatDate } = useTranslation();
  const [estimateByTrip, setEstimateByTrip] = useState<Record<string, EstimateState>>(
    {},
  );
  const [exportByTrip, setExportByTrip] = useState<Record<string, ExportState>>({});
  const estimateAbortControllers = useRef<Record<string, AbortController>>({});

  useEffect(() => {
    if (trips.length === 0) {
      return;
    }
    let isActive = true;
    Object.values(estimateAbortControllers.current).forEach((controller) =>
      controller.abort(),
    );
    estimateAbortControllers.current = {};

    setEstimateByTrip((prev) => {
      const next = { ...prev };
      trips.forEach((trip) => {
        const current = next[trip.id];
        if (!current || current.status === "error") {
          next[trip.id] = { status: "loading" };
        }
      });
      return next;
    });

    const loadEstimates = async () => {
      await Promise.all(
        trips.map(async (trip) => {
          const controller = new AbortController();
          estimateAbortControllers.current[trip.id] = controller;
          try {
            const response = await fetch(
              `/api/trips/${trip.id}/export?estimate=true`,
              { signal: controller.signal },
            );
            const body = await response.json();
            if (!response.ok || body.error) {
              throw new Error(body.error?.message ?? "Estimate failed.");
            }
            if (!isActive) {
              return;
            }
            setEstimateByTrip((prev) => ({
              ...prev,
              [trip.id]: {
                status: "ready",
                estimate: body.data?.estimate ?? null,
              },
            }));
          } catch (error) {
            if (!isActive) {
              return;
            }
            if (error instanceof DOMException && error.name === "AbortError") {
              return;
            }
            setEstimateByTrip((prev) => ({
              ...prev,
              [trip.id]: { status: "error" },
            }));
          }
        }),
      );
    };

    void loadEstimates();

    return () => {
      isActive = false;
      Object.values(estimateAbortControllers.current).forEach((controller) =>
        controller.abort(),
      );
    };
  }, [trips]);

  const getDownloadFilename = (response: Response, fallback: string) => {
    const header = response.headers.get("content-disposition");
    if (!header) {
      return fallback;
    }
    const match = header.match(/filename="?([^\";]+)"?/i);
    return match?.[1] ?? fallback;
  };

  const startExport = async (trip: TripExportItem) => {
    setExportByTrip((prev) => ({
      ...prev,
      [trip.id]: { status: "preparing", progress: 0 },
    }));

    try {
      const response = await fetch(`/api/trips/${trip.id}/export`);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Export failed.");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Export stream unavailable.");
      }

      const estimate = estimateByTrip[trip.id]?.estimate;
      const totalBytes = estimate?.totalBytes ?? null;
      let receivedBytes = 0;
      const chunks: Uint8Array[] = [];

      setExportByTrip((prev) => ({
        ...prev,
        [trip.id]: { status: "downloading", progress: 0 },
      }));

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        if (value) {
          chunks.push(value);
          receivedBytes += value.length;
          const progressValue = totalBytes
            ? Math.min(99, Math.round((receivedBytes / totalBytes) * 100))
            : null;
          setExportByTrip((prev) => ({
            ...prev,
            [trip.id]: {
              status: "downloading",
              progress: progressValue,
            },
          }));
        }
      }

      const blob = new Blob(chunks as BlobPart[], {
        type: "application/zip",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getDownloadFilename(
        response,
        `trip-${trip.id}.zip`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setExportByTrip((prev) => ({
        ...prev,
        [trip.id]: { status: "complete", progress: 100 },
      }));
    } catch {
      setExportByTrip((prev) => ({
        ...prev,
        [trip.id]: { status: "error", progress: null },
      }));
    }
  };

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6">
      <div className="space-y-4">
        {trips.length === 0 ? (
          <p className="text-sm text-[#6B635B]">{t("admin.noTripsToExport")}</p>
        ) : (
          trips.map((trip) => (
            <article
              key={trip.id}
              className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4 last:border-b-0 last:pb-0"
            >
              <div>
                <h2 className="text-base font-semibold text-[#2D2A26]">
                  {trip.title}
                </h2>
                <p className="mt-1 text-sm text-[#6B635B]">
                  {formatDateRange(trip.startDate, trip.endDate, formatDate)}
                </p>
                {showOwner ? (
                  <p className="mt-1 text-xs text-[#8A8178]">
                    {t("admin.tripOwnerId")} {getOwnerLabel(trip)}
                  </p>
                ) : null}
                {estimateByTrip[trip.id]?.status === "loading" ? (
                  <p className="mt-1 text-xs text-[#8A8178]">
                    {t("admin.exportTripEstimateLoading")}
                  </p>
                ) : null}
                {estimateByTrip[trip.id]?.status === "ready" &&
                estimateByTrip[trip.id]?.estimate ? (
                  <p className="mt-1 text-xs text-[#8A8178]">
                    {t("admin.exportTripEstimate")}{" "}
                    {formatBytes(estimateByTrip[trip.id]?.estimate?.totalBytes ?? 0)}
                  </p>
                ) : null}
                {estimateByTrip[trip.id]?.status === "error" ? (
                  <p className="mt-1 text-xs text-[#8A8178]">
                    {t("admin.exportTripEstimateUnavailable")}
                  </p>
                ) : null}
                {exportByTrip[trip.id]?.status === "preparing" ? (
                  <p className="mt-2 text-xs text-[#8A8178]">
                    {t("admin.exportTripPreparing")}
                  </p>
                ) : null}
                {exportByTrip[trip.id]?.status === "downloading" ? (
                  <div className="mt-2 space-y-1">
                    <div
                      className="h-1.5 w-40 overflow-hidden rounded-full bg-black/10"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={
                        typeof exportByTrip[trip.id]?.progress === "number"
                          ? exportByTrip[trip.id]?.progress ?? 0
                          : undefined
                      }
                      aria-valuetext={
                        typeof exportByTrip[trip.id]?.progress === "number"
                          ? `${exportByTrip[trip.id]?.progress}%`
                          : t("admin.exportTripDownloading")
                      }
                    >
                      <div
                        className={`h-1.5 rounded-full bg-[#1F6F78] transition-all ${
                          typeof exportByTrip[trip.id]?.progress === "number"
                            ? ""
                            : "animate-pulse"
                        }`}
                        style={{
                          width: `${
                            typeof exportByTrip[trip.id]?.progress === "number"
                              ? exportByTrip[trip.id]?.progress ?? 0
                              : 100
                          }%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-[#8A8178]">
                      {t("admin.exportTripDownloading")}
                      {typeof exportByTrip[trip.id]?.progress === "number"
                        ? ` ${exportByTrip[trip.id]?.progress}%`
                        : ""}
                    </p>
                  </div>
                ) : null}
                {exportByTrip[trip.id]?.status === "complete" ? (
                  <p className="mt-2 text-xs text-[#2F6B4E]">
                    {t("admin.exportTripComplete")}
                  </p>
                ) : null}
                {exportByTrip[trip.id]?.status === "error" ? (
                  <p className="mt-2 text-xs text-[#B34A3C]">
                    {t("admin.exportTripFailed")}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => startExport(trip)}
                disabled={
                  exportByTrip[trip.id]?.status === "preparing" ||
                  exportByTrip[trip.id]?.status === "downloading"
                }
                className="inline-flex rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F6F78]/40 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {exportByTrip[trip.id]?.status === "preparing"
                  ? t("admin.exportTripPreparing")
                  : exportByTrip[trip.id]?.status === "downloading"
                    ? t("admin.exportTripDownloading")
                    : t("admin.exportTrip")}
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
};

export default TripsExportDashboard;
