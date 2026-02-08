"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "../../utils/use-translation";
import type { RestoreDryRunSummary } from "../../utils/trip-restore";

type RestoreStage =
  | "idle"
  | "uploading"
  | "validating"
  | "restoring"
  | "complete"
  | "error";

const TripsRestoreDashboard = () => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<RestoreDryRunSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [restoreStage, setRestoreStage] = useState<RestoreStage>("idle");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [activeAction, setActiveAction] = useState<"validate" | "restore" | null>(
    null,
  );
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const hasWarnings = useMemo(() => {
    if (!summary) {
      return false;
    }
    const conflicts = summary.conflicts;
    return (
      conflicts.entries.length > 0 ||
      conflicts.tags.length > 0 ||
      conflicts.media.length > 0 ||
      conflicts.mediaUrls.length > 0
    );
  }, [summary]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setSummary(null);
    setError(null);
    setSuccessMessage(null);
    setRestoreStage("idle");
    setUploadProgress(null);
    setActiveAction(null);
  };

  const postRestore = (
    formData: FormData,
    onUploadComplete: () => void,
  ) =>
    new Promise<{ status: number; body: any }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open("POST", "/api/trips/restore");
      xhr.timeout = 10 * 60 * 1000;
      xhr.responseType = "json";
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) {
          return;
        }
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      };
      xhr.upload.onloadend = () => {
        onUploadComplete();
      };
      xhr.onload = () => {
        let response = xhr.response;
        if (!response && typeof xhr.responseText === "string" && xhr.responseText) {
          try {
            response = JSON.parse(xhr.responseText);
          } catch {
            response = null;
          }
        }
        xhrRef.current = null;
        resolve({ status: xhr.status, body: response });
      };
      xhr.onerror = () => {
        xhrRef.current = null;
        reject(new Error("Restore request failed."));
      };
      xhr.onabort = () => {
        xhrRef.current = null;
        reject(new Error("Restore request aborted."));
      };
      xhr.ontimeout = () => {
        xhrRef.current = null;
        reject(new Error("Restore request timed out."));
      };
      xhr.send(formData);
    });

  const runRestore = async (dryRun: boolean) => {
    if (!file) {
      setError(t("admin.restoreTripNoFile"));
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setRestoreStage("uploading");
    setUploadProgress(0);
    setActiveAction(dryRun ? "validate" : "restore");

    try {
      const formData = new FormData();
      formData.set("file", file);
      if (dryRun) {
        formData.set("dryRun", "true");
      }

      const onUploadComplete = () =>
        setRestoreStage(dryRun ? "validating" : "restoring");
      const { status, body } = await postRestore(formData, onUploadComplete);

      if (status >= 400 || body?.error) {
        setSummary(null);
        setError(body.error?.message ?? t("admin.restoreTripError"));
        setRestoreStage("error");
        return;
      }

      setSummary(body.data?.summary ?? null);
      if (!dryRun) {
        setSuccessMessage(t("admin.restoreTripSuccess"));
      } else {
        setSuccessMessage(t("admin.restoreTripValidationComplete"));
      }
      setRestoreStage("complete");
    } catch (err) {
      setSummary(null);
      setError(err instanceof Error ? err.message : t("admin.restoreTripError"));
      setRestoreStage("error");
    } finally {
      setUploadProgress(null);
    }
  };

  const isBusy =
    restoreStage === "uploading" ||
    restoreStage === "validating" ||
    restoreStage === "restoring";

  useEffect(() => {
    return () => {
      xhrRef.current?.abort();
      xhrRef.current = null;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-[#2D2A26]" htmlFor="trip-restore-file">
            {t("admin.restoreTripSelectFile")}
          </label>
          <input
            id="trip-restore-file"
            type="file"
            accept="application/zip,.zip"
            onChange={handleFileChange}
            className="mt-2 block w-full text-sm text-[#2D2A26]"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => runRestore(true)}
            disabled={!file || isBusy}
            className="inline-flex items-center rounded-xl border border-[#1F6F78]/30 px-4 py-2 text-sm font-semibold text-[#1F6F78] transition hover:bg-[#1F6F78]/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {activeAction === "validate" && restoreStage === "uploading"
              ? t("admin.restoreTripUploading")
              : activeAction === "validate" && restoreStage === "validating"
                ? t("admin.restoreTripValidating")
                : t("admin.restoreTripValidate")}
          </button>
          <button
            type="button"
            onClick={() => runRestore(false)}
            disabled={!file || isBusy}
            className="inline-flex items-center rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {activeAction === "restore" && restoreStage === "uploading"
              ? t("admin.restoreTripUploading")
              : activeAction === "restore" && restoreStage === "restoring"
                ? t("admin.restoreTripRestoring")
                : t("admin.restoreTripRun")}
          </button>
        </div>

        {restoreStage === "uploading" ? (
          <div className="space-y-1">
            <div
              className="h-1.5 w-40 overflow-hidden rounded-full bg-black/10"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={uploadProgress ?? 0}
              aria-valuetext={`${uploadProgress ?? 0}%`}
            >
              <div
                className="h-1.5 rounded-full bg-[#1F6F78] transition-all"
                style={{ width: `${uploadProgress ?? 0}%` }}
              />
            </div>
            <p className="text-xs text-[#8A8178]">
              {t("admin.restoreTripUploading")}
              {typeof uploadProgress === "number" ? ` ${uploadProgress}%` : ""}
            </p>
          </div>
        ) : null}
        {restoreStage === "validating" || restoreStage === "restoring" ? (
          <div className="space-y-1">
            <div
              className="h-1.5 w-40 overflow-hidden rounded-full bg-black/10"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={
                restoreStage === "validating"
                  ? t("admin.restoreTripValidating")
                  : t("admin.restoreTripRestoring")
              }
            >
              <div className="h-1.5 w-full rounded-full bg-[#1F6F78] transition-all animate-pulse" />
            </div>
            <p className="text-xs text-[#8A8178]">
              {restoreStage === "validating"
                ? t("admin.restoreTripValidating")
                : t("admin.restoreTripRestoring")}
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-[#E4B9B4] bg-[#FDF2F1] px-4 py-3 text-sm text-[#B34A3C]">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-xl border border-[#B6D4C7] bg-[#F1FAF6] px-4 py-3 text-sm text-[#2F6B4E]">
            {successMessage}
          </div>
        ) : null}

        {summary ? (
          <div className="space-y-3 rounded-xl border border-black/10 bg-[#FBF7F1] px-4 py-4">
            <div>
              <h3 className="text-sm font-semibold text-[#2D2A26]">
                {t("admin.restoreTripSummaryTitle")}
              </h3>
              <p className="text-xs text-[#6B635B]">
                {t("admin.restoreTripSummaryTripId")} {summary.tripId}
              </p>
            </div>
            <div className="grid gap-2 text-sm text-[#2D2A26] sm:grid-cols-2">
              <p>{t("admin.restoreTripSummaryTrip")}: {summary.counts.trip}</p>
              <p>{t("admin.restoreTripSummaryEntries")}: {summary.counts.entries}</p>
              <p>{t("admin.restoreTripSummaryTags")}: {summary.counts.tags}</p>
              <p>{t("admin.restoreTripSummaryMedia")}: {summary.counts.media}</p>
            </div>
            {hasWarnings ? (
              <div className="rounded-lg border border-[#E4B9B4] bg-white px-3 py-2 text-xs text-[#B34A3C]">
                {t("admin.restoreTripWarnings")}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default TripsRestoreDashboard;
