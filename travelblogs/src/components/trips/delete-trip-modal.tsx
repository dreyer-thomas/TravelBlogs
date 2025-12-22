"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteTripModalProps = {
  tripId: string;
  tripTitle: string;
};

const DeleteTripModal = ({ tripId, tripTitle }: DeleteTripModalProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpen = () => {
    setIsOpen(true);
    setIsDeleting(false);
    setErrorMessage(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsDeleting(false);
    setErrorMessage(null);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: "DELETE",
      });
      const body = await response.json();

      if (!response.ok) {
        setErrorMessage(body?.error?.message ?? "Unable to delete the trip.");
        setIsDeleting(false);
        return;
      }

      router.push("/trips");
    } catch {
      setErrorMessage("Unable to delete the trip.");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="min-h-[44px] rounded-xl border border-[#B64A3A] px-4 py-2 text-sm font-semibold text-[#B64A3A] transition hover:bg-[#B64A3A]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B64A3A]"
      >
        Delete trip
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-trip-title"
            aria-describedby="delete-trip-description"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2
              id="delete-trip-title"
              className="text-lg font-semibold text-[#2D2A26]"
            >
              Delete this trip?
            </h2>
            <p
              id="delete-trip-description"
              className="mt-2 text-sm text-[#6B635B]"
            >
              This will permanently remove{" "}
              <span className="font-semibold text-[#2D2A26]">
                {tripTitle}
              </span>{" "}
              and all of its entries.
            </p>

            {errorMessage ? (
              <p className="mt-3 text-sm text-[#B64A3A]">{errorMessage}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="min-h-[44px] rounded-xl border border-[#D5CDC4] px-4 py-2 text-sm font-semibold text-[#2D2A26] transition hover:bg-[#F6F1EB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D2A26]"
              >
                Keep trip
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="min-h-[44px] rounded-xl bg-[#B64A3A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#9E3F31] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B64A3A] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default DeleteTripModal;
