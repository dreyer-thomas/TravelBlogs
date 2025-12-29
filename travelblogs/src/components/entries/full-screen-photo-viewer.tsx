"use client";

import type { KeyboardEvent, TouchEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

type PhotoViewerImage = {
  url: string;
  alt: string;
};

type FullScreenPhotoViewerProps = {
  images: PhotoViewerImage[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  mode?: "viewer" | "slideshow";
};

const clampIndex = (index: number, length: number) => {
  if (length <= 0) {
    return 0;
  }
  return Math.min(Math.max(index, 0), length - 1);
};

const isOptimizedImage = (url: string) => url.startsWith("/");

const getTouchDistance = (touches: TouchList) => {
  const [first, second] = [touches[0], touches[1]];
  if (!first || !second) {
    return 0;
  }
  const deltaX = first.clientX - second.clientX;
  const deltaY = first.clientY - second.clientY;
  return Math.hypot(deltaX, deltaY);
};

const FullScreenPhotoViewer = ({
  images,
  initialIndex,
  isOpen,
  onClose,
  mode = "viewer",
}: FullScreenPhotoViewerProps) => {
  const safeIndex = useMemo(
    () => clampIndex(initialIndex, images.length),
    [initialIndex, images.length],
  );
  const [activeIndex, setActiveIndex] = useState(safeIndex);
  const [zoomScale, setZoomScale] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartRef = useRef<{ distance: number; scale: number } | null>(
    null,
  );
  const ignoreClickRef = useRef(false);
  const wasPausedRef = useRef(false);
  const isSlideshow = mode === "slideshow";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setActiveIndex(safeIndex);
    setZoomScale(1);
    setIsPaused(false);
  }, [isOpen, safeIndex]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    dialogRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (
        isSlideshow &&
        (event.code === "Space" || event.key === " ")
      ) {
        event.preventDefault();
        setIsPaused((prev) => !prev);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((prev) =>
          clampIndex(prev + 1, images.length),
        );
        setZoomScale(1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((prev) =>
          clampIndex(prev - 1, images.length),
        );
        setZoomScale(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [images.length, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !isSlideshow || images.length <= 1 || isPaused) {
      return;
    }
    const timer = window.setTimeout(() => {
      setActiveIndex((prev) =>
        images.length === 0 ? prev : (prev + 1) % images.length,
      );
      setZoomScale(1);
    }, 5000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [activeIndex, images.length, isOpen, isPaused, isSlideshow]);

  useEffect(() => {
    if (!isOpen || !isSlideshow) {
      return;
    }
    setProgressKey((prev) => prev + 1);
  }, [activeIndex, isOpen, isSlideshow]);

  useEffect(() => {
    if (!isOpen || !isSlideshow) {
      return;
    }
    if (wasPausedRef.current && !isPaused) {
      setProgressKey((prev) => prev + 1);
    }
    wasPausedRef.current = isPaused;
  }, [isOpen, isPaused, isSlideshow]);

  if (!isOpen || images.length === 0 || !isMounted) {
    return null;
  }

  const canGoBack = isSlideshow
    ? images.length > 1
    : activeIndex > 0;
  const canGoForward = isSlideshow
    ? images.length > 1
    : activeIndex < images.length - 1;
  const activeImage = images[activeIndex];

  const handlePrevious = () => {
    if (!canGoBack) {
      return;
    }
    setActiveIndex((prev) =>
      isSlideshow
        ? (prev - 1 + images.length) % images.length
        : clampIndex(prev - 1, images.length),
    );
    setZoomScale(1);
  };

  const handleNext = () => {
    if (!canGoForward) {
      return;
    }
    setActiveIndex((prev) =>
      isSlideshow
        ? (prev + 1) % images.length
        : clampIndex(prev + 1, images.length),
    );
    setZoomScale(1);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const suppressNextClick = () => {
      ignoreClickRef.current = true;
      window.setTimeout(() => {
        ignoreClickRef.current = false;
      }, 300);
    };

    if (event.touches.length === 2) {
      pinchStartRef.current = {
        distance: getTouchDistance(event.touches),
        scale: zoomScale,
      };
      touchStartRef.current = null;
      suppressNextClick();
      return;
    }

    const [touch] = event.touches;
    if (touch) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      pinchStartRef.current = null;
    }
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2 && pinchStartRef.current) {
      event.preventDefault();
      const distance = getTouchDistance(event.touches);
      const nextScale =
        pinchStartRef.current.scale *
        (distance / Math.max(pinchStartRef.current.distance, 1));
      setZoomScale(Math.min(Math.max(nextScale, 1), 3));
    }
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length > 0) {
      return;
    }
    pinchStartRef.current = null;
    if (!touchStartRef.current) {
      return;
    }
    const [touch] = event.changedTouches;
    if (!touch) {
      return;
    }
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      ignoreClickRef.current = true;
      window.setTimeout(() => {
        ignoreClickRef.current = false;
      }, 300);
      if (deltaX < 0) {
        handleNext();
      } else {
        handlePrevious();
      }
    }
  };

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") {
      return;
    }
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter(
      (element) =>
        !element.hasAttribute("disabled") && element.getClientRects().length > 0,
    );

    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      if (!activeElement || activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (!activeElement || activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleOverlayClick = () => {
    if (ignoreClickRef.current) {
      ignoreClickRef.current = false;
      return;
    }
    onClose();
  };

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[2147483647] isolate flex h-screen w-screen flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onKeyDown={handleDialogKeyDown}
      onClick={handleOverlayClick}
      tabIndex={-1}
      style={{ backgroundColor: "#000000" }}
    >
      <style>{`
        @keyframes slideshowProgressFill {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>

      {isSlideshow ? (
        <div
          data-testid="slideshow-progress"
          aria-hidden="true"
          className="fixed left-6 right-6 top-4 z-[2147483647] flex h-1.5 gap-2 opacity-70"
        >
          {images.map((image, index) => {
            const isComplete = index < activeIndex;
            const isActive = index === activeIndex;
            const segmentState = isComplete
              ? "complete"
              : isActive
                ? "active"
                : "upcoming";
            return (
              <div
                key={`${image.url}-${index}`}
                data-testid="slideshow-segment"
                data-segment-state={segmentState}
                className="relative flex-1 overflow-hidden rounded-full"
                style={{
                  backgroundColor: "#4F4F4F",
                  boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.3)",
                }}
              >
                {isComplete ? (
                  <div
                    className="h-full w-full"
                    style={{ backgroundColor: "#E5E5E5" }}
                  />
                ) : null}
                {isActive ? (
                  <div
                    key={progressKey}
                    className="h-full w-full"
                    style={{
                      backgroundColor: "#E5E5E5",
                      transformOrigin: "left",
                      transform: "scaleX(0)",
                      animation:
                        "slideshowProgressFill 5s linear forwards",
                      animationPlayState: isPaused ? "paused" : "running",
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="relative z-10 flex flex-1 items-center justify-center">
        <div
          data-testid="photo-viewer-gesture-layer"
          className="absolute inset-0 flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: "none" }}
        >
          <div
            className="relative h-full w-full"
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: "center center",
            }}
          >
            <Image
              src={activeImage.url}
              alt={activeImage.alt}
              fill
              sizes="100vw"
              className="object-contain"
              style={{ objectFit: "contain", objectPosition: "center" }}
              loading="lazy"
              unoptimized={!isOptimizedImage(activeImage.url)}
            />
          </div>
        </div>
      </div>

    </div>,
    document.body,
  );
};

export default FullScreenPhotoViewer;
