/**
 * Generate a thumbnail from a video file by extracting the first frame
 */
export const generateVideoThumbnail = (
  videoUrl: string,
  seekTo = 0.5,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    // Only set crossOrigin for external URLs, not for local/same-origin URLs
    if (!videoUrl.startsWith("/")) {
      video.crossOrigin = "anonymous";
    }

    let hasResolved = false;
    const timeout = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        reject(new Error("Video thumbnail generation timed out"));
      }
    }, 10000); // 10 second timeout

    video.addEventListener("loadedmetadata", () => {
      console.log(`[Thumbnail] Metadata loaded for ${videoUrl}`, {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (canvas.width === 0 || canvas.height === 0) {
        clearTimeout(timeout);
        if (!hasResolved) {
          hasResolved = true;
          console.error(`[Thumbnail] Invalid dimensions for ${videoUrl}`);
          reject(new Error("Video has invalid dimensions"));
        }
        return;
      }

      // Seek to specified time (default 0.5 seconds to avoid black frames)
      const targetTime = Math.min(seekTo, video.duration || seekTo);
      console.log(`[Thumbnail] Seeking to ${targetTime}s for ${videoUrl}`);
      video.currentTime = targetTime;
    });

    video.addEventListener("seeked", () => {
      if (hasResolved) return;

      console.log(`[Thumbnail] Seeked event fired for ${videoUrl}`);

      try {
        // Draw the current video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to data URL
        const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);

        console.log(`[Thumbnail] Successfully generated thumbnail for ${videoUrl}`);

        clearTimeout(timeout);
        hasResolved = true;
        resolve(thumbnailUrl);
      } catch (error) {
        console.error(`[Thumbnail] Error drawing/converting for ${videoUrl}:`, error);
        clearTimeout(timeout);
        if (!hasResolved) {
          hasResolved = true;
          reject(error);
        }
      }
    });

    video.addEventListener("error", (e) => {
      clearTimeout(timeout);
      if (!hasResolved) {
        hasResolved = true;
        reject(new Error(`Failed to load video: ${e.type}`));
      }
    });

    video.src = videoUrl;
    video.load();
  });
};
