/**
 * Analyzes image brightness to determine if a scrim overlay is needed for text readability
 * @param imageUrl - URL of the image to analyze
 * @returns Promise that resolves to true if scrim is needed (bright image), false otherwise
 */
export const analyzeImageBrightness = async (
  imageUrl: string,
): Promise<boolean> => {
  return new Promise((resolve) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(true); // Default to needing scrim if canvas unavailable
        return;
      }

      const targetWidth = 32;
      const targetHeight = 32;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      context.drawImage(image, 0, 0, targetWidth, targetHeight);

      const data = context.getImageData(0, 0, targetWidth, targetHeight).data;
      let totalLuminance = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        // Standard relative luminance formula (ITU-R BT.709)
        totalLuminance += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }

      const avgLuminance = totalLuminance / (data.length / 4);
      resolve(avgLuminance > 175);
    };

    image.onerror = () => {
      resolve(true); // Default to needing scrim on error
    };

    image.src = imageUrl;
  });
};
