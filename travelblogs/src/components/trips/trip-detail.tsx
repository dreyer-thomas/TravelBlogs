"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DeleteTripModal from "./delete-trip-modal";
import { isCoverImageUrl } from "../../utils/media";
import { extractInlineImageUrls, stripInlineImages } from "../../utils/entry-content";

type TripDetail = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string | null;
  ownerName?: string | null;
};

type TripDetailProps = {
  tripId: string;
  canAddEntry: boolean;
  canEditTrip: boolean;
  canDeleteTrip: boolean;
  canManageShare: boolean;
  canManageViewers: boolean;
  canTransferOwnership: boolean;
};

type EntryMedia = {
  id: string;
  url: string;
  createdAt: string;
};

type ViewerUser = {
  id: string;
  name: string;
  email: string;
};

type ViewerAccess = {
  id: string;
  tripId: string;
  userId: string;
  canContribute: boolean;
  createdAt: string;
  user: ViewerUser;
};

type Invitee = {
  id: string;
  name: string;
  email: string;
  role: "creator" | "viewer";
  createdAt: string;
  updatedAt: string;
};

type TransferCandidate = {
  id: string;
  name: string;
  email: string;
  role: "creator" | "administrator" | "viewer";
  createdAt: string;
  updatedAt: string;
};

type EntrySummary = {
  id: string;
  tripId: string;
  title: string;
  coverImageUrl?: string | null;
  text: string;
  createdAt: string;
  updatedAt: string;
  media: EntryMedia[];
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatEntryDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const isOptimizedImage = (url: string) => url.startsWith("/");

const TripDetail = ({
  tripId,
  canAddEntry,
  canEditTrip,
  canDeleteTrip,
  canManageShare,
  canManageViewers,
  canTransferOwnership,
}: TripDetailProps) => {
  const router = useRouter();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<EntrySummary[]>([]);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareRevoked, setShareRevoked] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);
  const [viewers, setViewers] = useState<ViewerAccess[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [viewersError, setViewersError] = useState<string | null>(null);
  const [eligibleInvitees, setEligibleInvitees] = useState<Invitee[]>([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [eligibleError, setEligibleError] = useState<string | null>(null);
  const [selectedInviteeId, setSelectedInviteeId] = useState("");
  const [isInviteeMenuOpen, setIsInviteeMenuOpen] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSending, setInviteSending] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<ViewerAccess | null>(null);
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferCandidates, setTransferCandidates] = useState<
    TransferCandidate[]
  >([]);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [selectedTransferId, setSelectedTransferId] = useState("");
  const [transferSaving, setTransferSaving] = useState(false);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const inviteeMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setError(null);

    const loadTrip = async () => {
      try {
        const response = await fetch(`/api/trips/${tripId}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const body = await response.json().catch(() => null);

        if (!response.ok || body?.error) {
          throw new Error(body?.error?.message ?? "Unable to load trip.");
        }

        if (isActive) {
          setTrip((body?.data as TripDetail) ?? null);
          setIsLoading(false);
        }
      } catch (err) {
        if (isActive) {
          setTrip(null);
          setError(
            err instanceof Error ? err.message : "Unable to load trip.",
          );
          setIsLoading(false);
        }
      }
    };

    loadTrip();

    return () => {
      isActive = false;
    };
  }, [tripId]);

  useEffect(() => {
    let isActive = true;
    setEntriesLoading(true);
    setEntriesError(null);

    const loadEntries = async () => {
      try {
        const response = await fetch(`/api/entries?tripId=${tripId}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const body = await response.json().catch(() => null);

        if (!response.ok || body?.error) {
          throw new Error(body?.error?.message ?? "Unable to load entries.");
        }

        if (isActive) {
          setEntries((body?.data as EntrySummary[]) ?? []);
          setEntriesLoading(false);
        }
      } catch (err) {
        if (isActive) {
          setEntries([]);
          setEntriesError(
            err instanceof Error ? err.message : "Unable to load entries.",
          );
          setEntriesLoading(false);
        }
      }
    };

    loadEntries();

    return () => {
      isActive = false;
    };
  }, [tripId]);

  useEffect(() => {
    let isActive = true;
    setShareError(null);
    setShareCopied(false);
    setShareRevoked(false);

    if (!canManageShare) {
      setShareLoading(false);
      return () => {
        isActive = false;
      };
    }

    const loadShareLink = async () => {
      try {
        const response = await fetch(`/api/trips/${tripId}/share-link`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (response.status === 404) {
          if (isActive) {
            setShareLink(null);
          }
          return;
        }
        const body = await response.json().catch(() => null);
        if (!response.ok || body?.error) {
          throw new Error(body?.error?.message ?? "Unable to load share link.");
        }
        const shareUrl = body?.data?.shareUrl;
        if (isActive) {
          setShareLink(shareUrl ? (shareUrl as string) : null);
        }
      } catch (err) {
        if (isActive) {
          setShareError(
            err instanceof Error ? err.message : "Unable to load share link.",
          );
        }
      }
    };

    loadShareLink();

    return () => {
      isActive = false;
    };
  }, [tripId, canManageShare]);

  useEffect(() => {
    setShareLink(null);
    setShareError(null);
    setShareCopied(false);
    setShareRevoked(false);
    setViewError(null);
    setViewLoading(false);
  }, [tripId]);

  useEffect(() => {
    if (!isSharePanelOpen) {
      setIsInviteeMenuOpen(false);
      return;
    }

    let isActive = true;
    setViewersLoading(true);
    setViewersError(null);
    setEligibleLoading(true);
    setEligibleError(null);
    setInviteError(null);
    setRemovalError(null);
    setToggleError(null);

    const loadViewers = async () => {
      try {
        const response = await fetch(`/api/trips/${tripId}/viewers`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const body = await response.json().catch(() => null);

        if (!response.ok || body?.error) {
          throw new Error(
            body?.error?.message ?? "Unable to load invited viewers.",
          );
        }

        if (isActive) {
          setViewers((body?.data as ViewerAccess[]) ?? []);
          setViewersLoading(false);
        }
      } catch (err) {
        if (isActive) {
          setViewers([]);
          setViewersError(
            err instanceof Error
              ? err.message
              : "Unable to load invited viewers.",
          );
          setViewersLoading(false);
        }
      }
    };

    const loadEligibleInvitees = async () => {
      try {
        const response = await fetch(`/api/trips/${tripId}/viewers/eligible`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const body = await response.json().catch(() => null);

        if (!response.ok || body?.error) {
          throw new Error(
            body?.error?.message ?? "Unable to load eligible invitees.",
          );
        }

        if (isActive) {
          setEligibleInvitees((body?.data as Invitee[]) ?? []);
          setEligibleLoading(false);
        }
      } catch (err) {
        if (isActive) {
          setEligibleInvitees([]);
          setEligibleError(
            err instanceof Error
              ? err.message
              : "Unable to load eligible invitees.",
          );
          setEligibleLoading(false);
        }
      }
    };

    if (canManageViewers) {
      const loadSharePanelData = async () => {
        await loadViewers();
        await loadEligibleInvitees();
      };

      loadSharePanelData();
    } else {
      setViewers([]);
      setEligibleInvitees([]);
      setViewersLoading(false);
      setEligibleLoading(false);
    }

    return () => {
      isActive = false;
    };
  }, [isSharePanelOpen, tripId, canManageViewers]);

  useEffect(() => {
    if (!canManageShare && isSharePanelOpen) {
      setIsSharePanelOpen(false);
    }
  }, [canManageShare, isSharePanelOpen]);

  useEffect(() => {
    if (!isInviteeMenuOpen) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && inviteeMenuRef.current?.contains(target)) {
        return;
      }
      setIsInviteeMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isInviteeMenuOpen]);

  useEffect(() => {
    if (pendingRemoval) {
      setIsInviteeMenuOpen(false);
    }
  }, [pendingRemoval]);

  useEffect(() => {
    if (!isSharePanelOpen) {
      setSelectedInviteeId("");
    }
  }, [isSharePanelOpen]);

  useEffect(() => {
    if (!isTransferOpen) {
      setTransferCandidates([]);
      setTransferError(null);
      setSelectedTransferId("");
      return;
    }

    if (!canTransferOwnership) {
      setIsTransferOpen(false);
      return;
    }

    let isActive = true;
    setTransferLoading(true);
    setTransferError(null);

    const loadTransferCandidates = async () => {
      try {
        const response = await fetch(
          `/api/trips/${tripId}/transfer-ownership`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          },
        );
        const body = await response.json().catch(() => null);

        if (!response.ok || body?.error) {
          throw new Error(
            body?.error?.message ?? "Unable to load transfer candidates.",
          );
        }

        if (isActive) {
          setTransferCandidates(
            (body?.data as TransferCandidate[]) ?? [],
          );
          setTransferLoading(false);
        }
      } catch (err) {
        if (isActive) {
          setTransferCandidates([]);
          setTransferError(
            err instanceof Error
              ? err.message
              : "Unable to load transfer candidates.",
          );
          setTransferLoading(false);
        }
      }
    };

    loadTransferCandidates();

    return () => {
      isActive = false;
    };
  }, [isTransferOpen, tripId, canTransferOwnership]);

  const filteredInvitees = useMemo(() => {
    if (eligibleInvitees.length === 0) {
      return eligibleInvitees;
    }
    const invitedIds = new Set(viewers.map((viewer) => viewer.userId));
    return eligibleInvitees.filter((invitee) => !invitedIds.has(invitee.id));
  }, [eligibleInvitees, viewers]);

  const selectedInvitee = useMemo(() => {
    return eligibleInvitees.find((invitee) => invitee.id === selectedInviteeId);
  }, [eligibleInvitees, selectedInviteeId]);

  const eligibleTransferCandidates = useMemo(() => {
    return transferCandidates.filter((candidate) =>
      ["creator", "administrator"].includes(candidate.role),
    );
  }, [transferCandidates]);

  useEffect(() => {
    if (!selectedInviteeId) {
      return;
    }
    const stillEligible = filteredInvitees.some(
      (invitee) => invitee.id === selectedInviteeId,
    );
    if (!stillEligible) {
      setSelectedInviteeId("");
    }
  }, [filteredInvitees, selectedInviteeId]);

  const entriesByDate = useMemo(() => {
    return [...entries].sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );
  }, [entries]);


  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
        <main className="mx-auto w-full max-w-3xl space-y-6">
          <Link
            href="/trips"
            className="text-sm text-[#1F6F78] hover:underline"
          >
            ← Back to trips
          </Link>
          <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
            <p className="text-sm text-[#6B635B]">Loading trip…</p>
          </section>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
        <main className="mx-auto w-full max-w-3xl space-y-6">
          <Link
            href="/trips"
            className="text-sm text-[#1F6F78] hover:underline"
          >
            ← Back to trips
          </Link>
          <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
            <p className="text-sm text-[#B34A3C]">{error}</p>
          </section>
        </main>
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  const handleCreateShareLink = async () => {
    setShareLoading(true);
    setShareError(null);
    setShareCopied(false);
    setShareRevoked(false);

    try {
      const response = await fetch(`/api/trips/${trip.id}/share-link`, {
        method: "POST",
        credentials: "include",
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || body?.error) {
        throw new Error(body?.error?.message ?? "Unable to create share link.");
      }

      const shareUrl = body?.data?.shareUrl;
      if (!shareUrl) {
        throw new Error("Share link response was incomplete.");
      }

      setShareLink(shareUrl as string);
    } catch (err) {
      setShareError(
        err instanceof Error ? err.message : "Unable to create share link.",
      );
    } finally {
      setShareLoading(false);
    }
  };

  const handleInviteViewer = async () => {
    if (!selectedInviteeId) {
      setInviteError("Select a user to invite.");
      return;
    }

    const isEligible = filteredInvitees.some(
      (invitee) => invitee.id === selectedInviteeId,
    );
    if (!isEligible) {
      setInviteError("Selected user is no longer eligible.");
      setSelectedInviteeId("");
      setIsInviteeMenuOpen(false);
      return;
    }

    setInviteSending(true);
    setInviteError(null);

    try {
      const response = await fetch(`/api/trips/${trip.id}/viewers`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: selectedInviteeId }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || body?.error) {
        throw new Error(body?.error?.message ?? "Unable to invite viewer.");
      }

      const created = body?.data as ViewerAccess | undefined;
      if (created) {
        setViewers((prev) => {
          const existingIndex = prev.findIndex((item) => item.id === created.id);
          if (existingIndex >= 0) {
            const next = [...prev];
            next[existingIndex] = created;
            return next;
          }
          return [...prev, created];
        });
      }

      setEligibleInvitees((prev) =>
        prev.filter((invitee) => invitee.id !== selectedInviteeId),
      );
      setSelectedInviteeId("");
      setIsInviteeMenuOpen(false);
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : "Unable to invite viewer.",
      );
    } finally {
      setInviteSending(false);
    }
  };

  const handleRemoveInvite = async (viewer: ViewerAccess) => {
    setRemovingUserId(viewer.userId);
    setRemovalError(null);

    try {
      const response = await fetch(
        `/api/trips/${trip.id}/viewers/${viewer.userId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      const body = await response.json().catch(() => null);

      if (!response.ok || body?.error) {
        throw new Error(body?.error?.message ?? "Unable to remove invite.");
      }

      setViewers((prev) =>
        prev.filter((item) => item.userId !== viewer.userId),
      );
      setPendingRemoval(null);

      const eligibleResponse = await fetch(
        `/api/trips/${trip.id}/viewers/eligible`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        },
      );
      const eligibleBody = await eligibleResponse.json().catch(() => null);
      if (eligibleResponse.ok && !eligibleBody?.error) {
        setEligibleInvitees((eligibleBody?.data as Invitee[]) ?? []);
      }
    } catch (err) {
      setRemovalError(
        err instanceof Error ? err.message : "Unable to remove invite.",
      );
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleToggleContributor = async (viewer: ViewerAccess) => {
    if (togglingUserId === viewer.userId || pendingRemoval) {
      return;
    }

    const nextCanContribute = !viewer.canContribute;
    setTogglingUserId(viewer.userId);
    setToggleError(null);

    setViewers((prev) =>
      prev.map((item) =>
        item.userId === viewer.userId
          ? { ...item, canContribute: nextCanContribute }
          : item,
      ),
    );

    try {
      const response = await fetch(
        `/api/trips/${trip?.id}/viewers/${viewer.userId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ canContribute: nextCanContribute }),
        },
      );
      const body = await response.json().catch(() => null);

      if (!response.ok || body?.error) {
        throw new Error(
          body?.error?.message ?? "Unable to update contributor access.",
        );
      }

      const updated = body?.data as ViewerAccess | undefined;
      if (updated) {
        setViewers((prev) =>
          prev.map((item) =>
            item.userId === updated.userId ? updated : item,
          ),
        );
      }
    } catch (err) {
      setViewers((prev) =>
        prev.map((item) =>
          item.userId === viewer.userId
            ? { ...item, canContribute: viewer.canContribute }
            : item,
        ),
      );
      setToggleError(
        err instanceof Error
          ? err.message
          : "Unable to update contributor access.",
      );
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleOpenTransfer = () => {
    setTransferError(null);
    setIsTransferOpen(true);
  };

  const handleCloseTransfer = () => {
    setIsTransferOpen(false);
    setTransferError(null);
    setSelectedTransferId("");
  };

  const handleTransferOwnership = async () => {
    if (!selectedTransferId) {
      setTransferError("Select a new owner.");
      return;
    }

    const isEligible = eligibleTransferCandidates.some(
      (candidate) => candidate.id === selectedTransferId,
    );
    if (!isEligible) {
      setTransferError("Selected user is no longer eligible.");
      setSelectedTransferId("");
      return;
    }

    setTransferSaving(true);
    setTransferError(null);

    try {
      const response = await fetch(
        `/api/trips/${trip.id}/transfer-ownership`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: selectedTransferId }),
        },
      );
      const body = await response.json().catch(() => null);

      if (!response.ok || body?.error) {
        throw new Error(
          body?.error?.message ?? "Unable to transfer ownership.",
        );
      }

      setIsTransferOpen(false);
      setSelectedTransferId("");
      router.refresh();
    } catch (err) {
      setTransferError(
        err instanceof Error ? err.message : "Unable to transfer ownership.",
      );
    } finally {
      setTransferSaving(false);
    }
  };

  const handleOpenRevoke = () => {
    setIsRevokeOpen(true);
    setRevokeError(null);
  };

  const handleCloseRevoke = () => {
    setIsRevokeOpen(false);
    setIsRevoking(false);
    setRevokeError(null);
  };

  const handleRevokeShareLink = async () => {
    if (!shareLink) {
      return;
    }

    setIsRevoking(true);
    setRevokeError(null);

    try {
      const response = await fetch(`/api/trips/${trip.id}/share-link`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || body?.error) {
        throw new Error(body?.error?.message ?? "Unable to revoke share link.");
      }

      setShareLink(null);
      setShareRevoked(true);
      setShareCopied(false);
      setIsRevokeOpen(false);
      setIsRevoking(false);
    } catch (err) {
      setRevokeError(
        err instanceof Error ? err.message : "Unable to revoke share link.",
      );
      setIsRevoking(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareLink) {
      return;
    }

    try {
      await navigator.clipboard?.writeText(shareLink);
      setShareCopied(true);
      setShareError(null);
    } catch {
      setShareError("Unable to copy the share link.");
      setShareCopied(false);
    }
  };

  const openSharedView = (shareUrl: string) => {
    if (shareUrl.startsWith("/")) {
      router.push(shareUrl);
      return;
    }
    try {
      const url = new URL(shareUrl);
      router.push(`${url.pathname}${url.search}${url.hash}`);
    } catch {
      router.push(shareUrl);
    }
  };

  const handleOpenSharedView = async () => {
    if (!trip) {
      return;
    }

    setViewError(null);

    if (shareLink) {
      openSharedView(shareLink);
      return;
    }

    setViewLoading(true);

    try {
      const response = await fetch(`/api/trips/${trip.id}/share-link`, {
        method: "POST",
        credentials: "include",
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || body?.error) {
        throw new Error(body?.error?.message ?? "Unable to open shared view.");
      }

      const shareUrl = body?.data?.shareUrl;
      if (!shareUrl) {
        throw new Error("Share link response was incomplete.");
      }

      setShareLink(shareUrl as string);
      setShareRevoked(false);
      openSharedView(shareUrl as string);
    } catch (err) {
      setViewError(
        err instanceof Error ? err.message : "Unable to open shared view.",
      );
    } finally {
      setViewLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF7F1] px-6 py-12">
      <main className="mx-auto w-full max-w-3xl space-y-6">
        <Link href="/trips" className="text-sm text-[#1F6F78] hover:underline">
          ← Back to trips
        </Link>

        <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                Trip overview
              </p>
              <h1 className="text-3xl font-semibold text-[#2D2A26]">
                {trip.title}
              </h1>
              <p className="text-sm text-[#6B635B]">
                {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
              </p>
            </div>
          </header>

          {trip.coverImageUrl && isCoverImageUrl(trip.coverImageUrl) ? (
            <div className="relative mt-6 h-56 w-full overflow-hidden rounded-2xl bg-[#F2ECE3]">
              <Image
                src={trip.coverImageUrl}
                alt={`Cover for ${trip.title}`}
                fill
                sizes="(min-width: 768px) 768px, 100vw"
                className="object-cover"
                loading="lazy"
              />
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[#6B635B]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#2D2A26]">Owner:</span>
              <span>{trip.ownerName ?? "Creator"}</span>
            </div>
            {canManageShare ? (
              <button
                type="button"
                onClick={() => setIsSharePanelOpen((prev) => !prev)}
                aria-label="Share trip"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#6B635B] transition hover:border-[#1F6F78]/40 hover:text-[#1F6F78]"
              >
                Share
              </button>
            ) : null}
          </div>

          {canManageShare && isSharePanelOpen ? (
            <div className="relative mt-4 rounded-2xl border border-black/10 bg-[#FBF7F1] p-4 text-sm text-[#6B635B]">
              <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                Share link
              </p>
              <p className="mt-2">
                Create a read-only link for this trip.
              </p>

              {shareError ? (
                <p className="mt-3 text-sm text-[#B34A3C]">{shareError}</p>
              ) : null}

              {shareRevoked && !shareLink ? (
                <p className="mt-3">Link revoked.</p>
              ) : null}

              {shareLink ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="w-full flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#2D2A26]"
                    aria-label="Share URL"
                  />
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="rounded-xl border border-[#1F6F78] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1F6F78] transition hover:bg-[#1F6F78] hover:text-white"
                  >
                    {shareCopied ? "Copied" : "Copy link"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateShareLink}
                  className="mt-3 rounded-xl bg-[#1F6F78] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#195C63] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={shareLoading}
                >
                  {shareLoading ? "Creating…" : "Generate link"}
                </button>
              )}

              {canManageViewers ? (
                <div className="mt-6 border-t border-black/10 pt-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                    Invite viewers
                  </p>
                  <p className="mt-2">
                    Invite existing users to view this trip.
                  </p>
                  <p className="mt-1 text-xs text-[#6B635B]">
                    Contributor access applies to this trip only.
                  </p>

                {viewersError ? (
                  <p className="mt-3 text-sm text-[#B34A3C]">{viewersError}</p>
                ) : null}

                {viewersLoading ? (
                  <p className="mt-3 text-sm">Loading viewers…</p>
                ) : viewers.length === 0 ? (
                  <p className="mt-3 text-sm">No invited viewers yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm text-[#2D2A26]">
                    {viewers.map((viewer) => (
                      <li
                        key={viewer.id}
                        className="flex flex-wrap items-start justify-between gap-3"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold">
                            {viewer.user.name}
                          </span>
                          <span className="text-xs text-[#6B635B]">
                            {viewer.user.email}
                          </span>
                          <span
                            className={`mt-1 w-fit rounded-full border px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.2em] ${
                              viewer.canContribute
                                ? "border-[#1F6F78]/30 text-[#1F6F78]"
                                : "border-black/10 text-[#6B635B]"
                            }`}
                          >
                            {viewer.canContribute ? "Contributor" : "View only"}
                          </span>
                          {togglingUserId === viewer.userId ? (
                            <span className="mt-1 text-[0.55rem] uppercase tracking-[0.2em] text-[#6B635B]">
                              Updating…
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleContributor(viewer)}
                            disabled={
                              togglingUserId === viewer.userId ||
                              Boolean(pendingRemoval)
                            }
                            aria-label={
                              viewer.canContribute
                                ? "Disable contribution"
                                : "Enable contribution"
                            }
                            aria-busy={togglingUserId === viewer.userId}
                            className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#1F6F78]/30 text-[#1F6F78] transition hover:border-[#1F6F78]/60 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="block"
                              width="28"
                              height="28"
                            >
                              {viewer.canContribute ? (
                                <>
                                  <circle
                                    cx="12"
                                    cy="12"
                                    r="9"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  />
                                  <path
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    d="M7 17L17 7"
                                  />
                                </>
                              ) : (
                                <path
                                  fill="currentColor"
                                  d="M16.1 3.6a2.5 2.5 0 0 1 3.5 3.5L8.3 18.4l-4.3 1 1-4.3L16.1 3.6zm1.4 1.4L6.8 15.7l-.4 1.6 1.6-.4L18.7 6.6a.5.5 0 0 0 0-.7l-.5-.5a.5.5 0 0 0-.7 0z"
                                />
                              )}
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPendingRemoval(viewer);
                              setRemovalError(null);
                              setIsInviteeMenuOpen(false);
                            }}
                            aria-label="Remove invite"
                            className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#B34A3C]/40 text-[#B34A3C] transition hover:border-[#B34A3C]/70 hover:text-[#B34A3C]"
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="block"
                              width="28"
                              height="28"
                            >
                              <path
                                fill="currentColor"
                                d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v8h-2V9zm4 0h-2v8h2V9zM7 9h2v8H7V9zm1 11h8a2 2 0 0 0 2-2V9H6v9a2 2 0 0 0 2 2z"
                              />
                            </svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {eligibleError ? (
                  <p className="mt-3 text-sm text-[#B34A3C]">
                    {eligibleError}
                  </p>
                ) : null}

                {removalError && !pendingRemoval ? (
                  <p className="mt-3 text-sm text-[#B34A3C]">
                    {removalError}
                  </p>
                ) : null}

                {toggleError ? (
                  <p className="mt-3 text-sm text-[#B34A3C]">{toggleError}</p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="w-full flex-1">
                    <div className="relative mt-2" ref={inviteeMenuRef}>
                      <button
                        type="button"
                        onClick={() =>
                          setIsInviteeMenuOpen((prev) => !prev)
                        }
                        className="flex w-full items-center justify-between rounded-xl border border-black/10 bg-white px-3 py-2 text-left text-sm text-[#2D2A26] transition hover:border-[#1F6F78]/40"
                        aria-label="Invite viewer selector"
                        aria-haspopup="listbox"
                        aria-expanded={isInviteeMenuOpen}
                        disabled={
                          eligibleLoading ||
                          filteredInvitees.length === 0 ||
                          Boolean(pendingRemoval)
                        }
                      >
                        <span className={selectedInvitee ? "" : "text-[#6B635B]"}>
                          {selectedInvitee
                            ? `${selectedInvitee.name} — ${selectedInvitee.email}`
                            : eligibleLoading
                              ? "Loading invitees…"
                              : filteredInvitees.length === 0
                                ? "No eligible users"
                                : "Select invitee"}
                        </span>
                        <span className="text-xs text-[#6B635B]">▾</span>
                      </button>
                      {isInviteeMenuOpen &&
                      !pendingRemoval &&
                      filteredInvitees.length > 0 ? (
                        <div className="absolute z-10 mt-2 w-full rounded-2xl border border-black/10 bg-white p-2 shadow-lg">
                          <ul
                            role="listbox"
                            aria-label="Eligible invitees"
                            className="max-h-48 space-y-1 overflow-auto"
                          >
                            {filteredInvitees.map((invitee) => (
                              <li key={invitee.id}>
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={invitee.id === selectedInviteeId}
                                  onClick={() => {
                                    setSelectedInviteeId(invitee.id);
                                    setIsInviteeMenuOpen(false);
                                  }}
                                  className="flex w-full flex-col rounded-xl px-3 py-2 text-left text-sm text-[#2D2A26] transition hover:bg-[#FBF7F1]"
                                >
                                  <span className="font-semibold">
                                    {invitee.name}
                                  </span>
                                  <span className="text-xs text-[#6B635B]">
                                    {invitee.email}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleInviteViewer}
                    className="rounded-xl border border-[#1F6F78] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1F6F78] transition hover:bg-[#1F6F78] hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={inviteSending || eligibleLoading}
                  >
                    {inviteSending ? "Inviting…" : "Invite"}
                  </button>
                </div>

                  {inviteError ? (
                    <p className="mt-3 text-sm text-[#B34A3C]">{inviteError}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {pendingRemoval ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="remove-invite-title"
              aria-describedby="remove-invite-description"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
              <h2
                id="remove-invite-title"
                className="text-lg font-semibold text-[#2D2A26]"
              >
                Remove this invite?
              </h2>
              <p
                id="remove-invite-description"
                className="mt-2 text-sm text-[#6B635B]"
              >
                This will revoke access for{" "}
                <span className="font-semibold text-[#2D2A26]">
                  {pendingRemoval.user.name}
                </span>
                .
              </p>

              {removalError ? (
                <p className="mt-3 text-sm text-[#B64A3A]">{removalError}</p>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPendingRemoval(null);
                    setRemovalError(null);
                  }}
                  className="min-h-[44px] rounded-xl border border-[#D5CDC4] px-4 py-2 text-sm font-semibold text-[#2D2A26] transition hover:bg-[#F6F1EB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D2A26]"
                  disabled={removingUserId === pendingRemoval.userId}
                >
                  No, keep
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveInvite(pendingRemoval)}
                  disabled={removingUserId === pendingRemoval.userId}
                  className="min-h-[44px] rounded-xl bg-[#B64A3A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#9E3F31] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B64A3A] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {removingUserId === pendingRemoval.userId
                    ? "Removing..."
                    : "Yes, remove"}
                </button>
              </div>
            </div>
          </div>
        ) : null}


        <section className="rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
          {canAddEntry ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link
                href={`/trips/${trip.id}/entries/new`}
                className="rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63]"
              >
                Add story
              </Link>
            </div>
          ) : null}

          {entriesLoading ? (
            <p className="mt-4 text-sm text-[#6B635B]">Loading entries…</p>
          ) : entriesError ? (
            <p className="mt-4 text-sm text-[#B34A3C]">{entriesError}</p>
          ) : entriesByDate.length === 0 ? (
            <p className="mt-4 text-sm text-[#6B635B]">
              No entries yet. Use the add story button to get started.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {entriesByDate.map((entry) => {
                const preview = stripInlineImages(entry.text);
                const inlineImages = extractInlineImageUrls(entry.text);
                const previewText =
                  preview.length === 0
                    ? "Photo update"
                    : preview.length > 120
                      ? `${preview.slice(0, 120)}…`
                      : preview;
                const displayTitle = entry.title?.trim()
                  ? entry.title
                  : previewText;
                const cardImageUrl =
                  entry.coverImageUrl?.trim() ||
                  entry.media[0]?.url ||
                  inlineImages[0];

                return (
                  <Link
                    key={entry.id}
                    href={`/trips/${trip.id}/entries/${entry.id}`}
                    className="flex items-center gap-4 rounded-xl border border-black/10 bg-white px-4 py-3 transition hover:border-[#1F6F78]/40 hover:shadow-sm"
                  >
                    {cardImageUrl ? (
                      <div
                        className="relative shrink-0 overflow-hidden rounded-xl border border-black/10 bg-[#F2ECE3]"
                        style={{ width: 139, height: 97 }}
                      >
                        <Image
                          src={cardImageUrl}
                          alt={`Story cover for ${displayTitle}`}
                          fill
                          sizes="140px"
                          className="object-cover"
                          loading="lazy"
                          unoptimized={!isOptimizedImage(cardImageUrl)}
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                        {formatEntryDate(entry.createdAt)}
                      </p>
                      <p className="mt-1 truncate text-sm text-[#2D2A26]">
                        {displayTitle}
                      </p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1F6F78]">
                      Open
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#6B635B]">
                Trip actions
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleOpenSharedView}
                disabled={viewLoading}
                className={
                  canEditTrip
                    ? "rounded-xl border border-[#1F6F78] px-4 py-2 text-sm font-semibold text-[#1F6F78] transition hover:bg-[#1F6F78] hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                    : "rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63] disabled:cursor-not-allowed disabled:opacity-70"
                }
              >
                {viewLoading ? "Opening…" : "View"}
              </button>
              {canEditTrip ? (
                <Link
                  href={`/trips/${trip.id}/edit`}
                  className="rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63]"
                >
                  Edit trip
                </Link>
              ) : null}
              {canTransferOwnership ? (
                <button
                  type="button"
                  onClick={handleOpenTransfer}
                  className="rounded-xl border border-[#1F6F78] px-4 py-2 text-sm font-semibold text-[#1F6F78] transition hover:bg-[#1F6F78] hover:text-white"
                >
                  Transfer ownership
                </button>
              ) : null}
              {canDeleteTrip ? (
                <DeleteTripModal tripId={trip.id} tripTitle={trip.title} />
              ) : null}
              {canManageShare && shareLink ? (
                <button
                  type="button"
                  onClick={handleOpenRevoke}
                  className="rounded-xl border border-[#B64A3A] px-4 py-2 text-sm font-semibold text-[#B64A3A] transition hover:bg-[#B64A3A]/10"
                  disabled={shareLoading || isRevoking}
                >
                  Revoke share link
                </button>
              ) : null}
            </div>
          </div>
          {viewError ? (
            <p className="mt-3 text-sm text-[#B34A3C]">{viewError}</p>
          ) : null}
        </section>
      </main>

      {isTransferOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="transfer-ownership-title"
            aria-describedby="transfer-ownership-description"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2
              id="transfer-ownership-title"
              className="text-lg font-semibold text-[#2D2A26]"
            >
              Transfer ownership
            </h2>
            <p
              id="transfer-ownership-description"
              className="mt-2 text-sm text-[#6B635B]"
            >
              Select a new owner. Only active creators and administrators are
              eligible.
            </p>

            {transferError ? (
              <p className="mt-3 text-sm text-[#B64A3A]">{transferError}</p>
            ) : null}

            {transferLoading ? (
              <p className="mt-3 text-sm text-[#6B635B]">
                Loading eligible owners…
              </p>
            ) : eligibleTransferCandidates.length === 0 ? (
              <p className="mt-3 text-sm text-[#6B635B]">
                No eligible owners available.
              </p>
            ) : (
              <div className="mt-4">
                <label
                  htmlFor="transfer-owner-select"
                  className="text-xs uppercase tracking-[0.2em] text-[#6B635B]"
                >
                  New owner
                </label>
                <select
                  id="transfer-owner-select"
                  value={selectedTransferId}
                  onChange={(event) =>
                    setSelectedTransferId(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#2D2A26]"
                >
                  <option value="">Select a user</option>
                  {eligibleTransferCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} ({candidate.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCloseTransfer}
                className="min-h-[44px] rounded-xl border border-[#D5CDC4] px-4 py-2 text-sm font-semibold text-[#2D2A26] transition hover:bg-[#F6F1EB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D2A26]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTransferOwnership}
                disabled={
                  transferSaving ||
                  transferLoading ||
                  eligibleTransferCandidates.length === 0
                }
                className="min-h-[44px] rounded-xl bg-[#1F6F78] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195C63] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F6F78] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {transferSaving ? "Transferring..." : "Transfer ownership"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isRevokeOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="revoke-share-title"
            aria-describedby="revoke-share-description"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2
              id="revoke-share-title"
              className="text-lg font-semibold text-[#2D2A26]"
            >
              Revoke this link?
            </h2>
            <p
              id="revoke-share-description"
              className="mt-2 text-sm text-[#6B635B]"
            >
              Anyone using this link will lose access immediately.
            </p>

            {revokeError ? (
              <p className="mt-3 text-sm text-[#B64A3A]">{revokeError}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCloseRevoke}
                className="min-h-[44px] rounded-xl border border-[#D5CDC4] px-4 py-2 text-sm font-semibold text-[#2D2A26] transition hover:bg-[#F6F1EB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D2A26]"
              >
                Keep link
              </button>
              <button
                type="button"
                onClick={handleRevokeShareLink}
                disabled={isRevoking}
                className="min-h-[44px] rounded-xl bg-[#B64A3A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#9E3F31] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B64A3A] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRevoking ? "Revoking..." : "Yes, revoke"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TripDetail;
