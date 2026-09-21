"use client";

import { useEffect, useRef } from "react";

type ViewBeaconProps = {
  token: string;
  entryId?: string;
};

/**
 * Fires a single fire-and-forget POST per rendered shared page so that a view is
 * counted exactly once. Counting cannot live in `GET /api/trips/share/[token]`:
 * that endpoint runs twice per SSR render and is re-polled every 10 seconds by
 * `SharedTripGuard`, which would inflate one reader into hundreds of views.
 *
 * Writes nothing to cookies, `localStorage` or `sessionStorage`.
 */
const ViewBeacon = ({ token, entryId }: ViewBeaconProps) => {
  const sentKeyRef = useRef<string | null>(null);

  useEffect(() => {
    // Keyed on the target rather than a bare boolean: the App Router reuses this
    // component instance when the reader follows a prev/next link between two
    // entries, because both are the same `[entryId]` segment. A boolean guard
    // would survive that navigation and every entry after the first would go
    // uncounted. React Strict Mode's double effect is still collapsed, since the
    // key is unchanged across the second run.
    const key = `${token}:${entryId ?? ""}`;
    if (sentKeyRef.current === key) {
      return;
    }
    sentKeyRef.current = key;

    void fetch(`/api/trips/share/${token}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entryId ? { entryId } : {}),
      cache: "no-store",
      keepalive: true,
    }).catch(() => {
      // View counting is best-effort; never surface an error to the reader.
    });
  }, [entryId, token]);

  return null;
};

export default ViewBeacon;
