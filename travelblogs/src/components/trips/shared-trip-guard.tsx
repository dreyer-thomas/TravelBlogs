"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type SharedTripGuardProps = {
  token: string;
  children: ReactNode;
};

const INVALID_MESSAGE = "This share link is no longer valid.";

const SharedTripGuard = ({ token, children }: SharedTripGuardProps) => {
  const [invalid, setInvalid] = useState(false);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkLinkRef = useRef<() => void>(() => {});

  const markInvalid = () => {
    setInvalid(true);
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  };

  const scheduleNextCheck = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
    }
    pollTimeoutRef.current = setTimeout(() => {
      checkLinkRef.current();
    }, 60000);
  }, []);

  const checkLink = useCallback(async () => {
    try {
      const response = await fetch(`/api/trips/share/${token}`, {
        method: "GET",
        cache: "no-store",
      });
      if (response.status === 404) {
        markInvalid();
        return;
      }
      const body = await response.json().catch(() => null);
      if (body?.error?.code === "NOT_FOUND") {
        markInvalid();
        return;
      }
    } catch {
      // Ignore network errors; only invalidate on confirmed 404.
    }
    scheduleNextCheck();
  }, [scheduleNextCheck, token]);

  useEffect(() => {
    checkLinkRef.current = checkLink;
  }, [checkLink]);

  useEffect(() => {
    const initialCheck = window.setTimeout(() => {
      void checkLink();
    }, 0);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void checkLink();
      }
    };

    window.addEventListener("focus", checkLink);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearTimeout(initialCheck);
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      window.removeEventListener("focus", checkLink);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [checkLink]);

  if (invalid) {
    return (
      <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
        <main className="mx-auto w-full max-w-3xl">
          <section className="rounded-2xl border border-black/10 bg-white p-8 text-center">
            <p className="text-sm text-[#B34A3C]">{INVALID_MESSAGE}</p>
          </section>
        </main>
      </div>
    );
  }

  return <>{children}</>;
};

export default SharedTripGuard;
