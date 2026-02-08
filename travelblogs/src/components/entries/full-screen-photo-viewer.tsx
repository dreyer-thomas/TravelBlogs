"use client";

import type { KeyboardEvent as ReactKeyboardEvent, TouchEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useTranslation } from "../../utils/use-translation";
import { getMediaTypeFromUrl, shouldOptimizeImageUrl } from "../../utils/media";

type PhotoViewerImage = {
  url: string;
  alt: string;
  mediaType?: "image" | "video";
};

type FullScreenPhotoViewerProps = {
  images: PhotoViewerImage[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  mode?: "viewer" | "slideshow";
};

type TouchLike = {
  clientX: number;
  clientY: number;
};

type TouchListLike = {
  length: number;
  [index: number]: TouchLike | undefined;
};

const clampIndex = (index: number, length: number) => {
  if (length <= 0) {
    return 0;
  }
  return Math.min(Math.max(index, 0), length - 1);
};

const isOptimizedImage = (url: string) => shouldOptimizeImageUrl(url);
const SEEK_SECONDS = 5;

const getTouchDistance = (touches: TouchListLike) => {
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
  const { t } = useTranslation();
  const safeIndex = useMemo(
    () => clampIndex(initialIndex, images.length),
    [initialIndex, images.length],
  );
  const [activeIndex, setActiveIndex] = useState(safeIndex);
  const [zoomScale, setZoomScale] = useState(1);
  const [progressKey, setProgressKey] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [previousMedia, setPreviousMedia] =
    useState<PhotoViewerImage | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<
    "idle" | "preparing" | "active"
  >("idle");
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState({ loaded: 0, total: 0 });
  const [preloadComplete, setPreloadComplete] = useState(false);
  const [failedPreloadUrls, setFailedPreloadUrls] = useState<Set<string>>(
    () => new Set(),
  );
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);
  const transitionRafRef = useRef<number | null>(null);
  const transitionRaf2Ref = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartRef = useRef<{ distance: number; scale: number } | null>(
    null,
  );
  const activeIndexRef = useRef(activeIndex);
  const ignoreClickRef = useRef(false);
  const wasPausedRef = useRef(false);
  const preloadTimeoutRef = useRef<number | null>(null);
  const preloadActiveRef = useRef(false);
  const preloadedTokenSetRef = useRef<Set<string>>(new Set());
  const preloadTokensRef = useRef<Array<{ token: string; url: string }>>([]);
  const isSlideshow = mode === "slideshow";
  const slideshowImageUrls = useMemo(
    () =>
      images
        .filter((img) => {
          const type = img.mediaType ?? getMediaTypeFromUrl(img.url);
          return type === "image";
        })
        .map((img) => img.url),
    [images],
  );
  const activeMedia = images[activeIndex] ?? images[0];
  const shouldShowFailedPlaceholder = useCallback(
    (media: PhotoViewerImage | null | undefined) =>
      Boolean(
        media &&
          isSlideshow &&
          preloadComplete &&
          failedPreloadUrls.has(media.url),
      ),
    [failedPreloadUrls, isSlideshow, preloadComplete],
  );
  const activeMediaType = useMemo(() => {
    if (!activeMedia) {
      return "image";
    }
    return activeMedia.mediaType ?? getMediaTypeFromUrl(activeMedia.url);
  }, [activeMedia]);
  const isActiveVideo = activeMediaType === "video";

  const pauseActiveVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    try {
      video.pause();
    } catch {
      // Ignore pause errors in non-media environments (e.g. jsdom).
    }
  }, []);

  const clearTransitionTimers = useCallback(() => {
    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    if (transitionRafRef.current) {
      window.cancelAnimationFrame(transitionRafRef.current);
      transitionRafRef.current = null;
    }
    if (transitionRaf2Ref.current) {
      window.cancelAnimationFrame(transitionRaf2Ref.current);
      transitionRaf2Ref.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    clearTransitionTimers();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(safeIndex);
    setZoomScale(1);
    setIsPaused(false);
    setPreviousIndex(null);
    setPreviousMedia(null);
    setTransitionPhase("idle");
    pauseActiveVideo();
  }, [clearTransitionTimers, isOpen, pauseActiveVideo, safeIndex]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    return () => {
      clearTransitionTimers();
    };
  }, [clearTransitionTimers]);

  const markPreloadProgress = useCallback(
    (token: string, url: string, error?: Event | string) => {
      if (!preloadActiveRef.current) {
        return;
      }
      if (preloadedTokenSetRef.current.has(token)) {
        return;
      }
      preloadedTokenSetRef.current.add(token);
      if (error) {
        console.error(`[Preload] Failed to load image: ${url}`, error);
        setFailedPreloadUrls((prev) => {
          const next = new Set(prev);
          next.add(url);
          return next;
        });
      }
      setPreloadProgress((prev) => {
        const loaded = Math.min(prev.loaded + 1, prev.total);
        if (loaded >= prev.total) {
          preloadActiveRef.current = false;
          if (preloadTimeoutRef.current) {
            window.clearTimeout(preloadTimeoutRef.current);
            preloadTimeoutRef.current = null;
          }
          setIsPreloading(false);
          setPreloadComplete(true);
        }
        return { ...prev, loaded };
      });
    },
    [],
  );

  useEffect(() => {
    if (!isOpen || !isSlideshow || images.length === 0) {
      return;
    }

    const totalImages = slideshowImageUrls.length;
    preloadActiveRef.current = true;
    preloadedTokenSetRef.current = new Set();
    preloadTokensRef.current = slideshowImageUrls.map((url, index) => ({
      token: `${index}-${url}`,
      url,
    }));

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsPreloading(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreloadComplete(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreloadProgress({ loaded: 0, total: totalImages });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFailedPreloadUrls(new Set());

    if (totalImages === 0) {
      preloadActiveRef.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPreloading(false);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreloadComplete(true);
      return;
    }

    if (preloadTimeoutRef.current) {
      window.clearTimeout(preloadTimeoutRef.current);
    }
    preloadTimeoutRef.current = window.setTimeout(() => {
      if (!preloadActiveRef.current) {
        return;
      }
      console.warn("[Preload] Timeout - starting with loaded images");
      const timedOutUrls = preloadTokensRef.current
        .filter(({ token }) => !preloadedTokenSetRef.current.has(token))
        .map(({ url }) => url);
      if (timedOutUrls.length > 0) {
        setFailedPreloadUrls((prev) => {
          const next = new Set(prev);
          timedOutUrls.forEach((url) => next.add(url));
          return next;
        });
      }
      preloadActiveRef.current = false;
      setIsPreloading(false);
      setPreloadComplete(true);
      preloadTimeoutRef.current = null;
    }, 30000);

    return () => {
      preloadActiveRef.current = false;
      if (preloadTimeoutRef.current) {
        window.clearTimeout(preloadTimeoutRef.current);
        preloadTimeoutRef.current = null;
      }
      preloadedTokenSetRef.current = new Set();
      preloadTokensRef.current = [];
    };
  }, [isOpen, isSlideshow, images.length, slideshowImageUrls]);

  const triggerTransition = useCallback(
    (currentIndex: number, nextIndex: number) => {
      if (!isSlideshow || images.length <= 1) {
        clearTransitionTimers();
        setPreviousIndex(null);
        setPreviousMedia(null);
        setTransitionPhase("idle");
        return false;
      }
      const currentMedia = images[currentIndex];
      const nextMedia = images[nextIndex];
      if (!currentMedia || !nextMedia) {
        clearTransitionTimers();
        setPreviousIndex(null);
        setPreviousMedia(null);
        setTransitionPhase("idle");
        return false;
      }
      const currentType =
        currentMedia.mediaType ?? getMediaTypeFromUrl(currentMedia.url);
      const nextType =
        nextMedia.mediaType ?? getMediaTypeFromUrl(nextMedia.url);
      if (currentType !== "image" || nextType !== "image") {
        clearTransitionTimers();
        setPreviousIndex(null);
        setPreviousMedia(null);
        setTransitionPhase("idle");
        return false;
      }
      clearTransitionTimers();
      setPreviousIndex(currentIndex);
      setPreviousMedia(currentMedia);
      setTransitionPhase("preparing");
      transitionTimeoutRef.current = window.setTimeout(() => {
        setTransitionPhase("idle");
        setPreviousIndex(null);
        setPreviousMedia(null);
        transitionTimeoutRef.current = null;
      }, 1000);
      return true;
    },
    [clearTransitionTimers, images, isSlideshow],
  );

  useEffect(() => {
    if (transitionPhase !== "preparing") {
      return;
    }
    transitionRafRef.current = window.requestAnimationFrame(() => {
      transitionRaf2Ref.current = window.requestAnimationFrame(() => {
        setTransitionPhase("active");
        transitionRaf2Ref.current = null;
      });
      transitionRafRef.current = null;
    });
  }, [transitionPhase]);

  const updateActiveIndex = useCallback(
    (getNextIndex: (currentIndex: number) => number) => {
      const currentIndex = activeIndexRef.current;
      const nextIndex = getNextIndex(currentIndex);
      triggerTransition(currentIndex, nextIndex);
      setActiveIndex(nextIndex);
      setZoomScale(1);
      pauseActiveVideo();
    },
    [pauseActiveVideo, triggerTransition],
  );

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
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (isSlideshow && (isPreloading || !preloadComplete)) {
        return;
      }
      if (isActiveVideo && !isSlideshow) {
        if (event.code === "Space" || event.key === " ") {
          event.preventDefault();
          const video = videoRef.current;
          if (!video) {
            return;
          }
          if (video.paused) {
            void video.play();
          } else {
            video.pause();
          }
          return;
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          const video = videoRef.current;
          if (!video) {
            return;
          }
          const nextTime = Math.min(
            video.currentTime + SEEK_SECONDS,
            Number.isFinite(video.duration) ? video.duration : video.currentTime,
          );
          video.currentTime = nextTime;
          return;
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          const video = videoRef.current;
          if (!video) {
            return;
          }
          const nextTime = Math.max(video.currentTime - SEEK_SECONDS, 0);
          video.currentTime = nextTime;
          return;
        }
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
        updateActiveIndex((prev) => clampIndex(prev + 1, images.length));
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        updateActiveIndex((prev) => clampIndex(prev - 1, images.length));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    images.length,
    isActiveVideo,
    isOpen,
    isPreloading,
    isSlideshow,
    onClose,
    pauseActiveVideo,
    preloadComplete,
    updateActiveIndex,
  ]);

  useEffect(() => {
    if (!isOpen || !isSlideshow || images.length <= 1 || isPaused || isVideoPlaying || isPreloading || !preloadComplete) {
      return;
    }
    const timer = window.setTimeout(() => {
      updateActiveIndex((prev) =>
        images.length === 0 ? prev : (prev + 1) % images.length,
      );
    }, 5000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [
    activeIndex,
    images.length,
    isOpen,
    isPaused,
    isSlideshow,
    isVideoPlaying,
    isPreloading,
    preloadComplete,
    updateActiveIndex,
  ]);

  useEffect(() => {
    if (!isOpen || !isSlideshow) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgressKey((prev) => prev + 1);
  }, [activeIndex, isOpen, isSlideshow]);

  useEffect(() => {
    if (!isOpen || !isSlideshow) {
      return;
    }
    if (wasPausedRef.current && !isPaused) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProgressKey((prev) => prev + 1);
    }
    wasPausedRef.current = isPaused;
  }, [isOpen, isPaused, isSlideshow]);

  if (!isOpen || images.length === 0 || typeof document === "undefined") {
    return null;
  }

  const canGoBack = isSlideshow
    ? images.length > 1
    : activeIndex > 0;
  const canGoForward = isSlideshow
    ? images.length > 1
    : activeIndex < images.length - 1;
  const activeImage = activeMedia ?? images[activeIndex];
  const effectivePreviousIndex = previousIndex;
  const previousMediaResolved =
    previousMedia ??
    (effectivePreviousIndex !== null
      ? images[effectivePreviousIndex] ?? null
      : null);
  const isTransitioning = transitionPhase !== "idle";
  const isTransitionActive = transitionPhase === "active";
  const shouldCrossfade =
    isSlideshow &&
    !isActiveVideo &&
    previousMediaResolved !== null &&
    isTransitioning;
  const effectiveZoomScale = isActiveVideo ? 1 : zoomScale;

  const handlePrevious = () => {
    if (!canGoBack) {
      return;
    }
    updateActiveIndex((prev) =>
      isSlideshow
        ? (prev - 1 + images.length) % images.length
        : clampIndex(prev - 1, images.length),
    );
  };

  const handleNext = () => {
    if (!canGoForward) {
      return;
    }
    updateActiveIndex((prev) =>
      isSlideshow
        ? (prev + 1) % images.length
        : clampIndex(prev + 1, images.length),
    );
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (isSlideshow && (isPreloading || !preloadComplete)) {
      return;
    }
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

    const touch = event.touches[0];
    if (touch) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      pinchStartRef.current = null;
    }
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (isSlideshow && (isPreloading || !preloadComplete)) {
      return;
    }
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
    if (isSlideshow && (isPreloading || !preloadComplete)) {
      return;
    }
    if (event.touches.length > 0) {
      return;
    }
    pinchStartRef.current = null;
    if (!touchStartRef.current) {
      return;
    }
    const touch = event.changedTouches[0];
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

  const handleDialogKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
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
      aria-label={t("entries.photoViewer")}
      onKeyDown={handleDialogKeyDown}
      onClick={isActiveVideo ? undefined : handleOverlayClick}
      tabIndex={-1}
      style={{ backgroundColor: "#000000" }}
    >
      <style>{`
        @keyframes slideshowProgressFill {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }

        /* Remove dark overlay from video controls completely */
        video[data-fullscreen]::-webkit-media-controls-overlay-enclosure {
          display: none !important;
        }

        video[data-fullscreen]::-webkit-media-controls-enclosure {
          background: transparent !important;
        }

        video[data-fullscreen]::-webkit-media-controls-panel {
          background-image: none !important;
          background: rgba(0, 0, 0, 0.4) !important;
        }

        /* For other WebKit browsers */
        video[data-fullscreen]::-webkit-media-controls {
          filter: none !important;
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
                      animationName: preloadComplete ? "slideshowProgressFill" : "none",
                      animationDuration: preloadComplete
                        ? `${isActiveVideo && videoDuration ? videoDuration : 5}s`
                        : "0s",
                      animationTimingFunction: "linear",
                      animationFillMode: "forwards",
                      animationPlayState: isPaused ? "paused" : "running",
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {isPreloading ? (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6"
          role="status"
          aria-live="polite"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
        >
          <div
            className="flex flex-col items-center gap-6 px-16 py-12"
            style={{
              backgroundColor: '#374151',
              borderRadius: '1rem',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div
              className="animate-spin rounded-full border-4"
              style={{
                width: '64px',
                height: '64px',
                borderColor: '#6B7280',
                borderTopColor: '#FFFFFF'
              }}
            />
            <p
              className="font-medium"
              style={{
                fontSize: '1.5rem',
                color: '#FFFFFF',
                textAlign: 'center',
                minWidth: '300px'
              }}
            >
              {t("entries.slideshowLoading")
                .replace("{{loaded}}", String(preloadProgress.loaded))
                .replace("{{total}}", String(preloadProgress.total))}
            </p>
          </div>
        </div>
      ) : null}

      {isPreloading ? (
        <div
          className="absolute left-[-9999px] top-0 h-px w-px overflow-hidden"
          aria-hidden="true"
        >
          {slideshowImageUrls.map((url, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`preload-${url}-${index}`}
              src={url}
              alt=""
              width={1}
              height={1}
              loading="eager"
              decoding="async"
              data-preload="true"
              onLoad={() => markPreloadProgress(`${index}-${url}`, url)}
              onError={(event) =>
                markPreloadProgress(`${index}-${url}`, url, event.nativeEvent)
              }
              style={{ opacity: 0 }}
            />
          ))}
        </div>
      ) : null}

      <div className="relative z-10 flex flex-1 items-center justify-center">
        {!isActiveVideo && (
          <div
            data-testid="photo-viewer-gesture-layer"
            className="absolute inset-0 flex items-center justify-center"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            data-transitioning={isTransitioning ? "true" : undefined}
            data-previous-index={
              previousIndex !== null ? String(previousIndex) : undefined
            }
            style={{ touchAction: "none" }}
          >
            <div className="absolute inset-0">
              {shouldCrossfade && previousMediaResolved ? (
                <div
                  data-testid="photo-viewer-previous-layer"
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    opacity: isTransitionActive ? 0 : 1,
                    transition: isTransitionActive
                      ? "opacity 1s ease-in-out"
                      : "none",
                    pointerEvents: "none",
                  }}
                >
                  <div className="relative h-full w-full">
                    {shouldShowFailedPlaceholder(previousMediaResolved) ? (
                      <div
                        role="img"
                        aria-label={previousMediaResolved.alt}
                        data-testid="slideshow-placeholder"
                        className="flex h-full w-full items-center justify-center"
                        style={{
                          backgroundColor: "#111827",
                          color: "#9CA3AF",
                        }}
                      />
                    ) : (
                      <Image
                        src={previousMediaResolved.url}
                        alt={previousMediaResolved.alt}
                        fill
                        sizes="100vw"
                        className="object-contain"
                        style={{ objectFit: "contain", objectPosition: "center" }}
                        loading={isTransitioning ? "eager" : "lazy"}
                        priority={isTransitioning ? true : undefined}
                        unoptimized={!isOptimizedImage(previousMediaResolved.url)}
                      />
                    )}
                  </div>
                </div>
              ) : null}
              <div
                data-testid="photo-viewer-current-layer"
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  opacity: shouldCrossfade
                    ? isTransitionActive
                      ? 1
                      : 0
                    : 1,
                  transition:
                    shouldCrossfade && isTransitionActive
                      ? "opacity 1s ease-in-out"
                      : "none",
                }}
              >
                <div
                  className="relative h-full w-full"
                  style={{
                    transform: `scale(${effectiveZoomScale})`,
                    transformOrigin: "center center",
                  }}
                >
                  {shouldShowFailedPlaceholder(activeImage) ? (
                    <div
                      role="img"
                      aria-label={activeImage.alt}
                      data-testid="slideshow-placeholder"
                      className="flex h-full w-full items-center justify-center"
                      style={{
                        backgroundColor: "#111827",
                        color: "#9CA3AF",
                      }}
                    />
                  ) : (
                    <Image
                      src={activeImage.url}
                      alt={activeImage.alt}
                      fill
                      sizes="100vw"
                      className="object-contain"
                      style={{ objectFit: "contain", objectPosition: "center" }}
                      loading={isTransitioning ? "eager" : "lazy"}
                      priority={isTransitioning ? true : undefined}
                      unoptimized={!isOptimizedImage(activeImage.url)}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {isActiveVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <video
              ref={videoRef}
              src={activeImage.url}
              controls
              preload="metadata"
              playsInline
              autoPlay={isSlideshow}
              muted={isSlideshow}
              data-fullscreen="true"
              className="h-full w-full object-contain"
              onClick={(event) => event.stopPropagation()}
              onLoadedMetadata={(e) => {
                const video = e.currentTarget;
                setVideoDuration(video.duration);
                // Force play in slideshow mode after metadata loads
                if (isSlideshow) {
                  video.play().catch((error) => {
                    console.log('Autoplay failed:', error);
                  });
                }
              }}
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
              onEnded={() => {
                setIsVideoPlaying(false);
                setVideoDuration(null);
                if (isSlideshow && images.length > 1) {
                  updateActiveIndex((prev) => (prev + 1) % images.length);
                }
              }}
              aria-label={activeImage.alt}
            />
          </div>
        )}
      </div>

    </div>,
    document.body,
  );
};

export default FullScreenPhotoViewer;
